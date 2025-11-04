# PaceUp - Strava Activity Tracker

PaceUp is a FastAPI application that integrates with the Strava API to retrieve and store your running activities, laps, and athlete statistics in a PostgreSQL database.

## Features

- 🏃 Fetch and store activities from Strava
- 📊 Retrieve lap data for detailed activity analysis
- 👤 Store athlete profile and statistics
- 🗄️ PostgreSQL database for persistent storage
- 🔄 Automatic token refresh for Strava API
- 📦 Docker support for easy deployment

## Prerequisites

- Python 3.13+
- Docker and Docker Compose (optional, for containerized deployment)
- Strava API credentials (Client ID, Client Secret, Refresh Token)

## Getting Started

### 1. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Strava API credentials:

```env
# Strava API Credentials
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_REFRESH_TOKEN=your_refresh_token_here

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paceup

# Application Settings
APP_NAME=PaceUp
DEBUG=True
```

### 2. Install Dependencies

Using `uv` (recommended):

```bash
uv sync
```

Or using pip:

```bash
pip install -e .
```

### 3. Start the Database

Using Docker Compose:

```bash
docker-compose up -d db
```

This will start a PostgreSQL database on port 5432.

### 4. Start the Server

Development mode:

```bash
uv run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### 5. Access the API Documentation

Open your browser and navigate to:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Strava Integration

#### Get Athlete Profile

Fetch and save your Strava athlete profile:

```bash
curl -X GET "http://localhost:8000/api/v1/strava/athlete"
```

#### Get Athlete Statistics

Fetch athlete statistics from Strava:

```bash
curl -X GET "http://localhost:8000/api/v1/strava/athlete/stats"
```

#### Sync All Activities

Sync all activities from Strava to the database:

```bash
curl -X POST "http://localhost:8000/api/v1/strava/sync/activities"
```

With date filters:

```bash
curl -X POST "http://localhost:8000/api/v1/strava/sync/activities?after=2024-01-01T00:00:00&before=2024-12-31T23:59:59"
```

#### Sync Activity Laps

Sync laps for a specific activity:

```bash
curl -X POST "http://localhost:8000/api/v1/strava/sync/activity/12345678/laps"
```

#### Sync Everything

Sync athlete profile, activities, and laps in one request:

```bash
curl -X POST "http://localhost:8000/api/v1/strava/sync/all?include_laps=true"
```

#### Get Activities from Database

Get stored activities:

```bash
curl -X GET "http://localhost:8000/api/v1/strava/activities?limit=50"
```

#### Get Specific Activity

```bash
curl -X GET "http://localhost:8000/api/v1/strava/activities/12345678"
```

#### Get Activity Laps

```bash
curl -X GET "http://localhost:8000/api/v1/strava/activities/12345678/laps"
```

## Database Schema

### Athletes Table

Stores Strava athlete information including username, location, and profile details.

### Activities Table

Stores activity data including:
- Distance, time, elevation
- Performance metrics (speed, heart rate, cadence)
- Location data
- Raw JSON data from Strava

### Laps Table

Stores lap data for activities including:
- Per-lap metrics (distance, time, pace)
- Heart rate and cadence data
- Pace zones

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up --build
```

This will start both the PostgreSQL database and the FastAPI application.

### Access the Application

- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

## Getting Strava API Credentials

1. Create a Strava API application at: https://www.strava.com/settings/api
2. Note your Client ID and Client Secret
3. Get a refresh token by following Strava's OAuth flow
4. Add these credentials to your `.env` file

### Example: Getting a Refresh Token

Use the following curl command to exchange an authorization code for a refresh token:

```bash
curl -X POST https://www.strava.com/api/v3/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=AUTHORIZATION_CODE \
  -d grant_type=authorization_code
```

## Development

### Running Tests

```bash
uv run pytest
```

### Database Migrations

The application automatically creates database tables on startup. For production, consider using Alembic for migrations.

## Project Structure

```
PaceUp/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── strava.py      # Strava API endpoints
│   │       └── user.py        # User endpoints
│   ├── core/
│   │   ├── config.py          # Configuration settings
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
├── .env.example
├── docker-compose.yaml
├── Dockerfile
├── pyproject.toml
└── README.md
```

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.