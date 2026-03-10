"""Sync router – pull/push for offline-first clients."""

from fastapi import APIRouter, Depends, HTTPException

from app.db.cosmos_client import create_item, query_items, read_item, upsert_item
from app.middleware.auth import get_current_user
from app.models.schemas import SyncChange, SyncPullResponse, SyncPushRequest, utcnow

router = APIRouter(prefix="/sync", tags=["sync"])


# ── Pull: get server changes since last sync ──────────

@router.get("/pull", response_model=SyncPullResponse)
def sync_pull(since: str = "1970-01-01T00:00:00Z", user: dict = Depends(get_current_user)):
    """Return all TripItems updated after `since` for trips the user belongs to."""
    # First get trips the user is part of
    trips = query_items(
        "Trips",
        "SELECT c.id FROM c WHERE c.ownerId = @uid OR ARRAY_CONTAINS(c.memberIds, @uid)",
        [{"name": "@uid", "value": user["id"]}],
    )
    trip_ids = [t["id"] for t in trips]
    if not trip_ids:
        return SyncPullResponse(changes=[], serverTime=utcnow(), cursor=None)

    all_changes: list[dict] = []
    for tid in trip_ids:
        items = query_items(
            "TripItems",
            "SELECT * FROM c WHERE c.tripId = @tid AND c.updatedAt > @since ORDER BY c.updatedAt",
            [{"name": "@tid", "value": tid}, {"name": "@since", "value": since}],
            partition_key=tid,
        )
        all_changes.extend(items)

    # Sort globally by updatedAt
    all_changes.sort(key=lambda x: x.get("updatedAt", ""))

    return SyncPullResponse(changes=all_changes, serverTime=utcnow(), cursor=None)


# ── Push: accept client changes ───────────────────────

@router.post("/push")
def sync_push(body: SyncPushRequest, user: dict = Depends(get_current_user)):
    """Accept batched changes from a client, return accepted IDs and conflicts."""
    accepted: list[str] = []
    conflicts: list[dict] = []

    for change in body.changes:
        try:
            _apply_change(change, user)
            if change.docId:
                accepted.append(change.docId)
            elif change.doc and "id" in change.doc:
                accepted.append(change.doc["id"])
        except Exception as exc:
            conflicts.append({
                "docId": change.docId,
                "error": str(exc),
            })

    return {"accepted": accepted, "conflicts": conflicts, "serverTime": utcnow()}


def _apply_change(change: SyncChange, user: dict):
    """Apply a single sync change with last-writer-wins conflict resolution."""
    now = utcnow()

    if change.op == "create" and change.doc:
        doc = change.doc.copy()
        doc.setdefault("createdAt", now)
        doc["updatedAt"] = now
        doc["version"] = 1
        create_item("TripItems", doc)

    elif change.op == "update" and change.docId and change.doc:
        trip_id = change.doc.get("tripId")
        if not trip_id:
            raise ValueError("Missing tripId in update")
        existing = read_item("TripItems", change.docId, trip_id)
        if existing is None:
            raise ValueError("Document not found for update")

        # LWW: accept if client timestamp is newer than server
        if change.clientTs > existing.get("updatedAt", ""):
            for k, v in change.doc.items():
                existing[k] = v
            existing["updatedAt"] = now
            existing["version"] = existing.get("version", 0) + 1
            upsert_item("TripItems", existing)
        else:
            raise ValueError("Server version is newer – conflict")

    elif change.op == "delete" and change.docId:
        trip_id = change.doc.get("tripId") if change.doc else None
        if trip_id:
            from app.db.cosmos_client import delete_item
            delete_item("TripItems", change.docId, trip_id)
