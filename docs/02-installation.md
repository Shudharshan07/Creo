# Installation Guide

This guide provides step-by-step instructions for setting up Movie Agent in your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.11+ (Python 3.13 recommended)
- **Docker** and **Docker Compose** (optional, for containerized deployment)
- **Git** for version control

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/Shudharshan07/Movie_Agent.git
cd Movie_Agent

# Copy environment template
cp .env.example .env

# Configure your environment variables in .env

# Start all services
docker-compose up -d
```

This will start the PostgreSQL database container. You will still need to run the frontend and backend separately as described below.

## Manual Setup

### 1. Backend Setup (FastAPI)

```bash
# Navigate to server directory
cd server

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Configure your environment variables (see Configuration section)
# Edit .env file with your API keys and settings

# Initialize the database and start the server
uvicorn app.main:app --reload --port 8000
```

The backend server will be available at `http://localhost:8000`.

### 2. Frontend Setup (React + Vite)

Open a new terminal window:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend application will be available at `http://localhost:5173`.

## Database Setup

### Using Docker (Recommended)

The `docker-compose.yaml` file includes a PostgreSQL 16 container:

```bash
docker-compose up -d db
```

Default database credentials:
- Username: `root`
- Password: `2007`
- Database: `movie_agent_db`
- Port: `5432`

### Using SQLite (Development Only)

For quick development testing, you can use SQLite by modifying the `DATABASE_URL` in your `.env` file:

```
DATABASE_URL=sqlite+aiosqlite:///./movie_agent.db
```

## Environment Configuration

Create a `.env` file in the server directory with the following variables:

```env
# Database
DATABASE_URL=postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db

# JWT Authentication
SECRET_KEY=your_jwt_secret_key_here

# AI/LLM Configuration
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key

# External Media APIs
PIXABAY_API_KEY=your_pixabay_api_key
PXL_API_KEY=your_pexels_api_key
JAMENDO_CLIENT_ID=56d30c4d
```

See the [Configuration Documentation](./03-configuration.md) for detailed information about each variable.

## Verification

After setup, verify your installation:

1. **Backend Health Check**: Visit `http://localhost:8000/health`
   - Should return: `{"status": "ok"}`

2. **API Documentation**: Visit `http://localhost:8000/docs`
   - Should display the Swagger UI with all API endpoints

3. **Frontend Application**: Visit `http://localhost:5173`
   - Should display the Movie Agent landing page

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Change the port in the command
uvicorn app.main:app --reload --port 8001
```

**Database Connection Failed**
- Ensure Docker container is running: `docker ps`
- Check database credentials in `.env`
- Verify PostgreSQL is accessible on port 5432

**Python Dependencies Installation Failed**
```bash
# Upgrade pip
pip install --upgrade pip

# Install packages one by one to identify issues
pip install fastapi uvicorn sqlalchemy
```

**Node Modules Issues**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- [Configuration Guide](./03-configuration.md) - Detailed environment configuration
- [API Reference](./08-api-reference.md) - Complete API documentation
- [AI Agents](./10-ai-agents.md) - Understanding the AI agent system