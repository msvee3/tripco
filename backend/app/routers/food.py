"""Food log router."""

from fastapi import APIRouter, Depends, HTTPException

from app.db.cosmos_client import create_item, query_items
from app.middleware.auth import get_current_user
from app.models.schemas import CreateFoodLogRequest, FoodLogOut, new_id, utcnow
from app.services.blob import generate_read_sas

router = APIRouter(tags=["food"])


def _ensure_trip_member(trip_id: str, user_id: str):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    if user_id != trip["ownerId"] and user_id not in trip.get("memberIds", []):
        raise HTTPException(status_code=403, detail="Access denied")
    return trip


@router.get("/trips/{trip_id}/food", response_model=list[FoodLogOut])
def list_food_logs(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'food' ORDER BY c.date DESC",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    return [_to_out(d) for d in docs]


@router.post("/trips/{trip_id}/food", response_model=FoodLogOut, status_code=201)
def create_food_log(trip_id: str, body: CreateFoodLogRequest, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    now = utcnow()
    doc = {
        "id": new_id(),
        "tripId": trip_id,
        "userId": user["id"],
        "type": "food",
        "name": body.name,
        "location": body.location,
        "rating": body.rating,
        "photos": body.photos,
        "notes": body.notes,
        "date": body.date.isoformat() if body.date else None,
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
    }
    create_item("TripItems", doc)
    return _to_out(doc)


def _to_out(d: dict) -> FoodLogOut:
    photos_with_sas = []
    for photo in d.get("photos", []):
        try:
            sas_url = generate_read_sas("media", photo, ttl_hours=24)
            photos_with_sas.append(sas_url)
        except Exception:
            # Fallback to raw URL if SAS generation fails
            photos_with_sas.append(photo)
    
    return FoodLogOut(
        id=d["id"],
        tripId=d["tripId"],
        userId=d["userId"],
        name=d["name"],
        location=d.get("location", ""),
        rating=d.get("rating"),
        photos=photos_with_sas,
        notes=d.get("notes", ""),
        date=d.get("date"),
        createdAt=d["createdAt"],
    )
