# Database Schema

This document details the database models, relationships, and schema design for Movie Agent.

## Overview

Movie Agent uses SQLAlchemy ORM with PostgreSQL (or SQLite for development). All models are defined in `server/app/models/` and use async database operations.

## Entity Relationship Diagram

```
+-------------+
|    users    |
+-------------+
      |
      | 1:N
      v
+-------------+
|   projects  |
+-------------+
      |
      +-------+-------+-------+-------+-------+
      |       |       |       |       |       |
      | 1:N   | 1:N   | 1:N   | 1:N   | 1:N   | 1:N
      v       v       v       v       v       v
+--------+ +--------+ +--------+ +--------+ +--------+ +--------+
| scripts| |casting | | assets | |  crew  | |location| | music  |
|        | | _calls | |        | |_postings| |_scouts| |_tracks |
+--------+ +--------+ +--------+ +--------+ +--------+ +--------+
```

## Table Schemas

### users

Stores user accounts for directors, producers, and crew members.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| hashed_password | VARCHAR | NOT NULL | Bcrypt hashed password |
| full_name | VARCHAR(255) | | User full name |
| role | VARCHAR(50) | | User role (director, producer, etc.) |
| created_at | DATETIME | DEFAULT now() | Account creation timestamp |
| updated_at | DATETIME | DEFAULT now() | Last update timestamp |

### projects

Central entity containing all film project data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique project identifier |
| owner_id | UUID | FOREIGN KEY (users.id), NOT NULL | Project owner |
| title | VARCHAR(255) | NOT NULL | Project title |
| genre | VARCHAR(100) | | Film genre |
| logline | TEXT | | One-sentence summary |
| status | VARCHAR(50) | DEFAULT 'development' | development, pre-production, production, post |
| created_at | DATETIME | DEFAULT now() | Project creation timestamp |
| updated_at | DATETIME | DEFAULT now() | Last update timestamp |

### scripts

Screenplay documents with AI-generated content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique script identifier |
| project_id | UUID | FOREIGN KEY (projects.id), NOT NULL | Associated project |
| version | INTEGER | | Script version number |
| content | TEXT | | Full screenplay content |
| scene_breakdown | TEXT | | AI-generated scene analysis |
| characters | TEXT | | Character descriptions |
| ai_notes | TEXT | | AI-generated notes and suggestions |
| created_at | DATETIME | DEFAULT now() | Creation timestamp |
| updated_at | DATETIME | DEFAULT now() | Last update timestamp |

### casting_calls

Per-character casting notices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique casting call identifier |
| project_id | UUID | FOREIGN KEY (projects.id), NOT NULL | Associated project |
| character_name | VARCHAR(255) | NOT NULL | Character name |
| role_description | TEXT | | Detailed role description |
| requirements | TEXT | | Actor requirements |
| audition_format | VARCHAR(50) | | self-tape, in-person, etc. |
| is_paid | BOOLEAN | DEFAULT true | Whether this is a paid role |
| poster_text | TEXT | | Generated casting poster content |
| created_at | DATETIME | DEFAULT now() | Creation timestamp |
| updated_at | DATETIME | DEFAULT now() | Last update timestamp |

### location_scouts

Shooting location scouting reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique location identifier |
| project_id | UUID | FOREIGN KEY (projects.id), NOT NULL | Associated project |
| location_name | VARCHAR(255) | NOT NULL | Location name |
| location_type | VARCHAR(100) | | Architectural, Outdoor, etc. |
| visual_description | TEXT | | Visual description of location |
| scout_report | TEXT | | AI-generated scouting report |
| permit_info | TEXT | | Permit requirements |
| created_at | DATETIME | DEFAULT now() | Creation timestamp |
| updated_at | DATETIME | DEFAULT now() | Last update timestamp |

### music_tracks

Royalty-free music tracks from Jamendo API.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique track identifier |
| project_id | UUID | FOREIGN KEY (projects.id), NOT NULL | Associated project |
| jamendo_id | VARCHAR(100) | | Jamendo API track ID |
| title | VARCHAR(255) | NOT NULL | Track title |
| artist | VARCHAR(255) | | Artist name |
| album | VARCHAR(255) | | Album name |
| preview_url | VARCHAR(500) | | 30-second preview URL |
| deezer_url | VARCHAR(500) | | Deezer link |
| cover_url | VARCHAR(500) | | Album cover image URL |
| duration | INTEGER | | Duration in seconds |
| created_at | DATETIME | DEFAULT now() | Creation timestamp |

### assets

Visual media assets from Pixabay and Pexels.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique asset identifier |
| project_id | UUID | FOREIGN KEY (projects.id), NOT NULL | Associated project |
| asset_type | VARCHAR(50) | | image, video, audio |
| title | VARCHAR(255) | | Asset title |
| source_url | VARCHAR(500) | | Original source URL |
| thumbnail_url | VARCHAR(500) | | Thumbnail image URL |
| source_provider | VARCHAR(50) | | pixabay, pexels |
| provider_id | VARCHAR(100) | | Provider's asset ID |
| created_at | DATETIME | DEFAULT now() | Creation timestamp |

### crew_postings

Department-specific job postings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique posting identifier |
| project_id | UUID | FOREIGN KEY (projects.id), NOT NULL | Associated project |
| role_title | VARCHAR(255) | NOT NULL | Job title |
| department | VARCHAR(100) | | camera, sound, art, post-production, etc. |
| description | TEXT | | Job description |
| requirements | TEXT | | Required qualifications |
| experience_level | VARCHAR(50) | | entry, mid, senior |
| is_paid | BOOLEAN | DEFAULT true | Whether this is a paid position |
| is_remote | BOOLEAN | DEFAULT false | Remote work option |
| day_rate_min | DECIMAL | | Minimum day rate |
| day_rate_max | DECIMAL | | Maximum day rate |
| poster_text | TEXT | | Generated job posting content |
| created_at | DATETIME | DEFAULT now() | Creation timestamp |
| updated_at | DATETIME | DEFAULT now() | Last update timestamp |

## Relationships

### One-to-Many Relationships

1. **User -> Projects**
   - A user can own multiple projects
   - Each project has one owner
   - Cascade delete: When a user is deleted, all their projects are deleted

2. **Project -> Scripts**
   - A project can have multiple script versions
   - Cascade delete on project deletion

3. **Project -> Casting Calls**
   - A project can have multiple casting calls
   - Cascade delete on project deletion

4. **Project -> Location Scouts**
   - A project can have multiple location scouts
   - Cascade delete on project deletion

5. **Project -> Music Tracks**
   - A project can have multiple music tracks
   - Cascade delete on project deletion

6. **Project -> Assets**
   - A project can have multiple visual assets
   - Cascade delete on project deletion

7. **Project -> Crew Postings**
   - A project can have multiple crew postings
   - Cascade delete on project deletion

## Database Initialization

The database is initialized on application startup:

```python
# server/app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

## Usage Examples

### Creating a Project

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project

async def create_project(db: AsyncSession, owner_id: UUID, title: str, genre: str = None):
    project = Project(
        owner_id=owner_id,
        title=title,
        genre=genre
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project
```

### Querying Projects with Relationships

```python
from sqlalchemy import select

async def get_user_projects(db: AsyncSession, user_id: UUID):
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == user_id)
        .order_by(Project.updated_at.desc())
    )
    return result.scalars().all()
```

## Migrations

For production deployments, consider using Alembic for database migrations:

```bash
# Initialize Alembic
alembic init alembic

# Configure alembic.ini with your database URL

# Create a migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

## Performance Considerations

1. **Indexing**: Add indexes on frequently queried columns:
   - `users.email` (already unique indexed)
   - `projects.owner_id`
   - `projects.status`

2. **Connection Pooling**: Configure SQLAlchemy connection pool:
   ```python
   engine = create_async_engine(
       settings.database_url,
       pool_size=20,
       max_overflow=40,
       pool_pre_ping=True
   )
   ```

3. **Async Operations**: All database operations use async/await for optimal performance

## Next Steps

- [Frontend Architecture](./06-frontend-architecture.md) - React application details
- [Backend Architecture](./07-backend-architecture.md) - FastAPI application details
- [API Reference](./08-api-reference.md) - Complete API documentation