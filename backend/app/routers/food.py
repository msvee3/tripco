"""Food log router."""

from fastapi import APIRouter, Depends, HTTPException

from app.db.cosmos_client import create_item, query_items, read_item, delete_item, upsert_item
from app.middleware.auth import get_current_user
from app.models.schemas import CreateFoodLogRequest, UpdateFoodLogRequest, FoodLogOut, new_id, utcnow
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


@router.patch("/trips/{trip_id}/food/{food_id}", response_model=FoodLogOut)
def update_food_log(trip_id: str, food_id: str, body: UpdateFoodLogRequest, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    food = read_item("TripItems", food_id, trip_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food log not found")
    if food.get("type") != "food":
        raise HTTPException(status_code=400, detail="Item is not a food log")
    if body.name is not None:
        food["name"] = body.name
    if body.location is not None:
        food["location"] = body.location
    if body.rating is not None:
        food["rating"] = body.rating
    if body.notes is not None:
        food["notes"] = body.notes
    if body.date is not None:
        food["date"] = body.date.isoformat()
    food["updatedAt"] = utcnow()
    food["version"] = food.get("version", 1) + 1
    upsert_item("TripItems", food)
    return _to_out(food)


@router.delete("/trips/{trip_id}/food/{food_id}", status_code=204)
def delete_food_log(trip_id: str, food_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    
    # Verify food log exists
    food = read_item("TripItems", food_id, trip_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food log not found")
    
    if food.get("type") != "food":
        raise HTTPException(status_code=400, detail="Item is not a food log")
    
    delete_item("TripItems", food_id, trip_id)


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
