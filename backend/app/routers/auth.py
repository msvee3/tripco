"""Auth router – register, login, refresh, me."""

from fastapi import APIRouter, HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.core.config import get_settings
from app.db.cosmos_client import create_item, query_items, read_item
from app.models.schemas import (
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
