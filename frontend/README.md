# PaceUp Frontend

A modern Next.js dashboard for tracking and analyzing your Strava running activities.

## Features

- 📊 **Dashboard** - View your athlete stats (last 4 weeks, year-to-date, all-time)
- 🏃 **Activities List** - Browse all your synced activities
- 📈 **Activity Details** - View detailed metrics including lap-by-lap data
- 🔄 **Sync with Strava** - Sync your activities directly from the dashboard
- 🌙 **Dark Mode** - Built-in dark mode support
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization (ready for future charts)

## Getting Started

### Prerequisites

- Node.js 18+ (or use pnpm with Node 16+)
- Backend API running on `http://localhost:8000`

### Environment Setup

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Installation

Using npm:
```bash
cd frontend
npm install
npm run dev
```

Using pnpm (recommended):
```bash
cd frontend
pnpm install
pnpm dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard (home page)
│   │   ├── activities/        # Activities pages
│   │   │   ├── page.tsx       # Activities list
│   │   │   └── [id]/          # Activity detail
│   │   │       └── page.tsx
│   │   ├── layout.tsx         # Root layout
│   │   └── siteConfig.ts      # Site configuration
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # UI component library
│   │   └── ...
│   └── lib/                   # Utilities and API client
│       ├── api.ts            # API client for backend
│       └── utils.ts          # Utility functions
├── public/                    # Static assets
└── package.json
```

## Key Files

### API Client (`src/lib/api.ts`)

Contains all API calls to the FastAPI backend:
- `stravaAPI.getAthlete()` - Fetch athlete profile
- `stravaAPI.getAthleteStats()` - Get athlete statistics
- `stravaAPI.getActivities()` - List activities
- `stravaAPI.getActivity(id)` - Get activity details
- `stravaAPI.getActivityLaps(id)` - Get activity laps
- `stravaAPI.syncActivities()` - Sync activities from Strava
- `stravaAPI.syncAll()` - Sync all data

### Pages

1. **Dashboard** (`/`) - Shows athlete stats with sync button
2. **Activities List** (`/activities`) - Lists all activities with key metrics
3. **Activity Detail** (`/activities/[id]`) - Shows detailed activity information and laps

## API Integration

The frontend connects to the FastAPI backend. Make sure the backend is running before starting the frontend.

### CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (Next.js dev server)
- `http://localhost:8000` (Backend API)

## Building for Production

```bash
pnpm build
pnpm start
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Customization

### Changing Colors

The app uses Tailwind CSS with custom colors. The primary color is orange (for Strava branding). You can customize colors in `tailwind.config.ts`.

### Adding New Pages

1. Create a new directory in `src/app/`
2. Add a `page.tsx` file
3. Update the navigation in `src/components/ui/navigation/AppSidebar.tsx`

## Troubleshooting

### API Connection Issues

If you see "Failed to load data" errors:
1. Check that the backend is running on `http://localhost:8000`
2. Verify CORS is properly configured
3. Check browser console for specific errors

### Build Errors

If you encounter build errors:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

## Future Enhancements

- 📊 Activity charts and graphs
- 🗺️ Route maps integration
- 📅 Training calendar view
- 🎯 Goal tracking
- 📱 Progressive Web App (PWA) support

## License

MIT
