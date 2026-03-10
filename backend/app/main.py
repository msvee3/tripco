"""Travel Companion API – FastAPI application entry point."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, trips, memories, expenses, itinerary, food, tickets, uploads, sync

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(memories.router)
app.include_router(expenses.router)
app.include_router(itinerary.router)
app.include_router(food.router)
app.include_router(tickets.router)
app.include_router(uploads.router)
app.include_router(sync.router)


@app.get("/health")
def health():
    return {"status": "ok"}
