# ShotIQ — Basketball Shot Analyzer

A production-grade full-stack computer vision SaaS platform for analyzing basketball shooting mechanics and tracking training progress over time.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│  Next.js 15 + TypeScript + Tailwind + Recharts             │
│  FFmpeg.wasm (in-browser video trimming)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS REST
┌───────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend                           │
│  JWT Auth · Video Upload · Background CV Analysis          │
│  MediaPipe Pose · OpenCV · SQLAlchemy async               │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
      ┌──────▼──────┐          ┌────────▼───────┐
      │ PostgreSQL  │          │  Local Storage │
      │  (Docker)   │          │  /uploads/     │
      └─────────────┘          └────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query v5 |
| Charts | Recharts |
| Video | HTML5 Video API, FFmpeg.wasm |
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| Computer Vision | MediaPipe Pose, OpenCV |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, Docker Compose |

## Features

- **JWT Authentication** — register, login, protected routes
- **In-browser video trimming** — FFmpeg.wasm trims clips client-side before upload
- **15-second clip enforcement** — validated on both frontend and backend
- **AI pose analysis** — MediaPipe Pose extracts 33 body landmarks per frame
- **7 biomechanical metrics** — release angle, elbow angle, knee bend, shoulder alignment, shot duration, jump height, release consistency
- **Automated coaching feedback** — rule-based recommendations with priority levels
- **Progress dashboard** — score history line chart, mechanics radar chart, session stats
- **Shot history** — searchable/filterable list of all past analyses

## Quick Start

### Prerequisites

- Docker Desktop
- Node.js 22+
- Python 3.12+ (for local dev without Docker)

### With Docker (recommended)

```bash
git clone <repo>
cd basketball-shot-analyzer
docker-compose up --build
```

Open:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy env file
cp .env.example .env

# Start PostgreSQL (Docker only for DB)
docker-compose up db -d

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Environment Variables

### Backend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL async connection URL |
| `SECRET_KEY` | — | JWT signing key (change in production) |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded videos |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |
| `MAX_VIDEO_DURATION` | `15` | Maximum clip duration in seconds |

### Frontend (`.env.local`)

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

## API Reference

```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login, receive JWT tokens

GET    /api/users/me           Get current user profile

POST   /api/videos/upload      Upload trimmed video (triggers analysis)
GET    /api/videos             List user's videos
GET    /api/videos/{id}        Get video details

GET    /api/analyses           List all analyses
GET    /api/analyses/{id}      Get full analysis with metrics + recommendations

GET    /api/dashboard          Aggregated stats, history, metric averages
```

## Computer Vision Pipeline

```
Video File
    │
    ▼
OpenCV Frame Extraction (up to 720px width, 30fps)
    │
    ▼
MediaPipe Pose (33 landmark keypoints per frame)
    │
    ▼
Shooting Arm Detection (dominant wrist peak height)
    │
    ▼
Release Frame Detection (wrist height × arm extension score)
    │
    ▼
Metric Calculation
  ├─ Release Angle     (forearm vector vs horizontal at release)
  ├─ Elbow Angle       (shoulder-elbow-wrist at release)
  ├─ Knee Bend         (hip-knee-ankle minimum in setup phase)
  ├─ Shoulder Alignment (Y-difference between shoulders)
  ├─ Shot Duration     (frames from onset to release / fps)
  ├─ Jump Height       (hip Y displacement, normalized)
  └─ Consistency       (wrist trajectory smoothness)
    │
    ▼
Score Computation (weighted 0–100)
    │
    ▼
Recommendation Generation (priority 1–3)
    │
    ▼
Persisted to PostgreSQL
```

## Database Schema

```
users
  id, email, password_hash, full_name, created_at

videos
  id, user_id, filename, original_filename, file_path
  original_duration, selected_start_time, selected_end_time
  processed_duration, status, created_at

analyses
  id, video_id, score, shooting_arm, frames_analyzed
  processing_time_seconds, error_message, created_at

metrics
  id, analysis_id, metric_name, metric_value
  metric_unit, ideal_min, ideal_max

recommendations
  id, analysis_id, recommendation_text, metric_key, priority
```

## Project Structure

```
basketball-shot-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route handlers
│   │   ├── core/          # Config, security, dependencies
│   │   ├── cv/            # MediaPipe pose analysis
│   │   ├── db/            # SQLAlchemy engine + session
│   │   ├── models/        # ORM models
│   │   ├── schemas/       # Pydantic DTOs
│   │   ├── services/      # Business logic (analysis runner)
│   │   └── main.py
│   ├── alembic/           # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # Shared UI components
│   │   ├── features/      # Feature modules
│   │   │   ├── dashboard/
│   │   │   ├── upload/
│   │   │   ├── analysis/
│   │   │   └── history/
│   │   ├── lib/           # API client, utilities
│   │   ├── store/         # Zustand auth store
│   │   └── types/         # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Metrics & Ideal Ranges

| Metric | Ideal Range | Unit |
|---|---|---|
| Release Angle | 45–55° | degrees |
| Elbow Angle at Release | 85–100° | degrees |
| Knee Bend at Setup | 90–120° | degrees |
| Shoulder Alignment | 0–3 | deviation |
| Shot Duration | 0.4–0.9 | seconds |
| Jump Height Estimate | 0.03–0.12 | normalized |
| Release Consistency | 75–100 | score |

## Roadmap

**Phase 1 (Current MVP)**
- [x] JWT auth
- [x] Video upload + in-browser trimming
- [x] MediaPipe pose analysis
- [x] 7 biomechanical metrics
- [x] Score + recommendations
- [x] Progress dashboard

**Phase 2**
- [ ] Shot make/miss detection (ball tracking)
- [ ] Multi-shot sequence analysis
- [ ] PDF report export
- [ ] AWS S3 video storage

**Phase 3**
- [ ] Mobile-optimized PWA
- [ ] Real-time analysis via WebRTC
- [ ] Team/coach accounts
- [ ] Comparison against NBA player baselines

## Notes for Production

- Replace `SECRET_KEY` with a cryptographically random 32-byte string
- Configure `CORS_ORIGINS` to your actual domain
- Use AWS S3 or similar for video storage (swap `file_path` for S3 key in `Video` model)
- Add rate limiting (e.g., `slowapi`) on upload endpoints
- Run Alembic migrations instead of `create_all` in production
