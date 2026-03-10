# Travel Companion App

A full-stack travel journal + expense tracker + photo album — all in one.
# Tripco App
## Tech Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Frontend       | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Backend        | Python (FastAPI), REST API                      |
| Database       | Azure Cosmos DB (NoSQL)                         |
| File Storage   | Azure Blob Storage (via SAS direct uploads)     |
| Auth           | NextAuth.js (frontend) + JWT (backend)          |
| Offline        | PWA (service worker) + IndexedDB (Dexie)        |
| Realtime       | Azure Web PubSub (WebSocket)                    |
| Deployment     | Vercel (frontend), Azure App Service (backend)  |

## Quick Start

### Prerequisites


### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your Cosmos DB & Blob credentials
```

### 2. Start infrastructure (Azurite)

```bash
docker compose up -d azurite
```

### 3. Start the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
travel-companion/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, JWT helpers
│   │   ├── db/             # Cosmos DB client
│   │   ├── middleware/      # Auth dependency
│   │   ├── models/         # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── trips.py
│   │   │   ├── memories.py
│   │   │   ├── expenses.py
│   │   │   ├── itinerary.py
│   │   │   ├── food.py
│   │   │   ├── tickets.py
│   │   │   ├── uploads.py
│   │   │   └── sync.py
│   │   ├── services/       # Blob, realtime helpers
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                # Next.js App Router pages
│   │   ├── auth/           # Login, Signup
│   │   ├── dashboard/      # Trip list
│   │   ├── trips/          # Trip CRUD + sub-pages
│   │   ├── profile/        # User profile
│   │   └── api/auth/       # NextAuth route handler
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # API client, auth, types, IndexedDB, SW
│   ├── styles/             # Tailwind globals
│   └── public/             # PWA manifest, service worker, icons
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

| Method | Path                                     | Description             |
| ------ | ---------------------------------------- | ----------------------- |
| POST   | `/auth/register`                         | Create account          |
| POST   | `/auth/login`                            | Login → JWT tokens      |
| POST   | `/auth/refresh`                          | Refresh access token    |
| GET    | `/auth/me`                               | Current user profile    |
| GET    | `/trips`                                 | List user's trips       |
| POST   | `/trips`                                 | Create trip             |
| GET    | `/trips/{tripId}`                        | Trip detail             |
| PUT    | `/trips/{tripId}`                        | Update trip             |
| DELETE | `/trips/{tripId}`                        | Delete trip             |
| POST   | `/trips/{tripId}/members/invite`         | Invite member           |
| PUT    | `/trips/{tripId}/members/{id}/role`      | Update member role      |
| GET    | `/trips/{tripId}/memories`               | List memories           |
| POST   | `/trips/{tripId}/memories`               | Create memory           |
| DELETE | `/trips/{tripId}/memories/{id}`          | Delete memory           |
| GET    | `/trips/{tripId}/expenses`               | List expenses           |
| POST   | `/trips/{tripId}/expenses`               | Create expense          |
| GET    | `/trips/{tripId}/expenses/summary`       | Expense summary         |
| GET    | `/trips/{tripId}/expenses/export`        | Export CSV              |
| GET    | `/trips/{tripId}/itinerary`              | List itinerary          |
| POST   | `/trips/{tripId}/itinerary`              | Create itinerary item   |
| PUT    | `/trips/{tripId}/itinerary/{id}`         | Update itinerary item   |
| GET    | `/trips/{tripId}/food`                   | List food logs          |
| POST   | `/trips/{tripId}/food`                   | Create food log         |
| GET    | `/trips/{tripId}/tickets`                | List tickets            |
| POST   | `/trips/{tripId}/tickets`                | Create ticket           |
| POST   | `/upload/sas`                            | Get SAS for direct upload |
| GET    | `/sync/pull`                             | Pull server changes     |
| POST   | `/sync/push`                             | Push client changes     |

## Offline Mode

The app is a PWA with full offline support:

1. **Service Worker** caches static assets and API responses
2. **IndexedDB** (via Dexie) stores trips, memories, expenses locally
3. **Pending changes** are queued and synced when back online
4. **Conflict resolution** uses last-writer-wins (LWW) by timestamp
5. **Sync status indicator** shows offline/online state

## Performance Optimizations


## License

MIT
