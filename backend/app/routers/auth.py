"""Auth router – register, login, refresh, me."""

import json

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.core.config import get_settings
from app.db.cosmos_client import create_item, query_items, read_item, upsert_item, delete_item
from app.models.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
    new_id,
    utcnow,
)
from app.middleware.auth import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest):
    # Check duplicate email
    existing = query_items(
        "Users",
        "SELECT * FROM c WHERE c.email = @email",
        [{"name": "@email", "value": body.email}],
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = new_id()
    user_doc = {
        "id": user_id,
        "email": body.email,
        "name": body.name,
        "passwordHash": hash_password(body.password),
        "avatar": None,
        "createdAt": utcnow(),
    }
    create_item("Users", user_doc)

    settings = get_settings()
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    users = query_items(
        "Users",
        "SELECT * FROM c WHERE c.email = @email",
        [{"name": "@email", "value": body.email}],
    )
    if not users:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = users[0]
    if not verify_password(body.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    settings = get_settings()
    access = create_access_token(user["id"])
    refresh = create_refresh_token(user["id"])
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_token: str):
    from jose import JWTError

    try:
        payload = decode_refresh_token(refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    user = read_item("Users", user_id, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    settings = get_settings()
    access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        avatar=user.get("avatar"),
        createdAt=user["createdAt"],
    )


@router.post("/change-password", status_code=200)
def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if not verify_password(body.currentPassword, user["passwordHash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user["passwordHash"] = hash_password(body.newPassword)
    upsert_item("Users", user)
    return {"status": "Password changed successfully"}


@router.delete("/account", status_code=204)
def delete_account(user: dict = Depends(get_current_user)):
    """GDPR: Allow user to delete their account and all associated data."""
    user_id = user["id"]

    # Delete trips owned by user
    owned_trips = query_items(
        "Trips",
        "SELECT * FROM c WHERE c.ownerId = @uid",
        [{"name": "@uid", "value": user_id}],
        partition_key=user_id,
    )
    for trip in owned_trips:
        # Delete all trip items (memories, expenses, itinerary, etc.)
        trip_items = query_items(
            "TripItems",
            "SELECT * FROM c WHERE c.tripId = @tid",
            [{"name": "@tid", "value": trip["id"]}],
            partition_key=trip["id"],
        )
        for item in trip_items:
            delete_item("TripItems", item["id"], trip["id"])
        delete_item("Trips", trip["id"], user_id)

    # Delete user document
    delete_item("Users", user_id, user_id)


@router.get("/export", response_class=StreamingResponse)
def export_my_data(user: dict = Depends(get_current_user)):
    """GDPR: Allow user to export all their personal data as JSON (right to data portability)."""
    import io

    user_id = user["id"]

    # Sanitise user profile (remove passwordHash)
    profile = {k: v for k, v in user.items() if k not in ("passwordHash", "_rid", "_self", "_etag", "_attachments", "_ts")}

    # Collect all trips owned or shared
    owned_trips = query_items(
        "Trips",
        "SELECT * FROM c WHERE c.ownerId = @uid",
        [{"name": "@uid", "value": user_id}],
        partition_key=user_id,
    )
    shared_trips = query_items(
        "Trips",
        "SELECT * FROM c WHERE ARRAY_CONTAINS(c.memberIds, @uid)",
        [{"name": "@uid", "value": user_id}],
    )
    seen_ids = {t["id"] for t in owned_trips}
    all_trips = owned_trips + [t for t in shared_trips if t["id"] not in seen_ids]

    trips_data = []
    for trip in all_trips:
        trip_clean = {k: v for k, v in trip.items() if k not in ("_rid", "_self", "_etag", "_attachments", "_ts")}

        items = query_items(
            "TripItems",
            "SELECT * FROM c WHERE c.tripId = @tid",
            [{"name": "@tid", "value": trip["id"]}],
            partition_key=trip["id"],
        )
        items_clean = [
            {k: v for k, v in item.items() if k not in ("_rid", "_self", "_etag", "_attachments", "_ts")}
            for item in items
        ]
        trip_clean["items"] = items_clean
        trips_data.append(trip_clean)

    export = {
        "exportedAt": utcnow(),
        "profile": profile,
        "trips": trips_data,
    }

    buf = io.BytesIO(json.dumps(export, indent=2, default=str).encode("utf-8"))
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=tripco_data_export.json"},
    )
