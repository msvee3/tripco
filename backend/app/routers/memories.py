"""Memories router – CRUD for photos / videos / notes under a trip."""

from fastapi import APIRouter, Depends, HTTPException

from app.db.cosmos_client import create_item, delete_item, query_items, read_item, upsert_item
from app.middleware.auth import get_current_user
from app.models.schemas import CreateMemoryRequest, MemoryOut, new_id, utcnow
from app.services.blob import generate_read_sas

router = APIRouter(tags=["memories"])


def _ensure_trip_member(trip_id: str, user_id: str):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    if user_id != trip["ownerId"] and user_id not in trip.get("memberIds", []):
        raise HTTPException(status_code=403, detail="Access denied")
    return trip


@router.get("/trips/{trip_id}/memories", response_model=list[MemoryOut])
def list_memories(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'memory' ORDER BY c.createdAt DESC",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    return [_doc_to_memory(d) for d in docs]


@router.post("/trips/{trip_id}/memories", response_model=MemoryOut, status_code=201)
def create_memory(trip_id: str, body: CreateMemoryRequest, user: dict = Depends(get_current_user)):
    trip = _ensure_trip_member(trip_id, user["id"])

    mem_id = new_id()
    now = utcnow()
    doc = {
        "id": mem_id,
        "tripId": trip_id,
        "userId": user["id"],
        "type": "memory",
        "memoryType": body.type.value,
        "fileUrl": body.fileUrl,
        "thumbnailUrl": None,
        "caption": body.caption,
        "location": body.location,
        "tags": body.tags,
        "date": body.date.isoformat() if body.date else None,
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
    }
    create_item("TripItems", doc)

    # Update denormalised memory count on trip
    trip["memoryCount"] = trip.get("memoryCount", 0) + 1
    trip["updatedAt"] = now
    upsert_item("Trips", trip)

    return _doc_to_memory(doc)


@router.delete("/trips/{trip_id}/memories/{memory_id}", status_code=204)
def delete_memory(trip_id: str, memory_id: str, user: dict = Depends(get_current_user)):
    trip = _ensure_trip_member(trip_id, user["id"])
    doc = read_item("TripItems", memory_id, trip_id)
    if not doc or doc.get("type") != "memory":
        raise HTTPException(status_code=404, detail="Memory not found")
    if doc["userId"] != user["id"] and trip["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete another user's memory")
    delete_item("TripItems", memory_id, trip_id)

    trip["memoryCount"] = max(trip.get("memoryCount", 1) - 1, 0)
    trip["updatedAt"] = utcnow()
    upsert_item("Trips", trip)


def _doc_to_memory(d: dict) -> MemoryOut:
    file_url = None
    if d.get("fileUrl"):
        # fileUrl is stored as blob_name, generate read SAS for it
        try:
            blob_name = d["fileUrl"]
            file_url = generate_read_sas("media", blob_name, ttl_hours=24)
        except Exception:
            # Fallback to stored URL if SAS generation fails
            file_url = d.get("fileUrl")
    
    thumbnail_url = None
    if d.get("thumbnailUrl"):
        try:
            blob_name = d["thumbnailUrl"]
            thumbnail_url = generate_read_sas("media", blob_name, ttl_hours=24)
        except Exception:
            thumbnail_url = d.get("thumbnailUrl")
    
    return MemoryOut(
        id=d["id"],
        tripId=d["tripId"],
        userId=d["userId"],
        type=d.get("memoryType", "photo"),
        fileUrl=file_url,
        thumbnailUrl=thumbnail_url,
        caption=d.get("caption", ""),
        location=d.get("location", ""),
        tags=d.get("tags", []),
        date=d.get("date"),
        createdAt=d["createdAt"],
    )
