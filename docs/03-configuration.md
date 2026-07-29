# Configuration Guide

This document details all configuration options and environment variables for Movie Agent.

## Environment Variables

Configuration is managed through environment variables. Create a `.env` file in the `server/` directory with the following variables:

### Database Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `DATABASE_URL` | Database connection string | `postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db` | Yes |

#### Database URL Formats

**PostgreSQL (Recommended for Production)**
```
DATABASE_URL=postgresql+asyncpg://username:password@host:port/database_name
```

**SQLite (Development Only)**
```
DATABASE_URL=sqlite+aiosqlite:///./movie_agent.db
```

### Authentication Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `SECRET_KEY` | JWT signing secret | `changeme` | Yes |
| `ALGORITHM` | JWT algorithm | `HS256` | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `1440` (24 hours) | No |

#### Generating a Secure SECRET_KEY

```python
import secrets
print(secrets.token_urlsafe(32))
```

### AI/LLM Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `GROQ_API_KEY` | Groq API key for LLM inference | Empty | For AI features |
| `GROQ_MODEL` | Groq model identifier | `groq/llama-3.3-70b-versatile` | No |
| `GOOGLE_API_KEY` | Google API key (alternative) | Empty | No |

### External Media API Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `PIXABAY_API_KEY` | Pixabay API key for images/videos | Empty | For asset search |
| `PXL_API_KEY` | Pexels API key (fallback provider) | Empty | No |
| `JAMENDO_CLIENT_ID` | Jamendo API client ID | `56d30c4d` | For music search |

## Getting API Keys

### Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

### Pixabay API Key

1. Visit [Pixabay API](https://pixabay.com/api/docs/)
2. Sign up for an account
3. Request an API key from your account settings

### Pexels API Key

1. Visit [Pexels API](https://www.pexels.com/api/)
2. Sign up and create an API key
3. Note: Pexels has rate limits (200 requests/hour, 20,000 requests/month)

### Google API Key (Optional)

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Enable the Generative AI API

## Frontend Configuration

The frontend uses a single environment variable:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_API_URL` | Backend API base URL | `/api` |

To configure, create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:8000
```

## CORS Configuration

The backend is configured to allow requests from the frontend origin. The default CORS settings in `server/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

To modify allowed origins for production, update this configuration in `main.py`.

## Configuration Validation

The application uses Pydantic Settings for configuration validation. Invalid configurations will raise errors at startup.

```python
# server/app/config.py
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    database_url: str = "postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db"
    secret_key: str = "changeme"
    # ... other settings
```

## Environment-Specific Configurations

### Development

```env
DATABASE_URL=postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True
```

### Production

```env
DATABASE_URL=postgresql+asyncpg://user:strong-password@db-host:5432/movie_agent_db
SECRET_KEY=production-secure-random-secret-key
DEBUG=False
```

## Docker Environment Variables

When using Docker, you can pass environment variables through `docker-compose.yaml`:

```yaml
services:
  server:
    environment:
      - DATABASE_URL=postgresql+asyncpg://root:2007@db:5432/movie_agent_db
      - SECRET_KEY=${SECRET_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
```

## Configuration Best Practices

1. **Never commit `.env` files** - Add `.env` to `.gitignore`
2. **Use strong secrets** - Generate cryptographically secure random strings for `SECRET_KEY`
3. **Rotate keys regularly** - Periodically update API keys and secrets
4. **Use environment-specific configs** - Maintain separate configurations for dev, staging, and production
5. **Validate on startup** - The application validates configuration at startup; review any warnings

## Example Complete Configuration

```env
# Database
DATABASE_URL=postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db

# Authentication
SECRET_KEY=your-32-character-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI/LLM
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=groq/llama-3.3-70b-versatile

# External APIs
PIXABAY_API_KEY=your_pixabay_key
PXL_API_KEY=your_pexels_key
JAMENDO_CLIENT_ID=56d30c4d
```

## Next Steps

- [Architecture Documentation](./04-architecture.md) - System architecture overview
- [API Reference](./08-api-reference.md) - Complete API documentation
- [Deployment Guide](./12-deployment.md) - Production deployment instructions