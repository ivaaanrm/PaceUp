// Use different URLs for server-side (SSR) and client-side (browser) requests
// Server-side can use internal Docker network, client-side needs public URL
const getApiBaseUrl = () => {
  // Check if we're running on the server side
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL if available
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }
  // Client-side: use browser-accessible URL
  return process.env.NEXT_PUBLIC_BROWSER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

export interface Athlete {
  id: number
  username: string | null
  firstname: string | null
  lastname: string | null
  city: string | null
  state: string | null
  country: string | null
  sex: string | null
  weight: number | null
  profile: string | null
}

export interface Activity {
  id: number
  name: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  sport_type: string
  start_date: string
  average_speed: number | null
  max_speed: number | null
  average_heartrate: number | null
  max_heartrate: number | null
  average_cadence: number | null
}

export interface Lap {
  id: number
  activity_id: number
  lap_index: number
  distance: number
  moving_time: number
  elapsed_time: number
  average_speed: number | null
  max_speed: number | null
  average_heartrate: number | null
  max_heartrate: number | null
}

export interface SyncResponse {
  message: string
  synced_count: number
}

export interface AthleteStats {
  recent_run_totals?: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  all_run_totals?: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  ytd_run_totals?: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
}

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const API_BASE_URL = getApiBaseUrl()
  
  // Get auth token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('paceup_auth_token') : null
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Add existing headers from options
  if (options?.headers) {
    const existingHeaders = options.headers as Record<string, string>
    Object.assign(headers, existingHeaders)
  }
  
  // Add authorization header if token exists (trim whitespace)
  if (token) {
    const trimmedToken = token.trim()
    if (trimmedToken) {
      headers['Authorization'] = `Bearer ${trimmedToken}`
    }
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // Handle 401 Unauthorized - clear invalid token
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paceup_auth_token')
        localStorage.removeItem('paceup_user')
        // Trigger a custom event that AuthContext can listen to
        window.dispatchEvent(new CustomEvent('auth:token-expired'))
      }
    }
    
    // Handle 429 Too Many Requests - show alert notification
    if (response.status === 429) {
      const error = await response.json().catch(() => ({ detail: 'Rate limit exceeded' }))
      const errorMessage = error.detail || 'Strava API rate limit exceeded. Please wait 15 minutes before trying again.'
      
      if (typeof window !== 'undefined') {
        alert(errorMessage)
      }
      
      throw new Error(errorMessage)
    }
    
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || `API request failed: ${response.statusText}`)
  }

  return response.json()
}

export interface LapWithActivity {
  id: number
  activity_id: number
  activity_name: string
  lap_index: number
  distance: number
  moving_time: number
  average_speed: number | null
  average_heartrate: number | null
  average_cadence: number | null
  start_date: string
}

export interface TrainingAnalysis {
  id: number
  athlete_id: number
  summary: string
  training_load_insight: string
  tips: string
  activities_analyzed_count: number
  analysis_period_start: string
  analysis_period_end: string
  created_at: string
}

export interface AnalysisGeneratedResponse {
  message: string
  analysis: TrainingAnalysis
}

export const stravaAPI = {
  // Get athlete profile
  getAthlete: async (): Promise<Athlete> => {
    return fetchAPI('/api/v1/strava/athlete')
  },

  // Get athlete stats
  getAthleteStats: async (): Promise<AthleteStats> => {
    return fetchAPI('/api/v1/strava/athlete/stats')
  },

  // Get activities from database
  getActivities: async (limit: number = 100): Promise<Activity[]> => {
    return fetchAPI(`/api/v1/strava/activities?limit=${limit}`)
  },

  // Get specific activity
  getActivity: async (activityId: number): Promise<Activity> => {
    return fetchAPI(`/api/v1/strava/activities/${activityId}`)
  },

  // Get activity laps
  getActivityLaps: async (activityId: number): Promise<Lap[]> => {
    return fetchAPI(`/api/v1/strava/activities/${activityId}/laps`)
  },

  // Get all laps with activity info
  getAllLaps: async (limit: number = 1000): Promise<LapWithActivity[]> => {
    return fetchAPI(`/api/v1/strava/laps/all?limit=${limit}`)
  },

  // Sync activities from Strava
  syncActivities: async (): Promise<SyncResponse> => {
    return fetchAPI('/api/v1/strava/sync/activities', {
      method: 'POST',
    })
  },

  // Sync activity laps
  syncActivityLaps: async (activityId: number): Promise<SyncResponse> => {
    return fetchAPI(`/api/v1/strava/sync/activity/${activityId}/laps`, {
      method: 'POST',
    })
  },

  // Sync everything
  syncAll: async (includeLaps: boolean = false): Promise<SyncResponse> => {
    return fetchAPI(`/api/v1/strava/sync/all?include_laps=${includeLaps}`, {
      method: 'POST',
    })
  },
}

export const analysisAPI = {
  // Generate a new training analysis
  generateAnalysis: async (days: number = 30): Promise<AnalysisGeneratedResponse> => {
    return fetchAPI('/api/v1/analysis/generate', {
      method: 'POST',
      body: JSON.stringify({ days }),
    })
  },

  // Get the latest analysis
  getLatestAnalysis: async (): Promise<TrainingAnalysis | null> => {
    return fetchAPI('/api/v1/analysis/latest')
  },

  // Get analysis history
  getAnalysisHistory: async (limit: number = 10): Promise<TrainingAnalysis[]> => {
    return fetchAPI(`/api/v1/analysis/history?limit=${limit}`)
  },

  // Get specific analysis
  getAnalysis: async (analysisId: number): Promise<TrainingAnalysis> => {
    return fetchAPI(`/api/v1/analysis/${analysisId}`)
  },
}

export interface TrainingDay {
  day: string
  activity_type: string
  details: string
}

export interface TrainingWeek {
  week: number
  days: TrainingDay[]
}

export interface TrainingPlanData {
  training_plan: TrainingWeek[]
}

export interface TrainingPlan {
  id: number
  request_id: number
  athlete_id: number
  insights: string
  summary: string
  training_plan_json: TrainingPlanData
  created_at: string
}

export interface TrainingRequest {
  id: number
  athlete_id: number
  distance_objective: string
  pace_or_time_objective: string
  personal_record: string | null
  weekly_kms: number | null
  plan_duration_weeks: number
  training_days: string[]
  get_previous_activities_context: boolean
  created_at: string
}

export interface TrainingPlanGeneratedResponse {
  message: string
  request: TrainingRequest
  plan: TrainingPlan
}

export interface TrainingPlanRequest {
  distance_objective: string
  pace_or_time_objective: string
  personal_record_distance?: string
  personal_record_time?: number
  longest_run_4weeks?: number
  weekly_kms?: number
  plan_duration_weeks: number
  training_days: string[]
  get_previous_activities_context?: boolean
}

export const trainingPlanAPI = {
  // Generate a new training plan
  generatePlan: async (request: TrainingPlanRequest): Promise<TrainingPlanGeneratedResponse> => {
    return fetchAPI('/api/v1/training/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  // Get the latest training plan
  getLatestPlan: async (): Promise<TrainingPlan | null> => {
    return fetchAPI('/api/v1/training/latest')
  },

  // Get all training plans
  getAllPlans: async (limit: number = 10): Promise<TrainingPlan[]> => {
    return fetchAPI(`/api/v1/training/plans?limit=${limit}`)
  },

  // Get specific training plan
  getPlan: async (planId: number): Promise<TrainingPlan> => {
    return fetchAPI(`/api/v1/training/plan/${planId}`)
  },

  // Delete a training plan
  deletePlan: async (planId: number): Promise<{ message: string }> => {
    return fetchAPI(`/api/v1/training/plan/${planId}`, {
      method: 'DELETE',
    })
  },

  // Update activity completion status
  updateActivityCompletion: async (
    planId: number,
    weekNumber: number,
    day: string,
    activityIndex: number,
    isCompleted: boolean
  ): Promise<ActivityCompletion> => {
    return fetchAPI(`/api/v1/training/plan/${planId}/activity`, {
      method: 'PUT',
      body: JSON.stringify({
        week_number: weekNumber,
        day,
        activity_index: activityIndex,
        is_completed: isCompleted,
      }),
    })
  },

  // Get plan progress
  getPlanProgress: async (planId: number): Promise<PlanProgress> => {
    return fetchAPI(`/api/v1/training/plan/${planId}/progress`)
  },

  // Get all completions for a plan
  getPlanCompletions: async (planId: number): Promise<ActivityCompletion[]> => {
    return fetchAPI(`/api/v1/training/plan/${planId}/completions`)
  },
}

export interface ActivityCompletion {
  id: number
  plan_id: number
  week_number: number
  day: string
  activity_index: number
  is_completed: boolean
  completed_at: string | null
}

export interface PlanProgress {
  total_activities: number
  completed_activities: number
  progress_percentage: number
}

// Utility functions
export function formatDistance(meters: number): string {
  const km = meters / 1000
  return `${km.toFixed(2)} km`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  return `${minutes}m ${secs}s`
}

export function formatPace(metersPerSecond: number | null): string {
  if (!metersPerSecond) return 'N/A'
  
  const minutesPerKm = 1000 / (metersPerSecond * 60)
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`
}

export function formatSpeed(metersPerSecond: number | null): string {
  if (!metersPerSecond) return 'N/A'
  
  const kmPerHour = metersPerSecond * 3.6
  return `${kmPerHour.toFixed(2)} km/h`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

