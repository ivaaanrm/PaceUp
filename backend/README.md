# PaceUp Backend

FastAPI backend for PaceUp - Strava training tracker for La Mitja Half Marathon.

## Features

- 🔐 Strava OAuth integration with automatic token refresh
- 🏃 Activity and lap data synchronization
- 👤 Athlete profile and statistics
- 📊 Training metrics calculation
- 🗄️ PostgreSQL database with SQLAlchemy ORM

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Relational database
- **Pydantic** - Data validation
- **Python 3.13+**

## Local Development

### Prerequisites

- Python 3.13+
- PostgreSQL (or use Docker)
- Strava API credentials

### Setup

1. **Install dependencies**:
   ```bash
   cd backend
   uv sync
   ```

2. **Configure environment**:
   Create a `.env` file in the project root with:
   ```env
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_secret
   STRAVA_REFRESH_TOKEN=your_token
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paceup
   ```

3. **Start PostgreSQL** (if using Docker):
   ```bash
   cd ..
   docker-compose up -d db
   ```

4. **Run the server**:
   ```bash
   uv run uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, access the interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── strava.py      # Strava API endpoints
│   │       └── user.py        # User endpoints
│   ├── core/
│   │   ├── config.py          # Configuration
│   │   └── logging.py         # Logging setup
│   ├── db/
│   │   └── schema.py          # Database models
│   ├── models/
│   │   └── strava.py          # Pydantic models
│   ├── services/
│   │   ├── strava_service.py  # Strava API client
│   │   └── strava_db_service.py # Database operations
│   └── main.py                # Application entry point
├── tests/
├── Dockerfile
├── pyproject.toml
└── uv.lock
```

## Key Endpoints

### Strava Integration

- `GET /api/v1/strava/athlete` - Get athlete profile
- `GET /api/v1/strava/athlete/stats` - Get athlete statistics
- `POST /api/v1/strava/sync/activities` - Sync activities from Strava
- `POST /api/v1/strava/sync/all` - Sync all data (activities + laps)
- `GET /api/v1/strava/activities` - Get activities from database
- `GET /api/v1/strava/activities/{id}` - Get specific activity
- `GET /api/v1/strava/activities/{id}/laps` - Get activity laps
- `GET /api/v1/strava/laps/all` - Get all laps with activity info

## Database Models

### Athletes
Stores Strava athlete profile information.

### Activities
Stores activity data including:
- Distance, time, elevation
- Performance metrics (speed, heart rate, cadence)
- Location data
- Raw JSON from Strava

### Laps
Stores lap-by-lap data for detailed analysis.

## Docker

Build and run with Docker:

```bash
# From project root
docker-compose up --build backend
```

## Testing

```bash
uv run pytest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STRAVA_CLIENT_ID` | Strava API client ID | (required) |
| `STRAVA_CLIENT_SECRET` | Strava API client secret | (required) |
| `STRAVA_REFRESH_TOKEN` | Strava refresh token | (required) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `APP_NAME` | Application name | `PaceUp` |
| `DEBUG` | Debug mode | `True` |

## License

MIT

