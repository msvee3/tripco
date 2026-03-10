"""Itinerary router – day-by-day planner items."""

from fastapi import APIRouter, Depends, HTTPException

from app.db.cosmos_client import create_item, query_items, read_item, upsert_item
from app.middleware.auth import get_current_user
from app.models.schemas import CreateItineraryItemRequest, ItineraryItemOut, new_id, utcnow

router = APIRouter(tags=["itinerary"])


def _ensure_trip_member(trip_id: str, user_id: str):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    if user_id != trip["ownerId"] and user_id not in trip.get("memberIds", []):
        raise HTTPException(status_code=403, detail="Access denied")
    return trip


@router.get("/trips/{trip_id}/itinerary", response_model=list[ItineraryItemOut])
def list_itinerary(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'itinerary' ORDER BY c.day, c.time",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    return [_to_out(d) for d in docs]


@router.post("/trips/{trip_id}/itinerary", response_model=ItineraryItemOut, status_code=201)
def create_itinerary_item(trip_id: str, body: CreateItineraryItemRequest, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    now = utcnow()
    doc = {
        "id": new_id(),
        "tripId": trip_id,
        "type": "itinerary",
        "day": body.day,
        "title": body.title,
        "time": body.time,
        "notes": body.notes,
        "location": body.location,
        "isVisited": False,
        "memoryIds": [],
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
    }
    create_item("TripItems", doc)
    return _to_out(doc)


@router.put("/trips/{trip_id}/itinerary/{item_id}", response_model=ItineraryItemOut)
def update_itinerary_item(
    trip_id: str,
    item_id: str,
    body: CreateItineraryItemRequest,
    user: dict = Depends(get_current_user),
):
    _ensure_trip_member(trip_id, user["id"])
    doc = read_item("TripItems", item_id, trip_id)
    if not doc or doc.get("type") != "itinerary":
        raise HTTPException(status_code=404, detail="Itinerary item not found")

    doc.update({
        "day": body.day,
        "title": body.title,
        "time": body.time,
        "notes": body.notes,
        "location": body.location,
        "updatedAt": utcnow(),
        "version": doc.get("version", 0) + 1,
    })
    upsert_item("TripItems", doc)
    return _to_out(doc)


def _to_out(d: dict) -> ItineraryItemOut:
    return ItineraryItemOut(
        id=d["id"],
        tripId=d["tripId"],
        day=d["day"],
        title=d["title"],
        time=d.get("time"),
        notes=d.get("notes", ""),
        location=d.get("location", ""),
        isVisited=d.get("isVisited", False),
        memoryIds=d.get("memoryIds", []),
        createdAt=d["createdAt"],
    )
