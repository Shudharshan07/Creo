![Project Banner](.github/Creo.png)

# Movie Agent (Creo Studio)

An AI-powered pre-production studio & interactive node canvas designed for film directors to streamline film development workflows. Built with a parallel multi-agent AI architecture, the platform assists with screenplay development, character casting, location scouting, soundtrack composition, media asset sourcing, and crew recruitment.

---

## Overview

**Movie Agent** features an interactive node-based canvas powered by a 6-agent parallel AI workflow:

- **Script Writer** — Screenplay formatting, scene breakdowns, character arcs, and AI-driven script iteration.
- **Casting Director** — Character motivation matrices, audition notices, concept actor matching, and printable casting calls.
- **Location Scout** — Architectural & outdoor shooting locations, lighting/permit considerations, and visual ambiance analysis.
- **Music Director (Jamendo API)** — Royalty-free soundtrack discovery via Jamendo API with built-in 30-second audio stream previews directly on canvas node cards.
- **Asset Scout (Pixabay & Pexels APIs)** — Story-topic anchored visual media sourcing, moodboard references, and B-roll clips.
- **Crew Recruiter** — Department-specific job postings (Cinematography, Sound, VFX, Editing) with day-rate specifications.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.13 / FastAPI |
| **AI Orchestration** | Google ADK & Groq LLM (`llama-3.3-70b-versatile`) |
| **External Media APIs** | Jamendo API (Music), Pixabay API (Images/Videos), Pexels API |
| **Database** | PostgreSQL 16 / SQLite (Dev) |
| **ORM** | SQLAlchemy 2.x (Async) |
| **Authentication** | JWT Authentication |
| **Containerization** | Docker / Docker Compose |

---

## Project Structure

```
.
├── docker-compose.yaml
├── .env.example
├── README.md
├── client/                             # React + Vite Interactive Canvas Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentNodesOverlay.tsx   # Interactive Node Cards & Audio/Media Players
│   │   │   ├── InfiniteDotCanvas.tsx   # Canvas Pan, Touch Pinch & Trackpad Zoom
│   │   │   ├── LandingPage.tsx         # Modern Landing Page & Feature Showcase
│   │   │   ├── AuthGate.tsx            # Auth & Login Modal
│   │   │   └── ProjectsOverlay.tsx     # Project Management Drawer
│   │   ├── lib/
│   │   │   └── api.ts                  # REST API Client & Helper Services
│   │   └── types/                      # TypeScript Definitions (Agent, Project)
└── server/                             # FastAPI Backend Application
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py                     # FastAPI Application Entry Point & Router Registration
        ├── config.py                   # Settings & API Keys (Jamendo, Pixabay, Groq, Google)
        ├── database.py                 # Async SQLAlchemy Database Engine & Session
        ├── models/
        │   ├── user.py                 # User Accounts & Authentication Roles
        │   ├── project.py              # Film Projects & Agent Relationships
        │   ├── script.py               # Screenplay Versions & Scene Breakdowns
        │   ├── casting.py              # Casting Calls & Character Posters
        │   ├── location.py             # Shooting Location Scouting Reports
        │   ├── music.py                # Sourced Music Tracks & Jamendo Previews
        │   ├── asset.py                # Visual Media Assets & Pixabay Metadata
        │   └── crew.py                 # Crew Job Postings & Department Rosters
        ├── services/
        │   ├── music_service.py        # Jamendo Royalty-Free Music API Search Engine
        │   ├── asset_service.py        # Topic-Anchored Pixabay & Pexels Search Engine
        │   ├── location_service.py     # AI Location Scout Agent Service
        │   ├── script_service.py       # AI Screenplay Generator Service
        │   ├── casting_service.py      # AI Casting Director Service
        │   └── crew_service.py         # AI Crew Recruiter Service
        └── routers/
            ├── auth.py                 # User Auth Endpoints (Register, Login, Me)
            ├── projects.py             # Project CRUD & Management
            ├── scripts.py              # Script Endpoints
            ├── casting.py              # Casting Endpoints
            ├── locations.py            # Location Scout Endpoints
            ├── music.py                # Music Track Search Endpoints
            ├── assets.py               # Visual Asset Search Endpoints
            └── crew.py                 # Crew Posting Endpoints
```

---

## Database Schema

- **users** — Accounts for directors, producers, and crew members.
- **projects** — Central entity containing all scripts, casting calls, location reports, music tracks, visual assets, and crew postings.
- **scripts** — Screenplay documents with AI-generated scene breakdowns and scene notes.
- **casting_calls** — Per-character casting notices with role requirements, audition formats, and poster copy.
- **location_scouts** — Real-world shooting locations with visual ambiance and permit specs.
- **music_tracks** — Royalty-free audio tracks sourced from Jamendo API with 30s MP3 preview streams.
- **assets** — Visual media references (image/video) sourced from Pixabay & Pexels, anchored to project topic.
- **crew_postings** — Department-specific job postings with experience levels and day rates.

---

## API & External Service Integrations

- **Jamendo API (v3.0)** — Sources royalty-free film scores and soundtrack tracks with 30s audio preview streams (`audioformat=mp32`).
- **Pixabay API** — Fetches high-resolution stock photography and video clips anchored strictly to the project's story topic (e.g. "Blue Dragon").
- **Pexels API** — Secondary fallback provider for stock media assets.

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- (Optional) Docker and Docker Compose

### Environment Setup

1. Copy the environment template in the server directory:

```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db
SECRET_KEY=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
PIXABAY_API_KEY=your_pixabay_api_key
JAMENDO_CLIENT_ID=56d30c4d
```

### Running Locally

#### 1. Backend Server (FastAPI)
```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend App (React + Vite)
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## API Documentation

Interactive API documentation is available when running the server:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`