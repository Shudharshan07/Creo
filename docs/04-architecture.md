# System Architecture

This document provides a high-level overview of the Movie Agent system architecture.

## Architecture Overview

Movie Agent follows a modern three-tier architecture with a React frontend, FastAPI backend, and PostgreSQL database. The system is designed around a microservices-inspired approach where each AI agent operates as an independent service.

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   React 18       | HTTP|   FastAPI        |Async|   PostgreSQL     |
|   Frontend       |<--->|   Backend        |<--->|   Database       |
|   (Vite + TS)    | JSON|   (Python)       |SQL  |   / SQLite      |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |
        |                        v
        |               +------------------+
        |               |                  |
        |               |   AI Services    |
        |               |   (Google ADK)   |
        |               |   + Groq LLM     |
        |               |                  |
        |               +------------------+
        |                        |
        v                        v
+------------------+     +------------------+
|   External APIs  |     |   External APIs  |
|   Jamendo        |     |   Pixabay/Pexels |
+------------------+     +------------------+
```

## Component Architecture

### Frontend Architecture

The frontend is built with React 18, TypeScript, and Vite. It uses a component-based architecture with the following key layers:

```
client/src/
├── components/          # React UI components
│   ├── AgentNodesOverlay.tsx    # Node cards for AI agent outputs
│   ├── InfiniteDotCanvas.tsx    # Interactive canvas with zoom/pan
│   ├── LandingPage.tsx          # Marketing/landing page
│   ├── AuthGate.tsx             # Authentication modal
│   ├── ProjectsOverlay.tsx      # Project management drawer
│   ├── BottomBar.tsx            # Bottom navigation bar
│   └── ProfileButton.tsx        # User profile menu
├── context/             # React context providers
│   ├── ThemeContext.tsx # Theme/state management
│   └── theme.ts         # Theme configuration
├── lib/                 # Utility libraries
│   └── api.ts           # API client and helpers
└── types/               # TypeScript type definitions
    ├── agent.ts         # Agent node types
    └── project.ts       # Project types
```

#### Key Frontend Components

- **InfiniteDotCanvas**: The main interactive canvas component that supports pan, zoom, and touch gestures using `react-zoom-pan-pinch`
- **AgentNodesOverlay**: Renders AI agent outputs as interactive node cards on the canvas
- **AuthGate**: Handles user authentication with JWT tokens stored in localStorage

### Backend Architecture

The backend follows a layered architecture pattern with clear separation of concerns:

```
server/app/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration management
├── database.py          # Database connection and session
├── auth/                # Authentication module
│   └── jwt.py           # JWT token handling
├── models/              # SQLAlchemy ORM models
│   ├── user.py          # User accounts
│   ├── project.py       # Film projects
│   ├── script.py        # Screenplay documents
│   ├── casting.py       # Casting calls
│   ├── location.py      # Location scouts
│   ├── music.py         # Music tracks
│   ├── asset.py         # Visual assets
│   └── crew.py          # Crew postings
├── schemas/             # Pydantic schemas for validation
│   ├── user.py
│   ├── project.py
│   ├── script.py
│   ├── casting.py
│   ├── location.py
│   ├── music.py
│   ├── asset.py
│   └── crew.py
├── routers/             # API route handlers
│   ├── auth.py          # Authentication endpoints
│   ├── projects.py      # Project CRUD
│   ├── scripts.py       # Script generation
│   ├── casting.py       # Casting operations
│   ├── locations.py     # Location scouting
│   ├── music.py         # Music search
│   ├── assets.py        # Asset search
│   └── crew.py          # Crew postings
└── services/            # Business logic layer
    ├── adk_service.py   # Google ADK agent runner
    ├── script_service.py    # Script generation logic
    ├── casting_service.py   # Casting director logic
    ├── location_service.py  # Location scout logic
    ├── music_service.py     # Jamendo API integration
    ├── asset_service.py     # Pixabay/Pexels integration
    ├── crew_service.py      # Crew recruiter logic
    └── project_service.py   # Project management logic
```

#### Request Flow

1. **Client Request** -> Frontend API client (`lib/api.ts`)
2. **HTTP Request** -> FastAPI router (`routers/*.py`)
3. **Authentication** -> JWT validation (`auth/jwt.py`)
4. **Business Logic** -> Service layer (`services/*.py`)
5. **Data Access** -> SQLAlchemy ORM (`models/*.py`)
6. **Database** -> PostgreSQL/SQLite

### AI Agent Architecture

The AI agents are built using Google ADK (Agent Development Kit) with Groq LLM inference:

```
+------------------+
|   API Request    |
+------------------+
        |
        v
+------------------+     +------------------+
|   Router         |---->|   Service        |
|   (routers/*.py) |     |   (services/*.py)|
+------------------+     +------------------+
                                 |
                                 v
                       +------------------+
                       |   ADK Service    |
                       |   (adk_service)  |
                       +------------------+
                                 |
                                 v
                       +------------------+
                       |   Groq LLM       |
                       |   (Llama 3.3)    |
                       +------------------+
```

Each AI agent:
1. Receives a prompt and project context
2. Creates an ADK Agent with specific instructions
3. Runs the agent through the ADK Runner
4. Returns the generated output

## Data Flow

### Project Creation Flow

```
User -> Create Project -> Auth Check -> Validate Input -> Create DB Record -> Return Project
```

### AI Agent Execution Flow

```
User -> Select Agent -> Provide Prompt -> Validate Project -> 
Run ADK Agent -> Process LLM Response -> Save to Database -> Return Result
```

### Media Search Flow

```
User -> Search Request -> Call External API -> Parse Response -> 
Filter Results -> Save to Database -> Return Assets
```

## Security Architecture

### Authentication

- JWT-based authentication with bcrypt password hashing
- Tokens stored in localStorage on the frontend
- Bearer token authentication for API requests
- Token expiration after 24 hours (configurable)

### Authorization

- Project ownership validation
- Users can only access their own projects
- Cascade delete for related resources

### Data Protection

- Password hashing with bcrypt
- CORS configuration for origin validation
- Input validation with Pydantic schemas
- SQL injection prevention via SQLAlchemy ORM

## Scalability Considerations

### Current Design

- Single FastAPI instance
- Single PostgreSQL database
- Synchronous AI agent execution per request

### Scaling Options

1. **Horizontal Scaling**: Deploy multiple FastAPI instances behind a load balancer
2. **Database Scaling**: Use PostgreSQL connection pooling and read replicas
3. **Async Processing**: Implement task queue (Celery/Redis) for long-running AI operations
4. **Caching**: Add Redis for frequently accessed data and API responses
5. **CDN**: Serve static assets and media through a CDN

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend Framework | React 18 | UI component model |
| Build Tool | Vite | Fast development and building |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend Framework | FastAPI | High-performance API |
| Language | Python 3.13 | Backend logic |
| ORM | SQLAlchemy 2.x | Database abstraction |
| AI Framework | Google ADK | Agent orchestration |
| LLM Provider | Groq | Fast LLM inference |
| Database | PostgreSQL 16 | Primary data store |
| Containerization | Docker | Deployment consistency |

## Next Steps

- [Database Schema](./05-database-schema.md) - Detailed database model documentation
- [Frontend Architecture](./06-frontend-architecture.md) - React application details
- [Backend Architecture](./07-backend-architecture.md) - FastAPI application details
- [AI Agents](./10-ai-agents.md) - AI agent system documentation