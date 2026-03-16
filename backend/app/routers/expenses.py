"""Expenses router – log, list, summary, export."""

import csv
import io
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.db.cosmos_client import create_item, query_items, upsert_item, delete_item, read_item
from app.middleware.auth import get_current_user
from app.models.schemas import (
    CreateExpenseRequest,
    UpdateExpenseRequest,
    ExpenseOut,
    ExpenseSummary,
    SplitEntry,
    new_id,
    utcnow,
)

router = APIRouter(tags=["expenses"])


def _ensure_trip_member(trip_id: str, user_id: str):
    trips = query_items("Trips", "SELECT * FROM c WHERE c.id = @id", [{"name": "@id", "value": trip_id}])
    if not trips:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trips[0]
    if user_id != trip["ownerId"] and user_id not in trip.get("memberIds", []):
        raise HTTPException(status_code=403, detail="Access denied")
    return trip


# ── List expenses ────────────────────────────────────────

@router.get("/trips/{trip_id}/expenses", response_model=list[ExpenseOut])
def list_expenses(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'expense' ORDER BY c.createdAt DESC",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )
    return [_doc_to_expense(d) for d in docs]


# ── Create expense ───────────────────────────────────────

@router.post("/trips/{trip_id}/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(trip_id: str, body: CreateExpenseRequest, user: dict = Depends(get_current_user)):
    trip = _ensure_trip_member(trip_id, user["id"])

    now = utcnow()
    exp_id = new_id()
    doc = {
        "id": exp_id,
        "tripId": trip_id,
        "userId": user["id"],
        "type": "expense",
        "category": body.category.value,
        "amount": body.amount,
        "currency": body.currency.upper(),
        "amountBase": body.amount,  # TODO: convert via exchange rate API
        "baseCurrency": "INR",
        "description": body.description,
        "paidBy": body.paidBy,
        "splitWith": [s.model_dump() for s in body.splitWith],
        "date": body.date.isoformat() if body.date else None,
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
    }
    create_item("TripItems", doc)

    # Denormalized total
    trip["totalExpenses"] = trip.get("totalExpenses", 0.0) + body.amount
    trip["updatedAt"] = now
    upsert_item("Trips", trip)

    return _doc_to_expense(doc)


# ── Update expense ───────────────────────────────────────

@router.patch("/trips/{trip_id}/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(trip_id: str, expense_id: str, body: UpdateExpenseRequest, user: dict = Depends(get_current_user)):
    trip = _ensure_trip_member(trip_id, user["id"])
    expense = read_item("TripItems", expense_id, trip_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.get("type") != "expense":
        raise HTTPException(status_code=400, detail="Item is not an expense")

    old_amount = expense.get("amountBase", expense.get("amount", 0))

    if body.category is not None:
        expense["category"] = body.category.value
    if body.amount is not None:
        expense["amount"] = body.amount
        expense["amountBase"] = body.amount
    if body.currency is not None:
        expense["currency"] = body.currency.upper()
    if body.description is not None:
        expense["description"] = body.description
    if body.date is not None:
        expense["date"] = body.date.isoformat()

    expense["updatedAt"] = utcnow()
    expense["version"] = expense.get("version", 1) + 1
    upsert_item("TripItems", expense)

    # Update trip total if amount changed
    if body.amount is not None:
        new_amount = body.amount
        trip["totalExpenses"] = max(0, trip.get("totalExpenses", 0) - old_amount + new_amount)
        trip["updatedAt"] = utcnow()
        upsert_item("Trips", trip)

    return _doc_to_expense(expense)


# ── Delete expense ───────────────────────────────────────

@router.delete("/trips/{trip_id}/expenses/{expense_id}", status_code=204)
def delete_expense(trip_id: str, expense_id: str, user: dict = Depends(get_current_user)):
    trip = _ensure_trip_member(trip_id, user["id"])
    
    # Get the expense to retrieve its amount
    expense = read_item("TripItems", expense_id, trip_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("type") != "expense":
        raise HTTPException(status_code=400, detail="Item is not an expense")
    
    # Delete the expense
    delete_item("TripItems", expense_id, trip_id)
    
    # Update trip totals
    amount = expense.get("amountBase", expense.get("amount", 0))
    trip["totalExpenses"] = max(0, trip.get("totalExpenses", 0) - amount)
    trip["updatedAt"] = utcnow()
    upsert_item("Trips", trip)


# ── Expense summary ──────────────────────────────────────

@router.get("/trips/{trip_id}/expenses/summary", response_model=ExpenseSummary)
def expense_summary(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'expense'",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )

    total = 0.0
    by_cat: dict[str, float] = defaultdict(float)
    by_person: dict[str, float] = defaultdict(float)
    for d in docs:
        amt = d.get("amountBase", d.get("amount", 0))
        total += amt
        by_cat[d.get("category", "misc")] += amt
        by_person[d.get("paidBy", "unknown")] += amt

    return ExpenseSummary(
        totalBase=round(total, 2),
        baseCurrency="INR",
        byCategory={k: round(v, 2) for k, v in by_cat.items()},
        byPerson={k: round(v, 2) for k, v in by_person.items()},
    )


# ── Export CSV ───────────────────────────────────────────

@router.get("/trips/{trip_id}/expenses/export")
def export_expenses(trip_id: str, user: dict = Depends(get_current_user)):
    _ensure_trip_member(trip_id, user["id"])
    docs = query_items(
        "TripItems",
        "SELECT * FROM c WHERE c.tripId = @tid AND c.type = 'expense' ORDER BY c.date",
        [{"name": "@tid", "value": trip_id}],
        partition_key=trip_id,
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Category", "Description", "Amount", "Currency", "PaidBy"])
    for d in docs:
        writer.writerow([
            d.get("date", ""),
            d.get("category", ""),
            d.get("description", ""),
            d.get("amount", 0),
            d.get("currency", ""),
            d.get("paidBy", ""),
        ])

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{trip_id}.csv"},
    )


def _doc_to_expense(d: dict) -> ExpenseOut:
    return ExpenseOut(
        id=d["id"],
        tripId=d["tripId"],
        userId=d["userId"],
        category=d.get("category", "misc"),
        amount=d.get("amount", 0),
        currency=d.get("currency", "INR"),
        amountBase=d.get("amountBase"),
        baseCurrency=d.get("baseCurrency", "INR"),
        description=d.get("description", ""),
        paidBy=d.get("paidBy", ""),
        splitWith=[SplitEntry(**s) for s in d.get("splitWith", [])],
        date=d.get("date"),
        createdAt=d["createdAt"],
    )
