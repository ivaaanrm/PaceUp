# PaceUp - Strava Activity Tracker

PaceUp is a full-stack application that integrates with the Strava API to retrieve and store your running activities, laps, and athlete statistics. Built with FastAPI (backend) and Next.js (frontend).

## 🎯 Features

### Backend (FastAPI)
- 🔐 **Strava OAuth Integration** - Automatic token refresh
- 🏃 **Activity Sync** - Fetch and store all your Strava activities
- 📊 **Athlete Stats** - Retrieve athlete statistics (recent, YTD, all-time)
- 📈 **Lap Data** - Store and retrieve lap-by-lap metrics
- 🤖 **AI-Powered Analysis** - Training insights using OpenAI
- ⚡️ **Redis Caching** - High-performance caching for API responses
- 🗄️ **PostgreSQL Database** - Persistent storage for all your data
- 📦 **Docker Support** - Complete containerized deployment

### Frontend (Next.js)
- 📊 **Dashboard** - View your athlete stats at a glance
- 🏃 **Activities List** - Browse all your activities with key metrics
- 📈 **Activity Details** - Deep dive into individual activities with lap data
- 🔄 **One-Click Sync** - Sync data directly from the UI
- 🌙 **Dark Mode** - Built-in dark mode support
- 📱 **Responsive Design** - Works on all devices
- ⚡️ **Server-Side Rendering** - Optimized performance with Next.js 15

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- Strava API credentials (Client ID, Client Secret, Refresh Token)
- OpenAI API key (for AI training analysis)

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd PaceUp

# Create .env file from example
cp env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

Required environment variables:
```env
# Strava API Credentials
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_REFRESH_TOKEN=your_refresh_token_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Database Configuration (use 'db' as hostname for Docker)
DATABASE_URL=postgresql://postgres:postgres@db:5432/paceup

# Application Settings
APP_NAME=PaceUp
DEBUG=True
```

### 2. Start All Services

```bash
# Start database, backend, and frontend
docker-compose up --build
```

This will start:
- **PostgreSQL Database** on `localhost:5432`
- **Redis Cache** on `localhost:6379`
- **Backend API** on `http://localhost:8000`
- **Frontend** on `http://localhost:3000`

For detailed Docker instructions, see [Docker Setup Guide](docs/DOCKER_SETUP.md).

### 3. Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API ReDoc**: http://localhost:8000/redoc

## 📋 Getting Strava API Credentials

1. Go to https://www.strava.com/settings/api
2. Create an application
3. Note your **Client ID** and **Client Secret**
4. Get a **Refresh Token** by following Strava's OAuth flow:

```bash
# Exchange authorization code for refresh token
curl -X POST https://www.strava.com/api/v3/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=AUTHORIZATION_CODE \
  -d grant_type=authorization_code
```

## 🏗️ Project Structure

```
PaceUp/
├── backend/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── strava.py  # Strava API endpoints
│   │   │       └── user.py
│   │   ├── core/
│   │   │   ├── config.py      # Configuration
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   └── schema.py      # Database models
│   │   ├── models/
│   │   │   └── strava.py      # Pydantic models
│   │   ├── services/
│   │   │   ├── strava_service.py  # Strava API client
│   │   │   └── strava_db_service.py
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/                   # Frontend (Next.js)
│   ├── src/
│   │   ├── app/              # Pages
│   │   │   ├── page.tsx      # Dashboard
│   │   │   └── activities/   # Activities pages
│   │   ├── components/       # UI components
│   │   └── lib/
│   │       └── api.ts        # API client
│   ├── Dockerfile
│   └── README.md
├── .env
├── docker-compose.yaml
└── README.md
```

## 🛠️ Development

### Backend Development (without Docker)

```bash
# Install dependencies
cd backend
uv sync

# Start PostgreSQL (from project root)
cd ..
docker-compose up -d db

# Run the backend
cd backend
uv run uvicorn app.main:app --reload
```

### Frontend Development (without Docker)

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
pnpm dev
```

## 📚 API Endpoints

### Strava Integration

- `GET /api/v1/strava/athlete` - Get athlete profile
- `GET /api/v1/strava/athlete/stats` - Get athlete statistics
- `POST /api/v1/strava/sync/activities` - Sync activities from Strava
- `POST /api/v1/strava/sync/activity/{id}/laps` - Sync laps for an activity
- `POST /api/v1/strava/sync/all` - Sync everything (profile, activities, laps)
- `GET /api/v1/strava/activities` - Get activities from database
- `GET /api/v1/strava/activities/{id}` - Get specific activity
- `GET /api/v1/strava/activities/{id}/laps` - Get activity laps

### Cache Management

- `GET /api/v1/cache/stats` - Get cache statistics and hit rate
- `GET /api/v1/cache/health` - Check Redis health status
- `POST /api/v1/cache/invalidate` - Invalidate cache by pattern
- `POST /api/v1/cache/flush` - Flush all cache data

### Example Requests

```bash
# Get athlete profile
curl http://localhost:8000/api/v1/strava/athlete

# Sync all activities
curl -X POST http://localhost:8000/api/v1/strava/sync/activities

# Get activities
curl http://localhost:8000/api/v1/strava/activities?limit=10
```

## 🗄️ Database Schema

### Tables

1. **athletes** - Strava athlete profiles
   - id, username, firstname, lastname, city, state, country, etc.

2. **activities** - Running activities
   - id, name, distance, moving_time, elapsed_time
   - Performance metrics (speed, heart rate, cadence)
   - Location data (start/end coordinates)

3. **laps** - Lap-by-lap data
   - id, activity_id, lap_index
   - Distance, time, pace per lap
   - Heart rate and cadence per lap

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build

# Start only specific services
docker-compose up -d db backend
```

## 🧪 Testing

```bash
# Run backend tests
uv run pytest

# Run frontend tests (when added)
cd frontend && pnpm test
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Strava API
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_secret
STRAVA_REFRESH_TOKEN=your_refresh_token

# OpenAI API
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# Database (use 'db' for Docker, 'localhost' for local dev)
DATABASE_URL=postgresql://postgres:postgres@db:5432/paceup

# Redis (use 'redis' for Docker, 'localhost' for local dev)
REDIS_URL=redis://redis:6379/0
REDIS_CACHE_TTL=3600
REDIS_STRAVA_CACHE_TTL=300

# App
APP_NAME=PaceUp
DEBUG=True
```

### Frontend Environment Variables

Set in `docker-compose.yaml` for containerized deployment:
```env
# Internal network URL (for server-side requests)
NEXT_PUBLIC_API_URL=http://backend:80

# External URL (for client-side/browser requests)
NEXT_PUBLIC_BROWSER_API_URL=http://localhost:8000
```

For local development, create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎨 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Relational database
- **Redis** - In-memory caching for performance
- **Pydantic** - Data validation
- **Requests** - HTTP library for Strava API
- **OpenAI API** - AI-powered training insights

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Charts and data visualization

## 📈 Future Enhancements

- [ ] Activity charts and graphs
- [ ] Route maps visualization
- [ ] Training calendar view
- [ ] Goal tracking and progress
- [ ] Segment analysis
- [ ] Export data functionality
- [ ] Social features (compare with friends)
- [ ] Mobile app (React Native)

## 🐛 Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check if PostgreSQL is running
docker-compose ps db

# View database logs
docker-compose logs db
```

**Strava API errors:**
- Verify your credentials in `.env`
- Check if your refresh token is valid
- Ensure your Strava app has the correct permissions

### Frontend Issues

**API connection failed:**
- Ensure backend is running on port 8000
- Check CORS configuration in `app/main.py`
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ for runners**
