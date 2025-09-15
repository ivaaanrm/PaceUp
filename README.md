# PaceUp - Garmin Activity Analytics Platform

PaceUp is a comprehensive platform for uploading, processing, and analyzing Garmin .fit files. Track your activities, view detailed metrics, and achieve your fitness goals with powerful analytics and achievement tracking.

## Features

- 📁 **File Upload**: Drag & drop Garmin .fit files for processing
- 📊 **Activity Analytics**: Detailed metrics including pace, heart rate zones, power zones, and splits
- 🏆 **Achievement System**: Weekly, monthly, and yearly achievement tracking
- 📈 **Dashboard**: Beautiful visualizations of your activity data
- 🎯 **Performance Tracking**: Monitor progress over time with trend analysis
- 🔄 **Real-time Processing**: Instant analysis of uploaded activities

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Supabase** - PostgreSQL database with real-time features
- **FitParse** - Garmin .fit file parsing
- **Pandas/NumPy** - Data processing and analysis

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Recharts** - Chart library for data visualization
- **Lucide React** - Beautiful icons

## Prerequisites

Before running PaceUp, you'll need:

1. **Python 3.12+** with uv package manager
2. **Node.js 18+** with npm/pnpm
3. **Supabase Project** - Create one at [supabase.com](https://supabase.com)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd PaceUp
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API and copy:
   - Project URL: `https://your-project-id.supabase.co`
   - Anon public key
   - Service role key (for backend)

3. Run the database schema:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `backend/database_schema.sql`
   - Run the script to create all tables and policies

### 3. Backend Setup

```bash
cd backend

# Install dependencies using uv
uv pip install -e .

# Create environment file
cp env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# SECRET_KEY=your_secret_key_here

# Start the development server
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Start the development server
npm run dev
# or
pnpm dev
```

The frontend will be available at `http://localhost:3000`

## Docker Setup (Alternative)

For easier deployment, you can use Docker Compose:

```bash
# Create environment variables
cp backend/env.example backend/.env
# Edit backend/.env with your Supabase credentials

# Build and run with Docker Compose
docker-compose up --build
```

## Usage

### Uploading Activities

1. Navigate to the "Upload Activity" tab
2. Drag and drop your Garmin .fit files or click to select
3. Files will be automatically processed and analyzed
4. View your activity appear in the dashboard

### Dashboard Features

- **Weekly Metrics**: Distance, activities, time, and pace with week-over-week comparisons
- **Activity Types**: Visual breakdown of different activity types
- **Achievements**: Automatic achievement tracking for distance, frequency, and duration
- **Monthly/Yearly Overview**: Long-term progress tracking
- **Recent Activities**: Quick overview of your latest uploads
- **Trends**: Weekly distance trending chart

### API Endpoints

The backend provides a comprehensive REST API:

- `POST /api/v1/activities/upload` - Upload and process .fit files
- `GET /api/v1/activities/` - List activities with filtering
- `GET /api/v1/activities/{id}` - Get specific activity details
- `GET /api/v1/activities/{id}/metrics` - Get detailed activity metrics
- `GET /api/v1/dashboard/overview` - Get dashboard overview
- `GET /api/v1/dashboard/weekly-summary` - Get weekly trend data
- `GET /api/v1/dashboard/achievements` - Get achievement data

Full API documentation is available at `http://localhost:8000/docs`

## Database Schema

The application uses the following main tables:

- **users** - User profiles and preferences
- **activities** - Core activity data from .fit files
- **activity_metrics** - Detailed analysis (zones, splits, pace)
- **achievements** - User achievement tracking
- **user_preferences** - Individual user settings

All tables include Row Level Security (RLS) policies for data protection.

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `app/api/routes/`
2. **Frontend**: Create components in `src/components/`
3. **Database**: Add migrations to `backend/database_schema.sql`

### Testing .fit Files

You can find sample .fit files from:
- Garmin Connect exports
- Strava data exports
- Sample files from garmin-fit-sdk

## Deployment

### Production Backend

1. Deploy to your preferred platform (Railway, Render, etc.)
2. Set environment variables
3. Ensure Supabase database is accessible

### Production Frontend

1. Deploy to Vercel, Netlify, or similar
2. Set environment variables
3. Update API_URL to your backend domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues:

1. Check the API documentation at `/docs`
2. Verify your Supabase configuration
3. Ensure .fit files are valid Garmin exports
4. Check the console for error messages

## Roadmap

- [ ] User authentication and multi-user support
- [ ] Advanced analytics (training zones, fitness trends)
- [ ] Goal setting and tracking
- [ ] Social features and challenges
- [ ] Mobile app companion
- [ ] Integration with other fitness platforms