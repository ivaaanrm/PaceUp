"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { stravaAPI, trainingPlanAPI, type Athlete, type Activity, type LapWithActivity } from "@/lib/api"
import { Button } from "@/components/Button"
import { Input } from "@/components/Input"
import { RiRefreshLine, RiRunLine, RiCalendarLine, RiArrowUpLine, RiArrowDownLine, RiEditLine, RiCheckLine, RiCloseLine, RiArrowRightLine } from "@remixicon/react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/Accordion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useAuth } from "@/contexts/AuthContext"

// Race configuration
const RACE_DATE = new Date('2026-01-18')
const RACE_NAME = "La Mitja Half Marathon"
const TRAINING_START_DATE = new Date('2025-09-01')

const OBJECTIVE_TIME_KEY = 'race_objective_time'

function RaceCountdown() {
  const [countdown, setCountdown] = useState({ days: 0, weeks: 0 })
  const [objectiveTime, setObjectiveTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(OBJECTIVE_TIME_KEY) || ''
    }
    return ''
  })
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editTimeValue, setEditTimeValue] = useState('')

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date()
      const diff = RACE_DATE.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      const weeks = Math.floor(days / 7)
      setCountdown({ days, weeks })
    }

    calculateCountdown()
    const interval = setInterval(calculateCountdown, 1000 * 60 * 60) // Update every hour

    return () => clearInterval(interval)
  }, [])

  const handleStartEdit = () => {
    setEditTimeValue(objectiveTime)
    setIsEditingTime(true)
  }

  const handleSaveTime = () => {
    setObjectiveTime(editTimeValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem(OBJECTIVE_TIME_KEY, editTimeValue)
    }
    setIsEditingTime(false)
  }

  const handleCancelEdit = () => {
    setEditTimeValue('')
    setIsEditingTime(false)
  }

  // Format time input (HH:MM:SS or MM:SS)
  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return null
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      return timeStr // MM:SS
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts
      return `${hours}:${minutes}:${seconds}`
    }
    return timeStr
  }

  return (
    <div className="rounded-lg border border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 p-4 dark:from-orange-950/30 dark:to-orange-900/20 dark:border-orange-600">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 rounded-full bg-orange-500 p-2">
            <RiCalendarLine className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 truncate">
              {RACE_NAME}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {RACE_DATE.toLocaleDateString('en-US', { 
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {countdown.days}
            </p>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              days
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {countdown.weeks}
            </p>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              weeks
            </p>
          </div>
          <div className="flex items-center gap-2 border-t border-orange-300 dark:border-orange-600 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            {isEditingTime ? (
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <Input
                  type="text"
                  value={editTimeValue}
                  onChange={(e) => setEditTimeValue(e.target.value)}
                  placeholder="HH:MM:SS or MM:SS"
                  className="w-full sm:w-32"
                  inputClassName="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTime()
                    } else if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveTime}
                  className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex-shrink-0"
                  title="Save"
                >
                  <RiCheckLine className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                  title="Cancel"
                >
                  <RiCloseLine className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="text-left sm:text-right flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Objective Time
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                    {objectiveTime ? formatTimeDisplay(objectiveTime) : 'Not set'}
                  </p>
                </div>
                <button
                  onClick={handleStartEdit}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                  title="Edit objective time"
                >
                  <RiEditLine className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface NextActivity {
  week: number
  day: string
  activityType: string
  details: string
}

function NextTrainingActivity() {
  const router = useRouter()
  const [nextActivity, setNextActivity] = useState<NextActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNextActivity()
  }, [])

  const loadNextActivity = async () => {
    try {
      setLoading(true)
      const plan = await trainingPlanAPI.getLatestPlan()
      
      if (!plan) {
        setNextActivity(null)
        return
      }

      // Get completions to find the next incomplete activity
      const completions = await trainingPlanAPI.getPlanCompletions(plan.id)
      
      // Find the first incomplete activity
      const planData = plan.training_plan_json.training_plan
      for (const week of planData) {
        for (let dayIdx = 0; dayIdx < week.days.length; dayIdx++) {
          const day = week.days[dayIdx]
          const isCompleted = completions.some(
            c => c.week_number === week.week && 
                 c.day === day.day && 
                 c.activity_index === dayIdx && 
                 c.is_completed
          )
          
          if (!isCompleted) {
            setNextActivity({
              week: week.week,
              day: day.day,
              activityType: day.activity_type,
              details: day.details,
            })
            return
          }
        }
      }
      
      // All activities are completed
      setNextActivity(null)
    } catch (err) {
      console.error('Error loading next training activity:', err)
      setNextActivity(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClick = () => {
    router.push('/training')
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-600">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 rounded-full bg-blue-500 p-2">
            <RiRunLine className="h-4 w-4 text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!nextActivity) {
    return (
      <div className="rounded-lg border border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-600">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 rounded-full bg-blue-500 p-2">
            <RiRunLine className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Next Training Activity
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No upcoming activities
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="rounded-lg border border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-600 cursor-pointer hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-950/50 dark:hover:to-blue-900/40 transition-colors"
      onClick={handleClick}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 rounded-full bg-blue-500 p-2">
            <RiRunLine className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 truncate">
              Next Training Activity
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              Week {nextActivity.week} • {nextActivity.day}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0 sm:flex-initial">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {nextActivity.activityType}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 line-clamp-2">
              {nextActivity.details}
            </p>
          </div>
          <div className="flex items-center gap-2 border-t border-blue-300 dark:border-blue-600 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
            >
              View Plan
              <RiArrowRightLine className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [laps, setLaps] = useState<LapWithActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [athleteData, activitiesData, lapsData] = await Promise.all([
        stravaAPI.getAthlete(),
        stravaAPI.getActivities(200).catch(() => []),
        stravaAPI.getAllLaps(1000).catch(() => []),
      ])
      setAthlete(athleteData)
      
      // Filter activities from training start date
      const filteredActivities = activitiesData.filter(activity => 
        new Date(activity.start_date) >= TRAINING_START_DATE
      )
      setActivities(filteredActivities)
      
      // Filter laps from training start date
      const filteredLaps = lapsData.filter(lap =>
        new Date(lap.start_date) >= TRAINING_START_DATE
      )
      setLaps(filteredLaps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats for different time periods
  const periodStats = useMemo(() => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000)
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)

    const calculateStats = (activitiesInPeriod: Activity[]) => {
      const validPaces = activitiesInPeriod
        .filter(a => a.average_speed && a.average_speed > 0)
        .map(a => 1000 / (a.average_speed! * 60)) // pace in min/km
      
      const avgPace = validPaces.length > 0
        ? validPaces.reduce((sum, p) => sum + p, 0) / validPaces.length
        : null

      return {
        count: activitiesInPeriod.length,
        distance: activitiesInPeriod.reduce((sum, a) => sum + a.distance, 0),
        time: activitiesInPeriod.reduce((sum, a) => sum + a.moving_time, 0),
        elevation: activitiesInPeriod.reduce((sum, a) => sum + a.total_elevation_gain, 0),
        avgPace,
      }
    }

    return {
      lastWeek: calculateStats(
        activities.filter(a => new Date(a.start_date) >= oneWeekAgo)
      ),
      last4Weeks: calculateStats(
        activities.filter(a => new Date(a.start_date) >= fourWeeksAgo)
      ),
      previous4Weeks: calculateStats(
        activities.filter(a => {
          const date = new Date(a.start_date)
          return date >= eightWeeksAgo && date < fourWeeksAgo
        })
      ),
      sinceStart: calculateStats(activities),
    }
  }, [activities])

  // Calculate 4-week comparison data for 1km laps
  const fourWeekComparison = useMemo(() => {
    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000)
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
    const TARGET_DISTANCE = 1000 // 1km in meters
    const TOLERANCE = 50 // ±50 meters tolerance

    // Filter 1km laps from last 4 weeks
    const last4Weeks1KmLaps = laps.filter(lap => {
      const date = new Date(lap.start_date)
      return date >= fourWeeksAgo &&
             Math.abs(lap.distance - TARGET_DISTANCE) <= TOLERANCE &&
             lap.average_speed && lap.average_speed > 0
    })

    // Filter 1km laps from previous 4 weeks
    const previous4Weeks1KmLaps = laps.filter(lap => {
      const date = new Date(lap.start_date)
      return date >= eightWeeksAgo && date < fourWeeksAgo &&
             Math.abs(lap.distance - TARGET_DISTANCE) <= TOLERANCE &&
             lap.average_speed && lap.average_speed > 0
    })

    // Calculate metrics for a set of laps
    const calculateMetrics = (lapList: LapWithActivity[]) => {
      if (lapList.length === 0) {
        return {
          count: 0,
          avgPace: null,
          avgHeartRate: null,
          avgCadence: null,
        }
      }

      // Calculate average pace (min/km)
      const paces = lapList.map(lap => 1000 / (lap.average_speed! * 60))
      const avgPace = paces.reduce((sum, p) => sum + p, 0) / paces.length

      // Calculate average heart rate
      const heartRates = lapList
        .filter(lap => lap.average_heartrate !== null && lap.average_heartrate !== undefined)
        .map(lap => lap.average_heartrate!)
      const avgHeartRate = heartRates.length > 0
        ? heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length
        : null

      // Calculate average cadence (multiply by 2 as Strava returns steps per foot, not total steps)
      const cadences = lapList
        .filter(lap => lap.average_cadence !== null && lap.average_cadence !== undefined)
        .map(lap => lap.average_cadence! * 2) // Convert to total steps per minute
      const avgCadence = cadences.length > 0
        ? cadences.reduce((sum, c) => sum + c, 0) / cadences.length
        : null

      return {
        count: lapList.length,
        avgPace,
        avgHeartRate,
        avgCadence,
      }
    }

    const last4Weeks = calculateMetrics(last4Weeks1KmLaps)
    const previous4Weeks = calculateMetrics(previous4Weeks1KmLaps)

    return {
      last4Weeks,
      previous4Weeks,
    }
  }, [laps])

  // Calculate weekly metrics for 1km laps over last 10 weeks
  const weekly1KmLapsMetrics = useMemo(() => {
    const TARGET_DISTANCE = 1000 // 1km in meters
    const TOLERANCE = 50 // ±50 meters tolerance
    const now = new Date()

    // Get weeks data
    const weeks: Array<{
      weekStart: Date
      weekEnd: Date
      weekLabel: string
      laps: LapWithActivity[]
      metrics: {
        count: number
        avgPace: number | null
        avgHeartRate: number | null
        avgCadence: number | null
      }
    }> = []

    // Calculate metrics for each of the last 10 weeks
    for (let i = 0; i < 10; i++) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i + 1) * 7)
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)

      // Filter 1km laps for this week
      const weekLaps = laps.filter(lap => {
        const date = new Date(lap.start_date)
        return date >= weekStart && date < weekEnd &&
               Math.abs(lap.distance - TARGET_DISTANCE) <= TOLERANCE &&
               lap.average_speed && lap.average_speed > 0
      })

      // Calculate metrics for this week
      let avgPace: number | null = null
      let avgHeartRate: number | null = null
      let avgCadence: number | null = null

      if (weekLaps.length > 0) {
        // Average pace
        const paces = weekLaps.map(lap => 1000 / (lap.average_speed! * 60))
        avgPace = paces.reduce((sum, p) => sum + p, 0) / paces.length

        // Average heart rate
        const heartRates = weekLaps
          .filter(lap => lap.average_heartrate !== null && lap.average_heartrate !== undefined)
          .map(lap => lap.average_heartrate!)
        avgHeartRate = heartRates.length > 0
          ? heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length
          : null

        // Average cadence (multiply by 2 as Strava returns steps per foot, not total steps)
        const cadences = weekLaps
          .filter(lap => lap.average_cadence !== null && lap.average_cadence !== undefined)
          .map(lap => lap.average_cadence! * 2) // Convert to total steps per minute
        avgCadence = cadences.length > 0
          ? cadences.reduce((sum, c) => sum + c, 0) / cadences.length
          : null
      }

      weeks.push({
        weekStart,
        weekEnd,
        weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        laps: weekLaps,
        metrics: {
          count: weekLaps.length,
          avgPace,
          avgHeartRate,
          avgCadence,
        },
      })
    }

    // Reverse to show oldest to newest
    return weeks.reverse()
  }, [laps])

  // Calculate Personal Bests for different distances
  const personalBests = useMemo(() => {
    const distanceTargets = [
      { name: '1km', meters: 1000, tolerance: 50 },
      { name: '5km', meters: 5000, tolerance: 250 },
      { name: '10km', meters: 10000, tolerance: 500 },
      { name: '15km', meters: 15000, tolerance: 750 },
      { name: '20km', meters: 20000, tolerance: 1000 },
    ]

    return distanceTargets.map(({ name, meters, tolerance }) => {
      // Find activities within the distance range
      const matchingActivities = activities.filter(a => 
        Math.abs(a.distance - meters) <= tolerance && a.moving_time > 0
      )

      if (matchingActivities.length === 0) {
        return { distance: name, time: null, pace: null, date: null }
      }

      // Find the fastest one (shortest time)
      const best = matchingActivities.reduce((fastest, current) => 
        current.moving_time < fastest.moving_time ? current : fastest
      )

      // Calculate pace (min/km)
      const paceMinPerKm = best.average_speed ? 1000 / (best.average_speed * 60) : null

      return {
        distance: name,
        time: best.moving_time,
        pace: paceMinPerKm,
        date: best.start_date,
        activity: best,
      }
    })
  }, [activities])

  const handleSync = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('Please log in to sync activities. Click your profile icon to sign in.')
      return
    }

    try {
      setSyncing(true)
      setError(null)
      // Sync all activities and laps
      await stravaAPI.syncAll(true) // true = include laps
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync data'
      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
        setError('Please log in to sync activities. Click your profile icon to sign in.')
      } else {
        setError(errorMessage)
      }
      console.error('Error syncing:', err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RiRunLine className="mx-auto mb-4 h-12 w-12 animate-pulse text-orange-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading your stats...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Error Loading Data
          </h2>
          <p className="mb-4 text-gray-500 dark:text-gray-400">{error}</p>
          <Button onClick={loadData}>
            <RiRefreshLine className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const formatDistance = (meters: number) => `${(meters / 1000).toFixed(1)} km`
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatPaceFromMinPerKm = (minPerKm: number | null) => {
    if (!minPerKm) return 'N/A'
    const minutes = Math.floor(minPerKm)
    const seconds = Math.round((minPerKm - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Training Dashboard
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {athlete?.firstname ? `${athlete.firstname}'s training for ${RACE_NAME}` : 'Your Race Training'}
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing || !isAuthenticated} title={!isAuthenticated ? "Please sign in to sync activities" : ""}>
          <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Activities'}
        </Button>
      </div>

      {/* Race Countdown and Next Training Activity - Two columns on desktop */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RaceCountdown />
        <NextTrainingActivity />
      </div>

      {/* Training Statistics and Personal Bests - Two columns on desktop */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Training Stats Table */}
        {activities.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
              Training Statistics
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Runs
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Distance
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Elevation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                      Last Week
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {periodStats.lastWeek.count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {formatDistance(periodStats.lastWeek.distance)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {formatTime(periodStats.lastWeek.time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {Math.round(periodStats.lastWeek.elevation)} m
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                      Last 4 Weeks
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {periodStats.last4Weeks.count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {formatDistance(periodStats.last4Weeks.distance)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {formatTime(periodStats.last4Weeks.time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                      {Math.round(periodStats.last4Weeks.elevation)} m
                    </td>
                  </tr>
                  <tr className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Since Sept 1, 2025
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {periodStats.sinceStart.count}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {formatDistance(periodStats.sinceStart.distance)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {formatTime(periodStats.sinceStart.time)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {Math.round(periodStats.sinceStart.elevation)} m
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Personal Bests */}
        {activities.length > 0 && personalBests.some(pb => pb.time !== null) && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
              Personal Bests (Since Sept 1, 2025)
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Distance
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Pace
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {personalBests.map((pb) => (
                    <tr
                      key={pb.distance}
                      className={pb.time 
                        ? 'hover:bg-green-50 dark:hover:bg-green-950/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                      }
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {pb.distance}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        pb.time 
                          ? 'font-semibold text-gray-900 dark:text-gray-50' 
                          : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {pb.time ? formatTime(pb.time) : 'No data'}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        pb.time 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {pb.time ? `${formatPaceFromMinPerKm(pb.pace)} /km` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {pb.date ? new Date(pb.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4-Week Comparison: 1km Laps - Accordion */}
      {laps.length > 0 && (fourWeekComparison.last4Weeks.count > 0 || fourWeekComparison.previous4Weeks.count > 0) && (
        <div className="mb-8">
          <Accordion type="single" collapsible defaultValue="comparison" className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <AccordionItem value="comparison">
              <AccordionTrigger className="px-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                    4-Week Comparison: 1km Laps
                  </h2>
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({fourWeekComparison.last4Weeks.count} vs {fourWeekComparison.previous4Weeks.count} laps)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                  Comparing average metrics from 1km laps between the last 4 weeks and the previous 4 weeks
                </p>
                
                {/* Comparison Stats Cards */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Number of 1km Laps */}
                  <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Number of 1km Laps
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">
                          {fourWeekComparison.last4Weeks.count}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          vs {fourWeekComparison.previous4Weeks.count}
                        </p>
                      </div>
                      {fourWeekComparison.last4Weeks.count > fourWeekComparison.previous4Weeks.count ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <RiArrowUpLine className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      ) : fourWeekComparison.last4Weeks.count < fourWeekComparison.previous4Weeks.count ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                          <RiArrowDownLine className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900/30">
                          <span className="text-gray-600 dark:text-gray-400">—</span>
                        </div>
                      )}
                    </div>
                    {fourWeekComparison.previous4Weeks.count > 0 && (
                      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {((fourWeekComparison.last4Weeks.count / fourWeekComparison.previous4Weeks.count - 1) * 100).toFixed(1)}% change
                      </p>
                    )}
                  </div>

                  {/* Average Pace */}
                  {fourWeekComparison.last4Weeks.avgPace && fourWeekComparison.previous4Weeks.avgPace ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Average Pace
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">
                            {formatPaceFromMinPerKm(fourWeekComparison.last4Weeks.avgPace)} /km
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            vs {formatPaceFromMinPerKm(fourWeekComparison.previous4Weeks.avgPace)} /km
                          </p>
                        </div>
                        {fourWeekComparison.last4Weeks.avgPace < fourWeekComparison.previous4Weeks.avgPace ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <RiArrowUpLine className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <RiArrowDownLine className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {((1 - fourWeekComparison.last4Weeks.avgPace / fourWeekComparison.previous4Weeks.avgPace) * 100).toFixed(1)}% {fourWeekComparison.last4Weeks.avgPace < fourWeekComparison.previous4Weeks.avgPace ? 'faster' : 'slower'}
                      </p>
                    </div>
                  ) : fourWeekComparison.last4Weeks.avgPace ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Pace</p>
                      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">
                        {formatPaceFromMinPerKm(fourWeekComparison.last4Weeks.avgPace)} /km
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No previous data</p>
                    </div>
                  ) : null}

                  {/* Average Heart Rate */}
                  {fourWeekComparison.last4Weeks.avgHeartRate && fourWeekComparison.previous4Weeks.avgHeartRate ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Average Heart Rate
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
                            {Math.round(fourWeekComparison.last4Weeks.avgHeartRate)} bpm
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            vs {Math.round(fourWeekComparison.previous4Weeks.avgHeartRate)} bpm
                          </p>
                        </div>
                        {fourWeekComparison.last4Weeks.avgHeartRate < fourWeekComparison.previous4Weeks.avgHeartRate ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <RiArrowUpLine className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <RiArrowDownLine className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {((1 - fourWeekComparison.last4Weeks.avgHeartRate / fourWeekComparison.previous4Weeks.avgHeartRate) * 100).toFixed(1)}% {fourWeekComparison.last4Weeks.avgHeartRate < fourWeekComparison.previous4Weeks.avgHeartRate ? 'lower' : 'higher'}
                      </p>
                    </div>
                  ) : fourWeekComparison.last4Weeks.avgHeartRate ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Heart Rate</p>
                      <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
                        {Math.round(fourWeekComparison.last4Weeks.avgHeartRate)} bpm
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No previous data</p>
                    </div>
                  ) : null}

                  {/* Average Cadence */}
                  {fourWeekComparison.last4Weeks.avgCadence && fourWeekComparison.previous4Weeks.avgCadence ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Average Cadence
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                            {Math.round(fourWeekComparison.last4Weeks.avgCadence)} spm
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            vs {Math.round(fourWeekComparison.previous4Weeks.avgCadence)} spm
                          </p>
                        </div>
                        {fourWeekComparison.last4Weeks.avgCadence > fourWeekComparison.previous4Weeks.avgCadence ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <RiArrowUpLine className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <RiArrowDownLine className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {((fourWeekComparison.last4Weeks.avgCadence / fourWeekComparison.previous4Weeks.avgCadence - 1) * 100).toFixed(1)}% {fourWeekComparison.last4Weeks.avgCadence > fourWeekComparison.previous4Weeks.avgCadence ? 'higher' : 'lower'}
                      </p>
                    </div>
                  ) : fourWeekComparison.last4Weeks.avgCadence ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Cadence</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                        {Math.round(fourWeekComparison.last4Weeks.avgCadence)} spm
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No previous data</p>
                    </div>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* 10-Week Trend: 1km Laps - Accordion */}
      {laps.length > 0 && weekly1KmLapsMetrics.some(w => w.metrics.count > 0) && (
        <div className="mb-8">
          <Accordion type="single" collapsible defaultValue="weekly-trend" className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <AccordionItem value="weekly-trend">
              <AccordionTrigger className="px-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                    10-Week Trend: 1km Laps
                  </h2>
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({weekly1KmLapsMetrics.reduce((sum, w) => sum + w.metrics.count, 0)} total laps)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                  Weekly trends for average pace, heart rate, and cadence from 1km laps over the last 10 weeks
                </p>

                {/* Weekly Trend Charts */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Pace Trend Chart */}
                  {weekly1KmLapsMetrics.some(w => w.metrics.avgPace !== null) && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                        Average Pace Trend
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weekly1KmLapsMetrics.map(w => ({
                          week: w.weekLabel,
                          pace: w.metrics.avgPace,
                          count: w.metrics.count,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                          <XAxis
                            dataKey="week"
                            className="text-xs text-gray-500 dark:text-gray-400"
                            tick={{ fill: 'currentColor' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            tickFormatter={formatPaceFromMinPerKm}
                            className="text-xs text-gray-500 dark:text-gray-400"
                            tick={{ fill: 'currentColor' }}
                            domain={(() => {
                              const validPaces = weekly1KmLapsMetrics
                                .map(w => w.metrics.avgPace)
                                .filter((p): p is number => p !== null && p !== undefined)
                              if (validPaces.length === 0) return ['auto', 'auto']
                              const minPace = Math.min(...validPaces)
                              const maxPace = Math.max(...validPaces)
                              const padding = (maxPace - minPace) * 0.1 || 0.2
                              return [maxPace + padding, minPace - padding] // Reversed for pace
                            })()}
                            reversed
                            label={{ 
                              value: 'Pace (min/km)', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle' }
                            }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                                    <p className="font-semibold text-gray-900 dark:text-gray-50">
                                      Week of {data.week}
                                    </p>
                                    {data.pace && (
                                      <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                                        Pace: {formatPaceFromMinPerKm(data.pace)} /km
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {data.count} laps
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="pace"
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={{ fill: '#f97316', r: 4 }}
                            name="Average Pace"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Heart Rate Trend Chart */}
                  {weekly1KmLapsMetrics.some(w => w.metrics.avgHeartRate !== null) && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                        Average Heart Rate Trend
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weekly1KmLapsMetrics.map(w => ({
                          week: w.weekLabel,
                          heartRate: w.metrics.avgHeartRate,
                          count: w.metrics.count,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                          <XAxis
                            dataKey="week"
                            className="text-xs text-gray-500 dark:text-gray-400"
                            tick={{ fill: 'currentColor' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            className="text-xs text-gray-500 dark:text-gray-400"
                            tick={{ fill: 'currentColor' }}
                            domain={(() => {
                              const validHR = weekly1KmLapsMetrics
                                .map(w => w.metrics.avgHeartRate)
                                .filter((hr): hr is number => hr !== null && hr !== undefined)
                              if (validHR.length === 0) return ['auto', 'auto']
                              const minHR = Math.min(...validHR)
                              const maxHR = Math.max(...validHR)
                              const padding = (maxHR - minHR) * 0.1 || 5
                              return [Math.max(0, Math.floor((minHR - padding) / 10) * 10), Math.ceil((maxHR + padding) / 10) * 10]
                            })()}
                            label={{ 
                              value: 'Heart Rate (bpm)', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle' }
                            }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                                    <p className="font-semibold text-gray-900 dark:text-gray-50">
                                      Week of {data.week}
                                    </p>
                                    {data.heartRate && (
                                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                        Heart Rate: {Math.round(data.heartRate)} bpm
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {data.count} laps
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="heartRate"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ fill: '#ef4444', r: 4 }}
                            name="Average Heart Rate"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Cadence Trend Chart */}
                  {weekly1KmLapsMetrics.some(w => w.metrics.avgCadence !== null) && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                        Average Cadence Trend
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weekly1KmLapsMetrics.map(w => ({
                          week: w.weekLabel,
                          cadence: w.metrics.avgCadence,
                          count: w.metrics.count,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                          <XAxis
                            dataKey="week"
                            className="text-xs text-gray-500 dark:text-gray-400"
                            tick={{ fill: 'currentColor' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            className="text-xs text-gray-500 dark:text-gray-400"
                            tick={{ fill: 'currentColor' }}
                            domain={(() => {
                              const validCadence = weekly1KmLapsMetrics
                                .map(w => w.metrics.avgCadence)
                                .filter((c): c is number => c !== null && c !== undefined)
                              if (validCadence.length === 0) return ['auto', 'auto']
                              const minCadence = Math.min(...validCadence)
                              const maxCadence = Math.max(...validCadence)
                              const padding = (maxCadence - minCadence) * 0.1 || 2
                              return [Math.max(0, Math.floor((minCadence - padding) / 5) * 5), Math.ceil((maxCadence + padding) / 5) * 5]
                            })()}
                            label={{ 
                              value: 'Cadence (spm)', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle' }
                            }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                                    <p className="font-semibold text-gray-900 dark:text-gray-50">
                                      Week of {data.week}
                                    </p>
                                    {data.cadence && (
                                      <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                                        Cadence: {Math.round(data.cadence)} spm
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {data.count} laps
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="cadence"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            name="Average Cadence"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Weekly Summary Table - Accordion */}
                <div className="mt-6">
                  <Accordion type="single" collapsible className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <AccordionItem value="weekly-summary">
                      <AccordionTrigger className="px-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                          Weekly Summary
                        </h3>
                      </AccordionTrigger>
                      <AccordionContent className="px-6">
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                          <table className="w-full">
                            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                              <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  Week
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  Laps
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  Avg Pace
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  Avg HR
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  Avg Cadence
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                              {weekly1KmLapsMetrics.map((week, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                                    {week.weekLabel}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                                    {week.metrics.count}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                                    {week.metrics.avgPace ? formatPaceFromMinPerKm(week.metrics.avgPace) : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                                    {week.metrics.avgHeartRate ? `${Math.round(week.metrics.avgHeartRate)} bpm` : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">
                                    {week.metrics.avgCadence ? `${Math.round(week.metrics.avgCadence)} spm` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}


      {/* Empty State */}
      {activities.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <RiRunLine className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            No Training Data Available
          </h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            Sync your Strava activities to start tracking your training
          </p>
          <Button onClick={handleSync} disabled={syncing || !isAuthenticated} title={!isAuthenticated ? "Please sign in to sync activities" : ""}>
            <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}
    </div>
  )
}

