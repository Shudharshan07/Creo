![Project Banner](.github/Creo.png)

# Movie Agent

An AI-powered backend platform designed for film directors to streamline pre-production workflows. The system uses multi-agent AI to assist with script development, casting, media asset sourcing, and crew recruitment.

---

## Overview

Movie Agent provides a modular API backend that orchestrates several AI-driven workflows:

- **Script Development** — AI agents assist with plot structuring, character development, scene breakdowns, and script drafting.
- **Casting & Job Postings** — Automated generation and management of casting calls and audition notices.
- **Media Asset Sourcing** — Agents query external APIs to retrieve royalty-free stock audio, video, and visual references.
- **Crew Recruitment** — Post openings and match directors with crew members across departments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.12 |
| Framework | FastAPI |
| Agent Framework | Google ADK |
| LLM | Gemini (google-genai) |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.x (async) |
| Auth | JWT via joserfc / Authlib |
| Server | Uvicorn |
| Containerization | Docker / Docker Compose |

---

## Project Structure

```
.
├── docker-compose.yaml
├── .env.example
├── client/                     # Frontend (React + Vite) — separate concern
└── server/
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py             # FastAPI application entry point
        ├── config.py           # Environment-based settings
        ├── database.py         # Async SQLAlchemy engine and session
        └── models/
            ├── user.py         # User accounts and roles
            ├── project.py      # Film projects
            ├── script.py       # Scripts, scenes, and characters
            ├── casting.py      # Casting calls and audition notices
            ├── asset.py        # Sourced media assets
            └── crew.py         # Crew job postings
```

---

## Database Schema

**users** — Accounts for directors, crew members, and actors. Supports role-based access.

**projects** — The central entity. All scripts, casting calls, assets, and crew postings belong to a project.

**scripts** — Versioned script documents with AI-generated scene breakdowns and character lists.

**casting_calls** — Per-character casting notices with role requirements, audition format, and AI-generated poster text.

**assets** — External media references (video, audio, image, moodboard) sourced from providers like Pexels, Pixabay, and Freesound.

**crew_postings** — Department-specific job postings with experience requirements and AI-generated descriptions.

---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- A Google API key with Gemini access

### Setup

1. Copy the environment file and fill in your values:

```bash
cp .env.example .env
```

2. Set your credentials in `.env`:

```env
DB_USER=movie_agent
DB_PASSWORD=your_db_password
DB_NAME=movie_agent_db
SECRET_KEY=your_secret_key
GOOGLE_API_KEY=your_google_api_key
```

3. Start all services:

```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`.  
PostgreSQL will be available at `localhost:5432`.

### Database

Tables are created automatically on first startup. No manual migration step is required during development.

---

## API

Interactive API documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Health Check

```
GET /health
```

Returns `{ "status": "ok" }` when the server is running.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Full async PostgreSQL connection string | — |
| `DB_USER` | PostgreSQL username | `movie_agent` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | PostgreSQL database name | `movie_agent_db` |
| `SECRET_KEY` | JWT signing secret | — |
| `GOOGLE_API_KEY` | Google Gemini API key | — |

---

## Development Notes

- The server container mounts `./server` as a volume and runs with `--reload`, so code changes apply without a rebuild.
- The `db` service uses a named volume (`postgres_data`) to persist data across restarts.
- The server waits for a healthy database connection before starting, controlled by the `depends_on` health check condition.

---

## Roadmap

- [ ] Authentication endpoints (register, login, token refresh)
- [ ] Project CRUD API
- [ ] Script agent integration
- [ ] Casting agent and poster generation
- [ ] Asset sourcing agent (Pexels, Pixabay, Freesound)
- [ ] Crew matching agent
- [ ] WebSocket support for real-time agent streaming
