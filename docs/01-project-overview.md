# Project Overview

## What is Movie Agent?

Movie Agent (Creo Studio) is an AI-powered pre-production studio and interactive node canvas designed for film directors to streamline film development workflows. The platform leverages a parallel multi-agent AI architecture to assist with various aspects of film pre-production.

## Core Features

### Interactive Node-Based Canvas

The heart of Movie Agent is its interactive canvas that allows directors to visualize and manage all aspects of film pre-production in a single, cohesive interface. The canvas supports:

- Pan, zoom, and touch pinch gestures
- Node-based visualization of AI agent outputs
- Real-time status updates for ongoing operations
- Integrated media players for audio and video previews

### Six-Agent Parallel AI Workflow

Movie Agent employs six specialized AI agents that work in parallel to assist with different aspects of film production:

#### 1. Script Writer
- Screenplay formatting and structure
- Scene breakdowns and analysis
- Character arc development
- AI-driven script iteration and refinement

#### 2. Casting Director
- Character motivation matrices
- Audition notice generation
- Concept actor matching
- Printable casting call posters

#### 3. Location Scout
- Architectural and outdoor shooting location recommendations
- Lighting and permit considerations
- Visual ambiance analysis
- Location scouting reports

#### 4. Music Director (Jamendo API Integration)
- Royalty-free soundtrack discovery
- 30-second audio stream previews
- Direct integration with Jamendo API
- Music track recommendations based on project theme

#### 5. Asset Scout (Pixabay & Pexels APIs)
- Story-topic anchored visual media sourcing
- Moodboard reference images
- B-roll clip discovery
- High-resolution stock photography and video

#### 6. Crew Recruiter
- Department-specific job postings
- Roles for Cinematography, Sound, VFX, and Editing
- Day-rate specifications
- Experience level requirements

## Target Audience

- Film Directors
- Producers
- Production Managers
- Independent Filmmakers
- Pre-production Teams

## Key Benefits

1. **Time Efficiency**: Automate repetitive pre-production tasks
2. **Cost Reduction**: Discover royalty-free assets and music
3. **Creative Enhancement**: AI-powered suggestions and iterations
4. **Centralized Workflow**: All pre-production elements in one platform
5. **Collaboration**: Share projects and outputs with team members

## Technology Highlights

- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Backend**: Python FastAPI with async operations
- **AI Orchestration**: Google ADK with Groq LLM (Llama 3.3 70B)
- **Database**: PostgreSQL with async SQLAlchemy ORM
- **Authentication**: JWT-based secure authentication
- **Containerization**: Docker and Docker Compose support

## Project Status

Movie Agent is currently in active development. The core functionality including user authentication, project management, and all six AI agents are implemented and functional.