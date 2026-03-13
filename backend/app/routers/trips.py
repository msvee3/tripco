"""Trips CRUD router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.cosmos_client import (
    create_item,
    delete_item,
    query_items,
    read_item,
    upsert_item,
)
from app.middleware.auth import get_current_user
from app.services.blob import generate_read_sas
from app.models.schemas import (
    CreateTripRequest,
    InviteRequest,
    TripDetail,
    TripMemberOut,
    TripMemberRole,
    TripStatus,
    TripSummary,
    UpdateMemberRoleRequest,
    UpdateTripRequest,
    new_id,
    utcnow,
)

router = APIRouter(prefix="/trips", tags=["trips"])


def _cover_photo_url(blob_name: str | None) -> str | None:
    """Generate a 48-hour read SAS URL for a cover photo blobName, or return None."""
    if not blob_name:
        return None
    try:
        return generate_read_sas("media", blob_name, ttl_hours=48)
    except Exception:
        return blob_name  # fallback to raw value


def _compute_status(start: date | None, end: date | None) -> TripStatus:
    today = date.today()
    if start and end:
        if today < start:
            return TripStatus.upcoming
        elif today > end:
            return TripStatus.completed
        else:
            return TripStatus.ongoing
    return TripStatus.upcoming


def _trip_to_summary(doc: dict) -> TripSummary:
    return TripSummary(
        id=doc["id"],
        title=doc["title"],
        destination=doc.get("destination", ""),
        coverPhoto=_cover_photo_url(doc.get("coverPhoto")),
        startDate=doc.get("startDate"),
        endDate=doc.get("endDate"),
        status=doc.get("status", "upcoming"),
        ownerId=doc["ownerId"],
        memberCount=len(doc.get("members", [])),
        memoryCount=doc.get("memoryCount", 0),
        totalExpenses=doc.get("totalExpenses", 0.0),
    )


def _trip_to_detail(doc: dict) -> TripDetail:
    return TripDetail(
        id=doc["id"],
        title=doc["title"],
        destination=doc.get("destination", ""),
        coverPhoto=_cover_photo_url(doc.get("coverPhoto")),
        startDate=doc.get("startDate"),
        endDate=doc.get("endDate"),
        status=doc.get("status", "upcoming"),
        ownerId=doc["ownerId"],
        memberCount=len(doc.get("members", [])),
        memoryCount=doc.get("memoryCount", 0),
        totalExpenses=doc.get("totalExpenses", 0.0),
        description=doc.get("description", ""),
        members=[TripMemberOut(**m) for m in doc.get("members", [])],
        createdAt=doc.get("createdAt", ""),
        updatedAt=doc.get("updatedAt", ""),
    )


def _assert_trip_access(trip: dict, user_id: str, min_role: TripMemberRole = TripMemberRole.viewer):
    """Raise 403 if user has insufficient access."""
    if trip["ownerId"] == user_id:
        return
    roles_rank = {"owner": 3, "editor": 2, "viewer": 1}
    for m in trip.get("members", []):
        if m["userId"] == user_id and roles_rank.get(m["role"], 0) >= roles_rank[min_role.value]:
            return
    raise HTTPException(status_code=403, detail="Access denied")


# ── List trips ───────────────────────────────────────────

@router.get("", response_model=list[TripSummary])
def list_trips(user: dict = Depends(get_current_user)):
    # Trips owned by user
    owned = query_items(
        "Trips",
        "SELECT * FROM c WHERE c.ownerId = @uid ORDER BY c.createdAt DESC",
        [{"name": "@uid", "value": user["id"]}],
        partition_key=user["id"],
    )
    # Also trips where user is a member (cross-partition – acceptable for moderate trip counts)
    shared = query_items(
        "Trips",
        "SELECT * FROM c WHERE ARRAY_CONTAINS(c.memberIds, @uid)",
        [{"name": "@uid", "value": user["id"]}],
    )
    seen_ids = {t["id"] for t in owned}
    all_trips = owned + [t for t in shared if t["id"] not in seen_ids]
    return [_trip_to_summary(t) for t in all_trips]


# ── Create trip ──────────────────────────────────────────

@router.post("", response_model=TripDetail, status_code=201)
def create_trip(body: CreateTripRequest, user: dict = Depends(get_current_user)):
    now = utcnow()
    trip_id = new_id()
    start_str = body.startDate.isoformat() if body.startDate else None
    end_str = body.endDate.isoformat() if body.endDate else None
    trip_status = _compute_status(body.startDate, body.endDate)

    owner_member = {
        "userId": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": "owner",
        "avatar": user.get("avatar"),
    }

    doc = {
        "id": trip_id,
        "ownerId": user["id"],
        "title": body.title,
        "destination": body.destination,
        "description": body.description,
        "startDate": start_str,
        "endDate": end_str,
        "coverPhoto": body.coverPhoto,
        "status": trip_status.value,
        "members": [owner_member],
        "memberIds": [user["id"]],
        "memoryCount": 0,
        "totalExpenses": 0.0,
        "createdAt": now,
        "updatedAt": now,
    }
    create_item("Trips", doc)
    return _trip_to_detail(doc)


# ── Get trip detail ──────────────────────────────────────

@router.get("/{trip_id}", response_model=TripDetail)
def get_trip(trip_id: str, user: dict = Depends(get_current_user)):
    # We need the ownerId to do a point read – fall back to query
    trips = query_items(
        "Trips",
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": trip_id}],
    )
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    _assert_trip_access(trip, user["id"])
    return _trip_to_detail(trip)


# ── Update trip ──────────────────────────────────────────

@router.put("/{trip_id}", response_model=TripDetail)
def update_trip(trip_id: str, body: UpdateTripRequest, user: dict = Depends(get_current_user)):
    trips = query_items(
        "Trips",
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": trip_id}],
    )
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    _assert_trip_access(trip, user["id"], TripMemberRole.editor)

    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        if isinstance(v, date):
            trip[k] = v.isoformat()
        elif v is not None:
            trip[k] = v.value if hasattr(v, "value") else v

    if trip.get("startDate") and trip.get("endDate"):
        trip["status"] = _compute_status(
            date.fromisoformat(trip["startDate"]),
            date.fromisoformat(trip["endDate"]),
        ).value

    trip["updatedAt"] = utcnow()
    upsert_item("Trips", trip)
    return _trip_to_detail(trip)


# ── Delete trip ──────────────────────────────────────────

@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trips = query_items(
        "Trips",
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": trip_id}],
    )
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    if trip["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete a trip")
    delete_item("Trips", trip_id, trip["ownerId"])


# ── Invite member ────────────────────────────────────────

@router.post("/{trip_id}/members/invite", status_code=201)
def invite_member(trip_id: str, body: InviteRequest, user: dict = Depends(get_current_user)):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    _assert_trip_access(trip, user["id"], TripMemberRole.owner)

    # Find invitee
    invitees = query_items("Users", "SELECT * FROM c WHERE c.email = @e", [{"name": "@e", "value": body.email}])
    if not invitees:
        raise HTTPException(status_code=404, detail="User not found")
    invitee = invitees[0]

    # Avoid duplicates
    if invitee["id"] in trip.get("memberIds", []):
        raise HTTPException(status_code=409, detail="User already a member")

    trip.setdefault("members", []).append({
        "userId": invitee["id"],
        "name": invitee["name"],
        "email": invitee["email"],
        "role": body.role.value,
        "avatar": invitee.get("avatar"),
    })
    trip.setdefault("memberIds", []).append(invitee["id"])
    trip["updatedAt"] = utcnow()
    upsert_item("Trips", trip)
    return {"status": "invited", "userId": invitee["id"]}


# ── Update member role ───────────────────────────────────

@router.put("/{trip_id}/members/{member_id}/role")
def update_member_role(
    trip_id: str,
    member_id: str,
    body: UpdateMemberRoleRequest,
    user: dict = Depends(get_current_user),
):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    _assert_trip_access(trip, user["id"], TripMemberRole.owner)

    for m in trip.get("members", []):
        if m["userId"] == member_id:
            m["role"] = body.role.value
            break
    else:
        raise HTTPException(status_code=404, detail="Member not found")

    trip["updatedAt"] = utcnow()
    upsert_item("Trips", trip)
    return {"status": "updated"}


# ── List members ─────────────────────────────────────────

@router.get("/{trip_id}/members", response_model=list[TripMemberOut])
def list_members(trip_id: str, user: dict = Depends(get_current_user)):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    _assert_trip_access(trip, user["id"])
    return [TripMemberOut(**m) for m in trip.get("members", [])]
