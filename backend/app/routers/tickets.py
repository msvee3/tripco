"""Tickets router – flights, hotels, events."""

from fastapi import APIRouter, Depends, HTTPException

from app.db.cosmos_client import create_item, query_items, upsert_item, delete_item
from app.middleware.auth import get_current_user
from app.models.schemas import CreateTicketRequest, TicketOut, new_id, utcnow
from app.services.blob import generate_read_sas
from app.core.config import get_settings

router = APIRouter(tags=["tickets"])


def _ensure_trip_member(trip_id: str, user_id: str):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    if user_id != trip["ownerId"] and user_id not in trip.get("memberIds", []):
        raise HTTPException(status_code=403, detail="Access denied")
    return trip


@router.get("/trips/{trip_id}/tickets", response_model=list[TicketOut])
def list_tickets(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'ticket' ORDER BY c.date",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    return [_to_out(d) for d in docs]


@router.post("/trips/{trip_id}/tickets", response_model=TicketOut, status_code=201)
def create_ticket(trip_id: str, body: CreateTicketRequest, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    now = utcnow()
    doc = {
        "id": new_id(),
        "tripId": trip_id,
        "userId": user["id"],
        "type": "ticket",
        "ticketType": body.type.value,
        "title": body.title,
        "fileUrl": body.fileUrl,
        "date": body.date.isoformat() if body.date else None,
        "notes": body.notes,
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
    }
    create_item("TripItems", doc)
    return _to_out(doc)


@router.put("/trips/{trip_id}/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(trip_id: str, ticket_id: str, body: CreateTicketRequest, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    
    # Get existing ticket
    tickets = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.id = @id AND c.tripId = @tid",
        [{"name": "@id", "value": ticket_id}, {"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    if not tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket = tickets[0]
    # Update the ticket
    ticket["ticketType"] = body.type.value
    ticket["title"] = body.title
    ticket["fileUrl"] = body.fileUrl
    ticket["date"] = body.date.isoformat() if body.date else None
    ticket["notes"] = body.notes
    ticket["updatedAt"] = utcnow()
    ticket["version"] = ticket.get("version", 1) + 1
    
    upsert_item("TripItems", ticket)
    return _to_out(ticket)


@router.delete("/trips/{trip_id}/tickets/{ticket_id}", status_code=204)
def delete_ticket(trip_id: str, ticket_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    
    # Get existing ticket
    tickets = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.id = @id AND c.tripId = @tid",
        [{"name": "@id", "value": ticket_id}, {"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    if not tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    delete_item("TripItems", ticket_id, trip_id)


def _to_out(d: dict) -> TicketOut:
    file_url = None
    if d.get("fileUrl"):
        # fileUrl is stored as blob_name, generate read SAS for it
        try:
            s = get_settings()
            blob_name = d["fileUrl"]
            # Determine container from blob path or default to media
            container = "tickets" if "ticket" in blob_name.lower() else "media"
            file_url = generate_read_sas(container, blob_name, ttl_hours=24)
        except Exception:
            # Fallback to stored URL if SAS generation fails
            file_url = d.get("fileUrl")
    
    return TicketOut(
        id=d["id"],
        tripId=d["tripId"],
        userId=d["userId"],
        type=d.get("ticketType", "event"),
        title=d["title"],
        fileUrl=file_url,
        date=d.get("date"),
        notes=d.get("notes", ""),
        createdAt=d["createdAt"],
    )
