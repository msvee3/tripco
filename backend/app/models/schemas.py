"""Pydantic v2 schemas for request / response validation."""

import datetime as _dt
import uuid
from enum import Enum
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ── Helpers ──────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> str:
    return _dt.datetime.utcnow().isoformat() + "Z"


# ── Auth ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar: str | None = None
    createdAt: str


# ── Trip ─────────────────────────────────────────────────

class TripStatus(str, Enum):
    upcoming = "upcoming"
    ongoing = "ongoing"
    completed = "completed"


class TripMemberRole(str, Enum):
    owner = "owner"
    editor = "editor"
    viewer = "viewer"


class TripMemberOut(BaseModel):
    userId: str
    name: str
    email: str
    role: TripMemberRole
    avatar: str | None = None


class CreateTripRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    destination: str = Field(default="", max_length=300)
    description: str = Field(default="", max_length=2000)
    startDate: _dt.date | None = None
    endDate: _dt.date | None = None
    coverPhoto: str | None = None


class UpdateTripRequest(BaseModel):
    title: str | None = None
    destination: str | None = None
    description: str | None = None
    startDate: _dt.date | None = None
    endDate: _dt.date | None = None
    coverPhoto: str | None = None
    status: TripStatus | None = None


class TripSummary(BaseModel):
    id: str
    title: str
    destination: str
    coverPhoto: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    status: TripStatus
    ownerId: str
    memberCount: int = 0
    memoryCount: int = 0
    totalExpenses: float = 0.0


class TripDetail(TripSummary):
    description: str = ""
    members: list[TripMemberOut] = []
    createdAt: str = ""
    updatedAt: str = ""


# ── Memory ───────────────────────────────────────────────

class MemoryType(str, Enum):
    photo = "photo"
    video = "video"
    note = "note"


class CreateMemoryRequest(BaseModel):
    type: MemoryType = MemoryType.photo
    fileUrl: str | None = None
    caption: str = ""
    location: str = ""
    tags: list[str] = []
    date: _dt.date | None = None


class MemoryOut(BaseModel):
    id: str
    tripId: str
    userId: str
    type: MemoryType
    fileUrl: str | None = None
    thumbnailUrl: str | None = None
    caption: str = ""
    location: str = ""
    tags: list[str] = []
    date: str | None = None
    createdAt: str


# ── Expense ──────────────────────────────────────────────

class ExpenseCategory(str, Enum):
    food = "food"
    transport = "transport"
    accommodation = "accommodation"
    sightseeing = "sightseeing"
    shopping = "shopping"
    misc = "misc"


class SplitEntry(BaseModel):
    userId: str
    share: float


class CreateExpenseRequest(BaseModel):
    category: ExpenseCategory
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=3)
    description: str = ""
    paidBy: str  # userId
    splitWith: list[SplitEntry] = []
    date: _dt.date | None = None


class ExpenseOut(BaseModel):
    id: str
    tripId: str
    userId: str
    category: ExpenseCategory
    amount: float
    currency: str
    amountBase: float | None = None
    baseCurrency: str = "USD"
    description: str = ""
    paidBy: str
    splitWith: list[SplitEntry] = []
    date: str | None = None
    createdAt: str


class ExpenseSummary(BaseModel):
    totalBase: float
    baseCurrency: str
    byCategory: dict[str, float]
    byPerson: dict[str, float]


# ── Itinerary ────────────────────────────────────────────

class CreateItineraryItemRequest(BaseModel):
    day: int = Field(ge=1)
    title: str
    time: str | None = None
    notes: str = ""
    location: str = ""


class ItineraryItemOut(BaseModel):
    id: str
    tripId: str
    day: int
    title: str
    time: str | None = None
    notes: str = ""
    location: str = ""
    isVisited: bool = False
    memoryIds: list[str] = []
    createdAt: str


# ── Food Log ─────────────────────────────────────────────

class CreateFoodLogRequest(BaseModel):
    name: str
    location: str = ""
    rating: float | None = Field(default=None, ge=0, le=5)
    photos: list[str] = []
    notes: str = ""
    date: _dt.date | None = None


class FoodLogOut(BaseModel):
    id: str
    tripId: str
    userId: str
    name: str
    location: str
    rating: float | None = None
    photos: list[str] = []
    notes: str = ""
    date: str | None = None
    createdAt: str


# ── Ticket ───────────────────────────────────────────────

class TicketType(str, Enum):
    flight = "flight"
    hotel = "hotel"
    event = "event"


class CreateTicketRequest(BaseModel):
    type: TicketType
    title: str
    fileUrl: str | None = None
    date: _dt.date | None = None
    notes: str = ""


class TicketOut(BaseModel):
    id: str
    tripId: str
    userId: str
    type: TicketType
    title: str
    fileUrl: str | None = None
    date: str | None = None
    notes: str = ""
    createdAt: str


# ── Invite / Members ────────────────────────────────────

class InviteRequest(BaseModel):
    email: EmailStr
    role: TripMemberRole = TripMemberRole.viewer


class UpdateMemberRoleRequest(BaseModel):
    role: TripMemberRole


# ── Sync ─────────────────────────────────────────────────

class SyncChange(BaseModel):
    op: str  # create | update | delete
    collection: str
    docId: str | None = None
    doc: dict[str, Any] | None = None
    clientTs: str


class SyncPushRequest(BaseModel):
    clientId: str
    changes: list[SyncChange]


class SyncPullResponse(BaseModel):
    changes: list[dict[str, Any]]
    serverTime: str
    cursor: str | None = None


# ── Upload ───────────────────────────────────────────────

class SASRequest(BaseModel):
    filename: str
    contentType: str = "image/jpeg"
    container: str = "media"  # media | tickets


class SASResponse(BaseModel):
    uploadUrl: str
    blobName: str
    expiresAt: str


class ReadSASRequest(BaseModel):
    container: str
    blobName: str


class ReadSASResponse(BaseModel):
    readUrl: str
