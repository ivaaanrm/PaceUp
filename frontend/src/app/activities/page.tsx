"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { stravaAPI, type Activity, formatDistance, formatDuration, formatPace, formatDate } from "@/lib/api"
import { Button } from "@/components/Button"
import { RiRefreshLine, RiRunLine, RiArrowRightLine } from "@remixicon/react"
import { useAuth } from "@/contexts/AuthContext"

// Training start date - only show activities from this date onwards
const TRAINING_START_DATE = new Date('2025-09-01')

export default function ActivitiesPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await stravaAPI.getActivities(200)
      
      // Filter activities from training start date
      const filteredData = data.filter(activity => 
        new Date(activity.start_date) >= TRAINING_START_DATE
      )
      
      setActivities(filteredData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities')
      console.error('Error loading activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('Please log in to sync activities. Click your profile icon to sign in.')
      return
    }

    try {
      setSyncing(true)
      setError(null)
      await stravaAPI.syncActivities()
      await loadActivities()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync activities'
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
          <p className="text-gray-500 dark:text-gray-400">Loading activities...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Error Loading Activities
          </h2>
          <p className="mb-4 text-gray-500 dark:text-gray-400">{error}</p>
          <Button onClick={loadActivities}>
            <RiRefreshLine className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Training Activities
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {activities.length} activities since September 1, 2025
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing || !isAuthenticated} title={!isAuthenticated ? "Please sign in to sync activities" : ""}>
          <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Activities'}
        </Button>
      </div>

      {/* Activities List */}
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-orange-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-500"
              onClick={() => router.push(`/activities/${activity.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                      {activity.name}
                    </h3>
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {activity.sport_type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(activity.start_date)}
                  </p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                        {formatDistance(activity.distance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                        {formatDuration(activity.moving_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Pace</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                        {formatPace(activity.average_speed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Elevation</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                        {Math.round(activity.total_elevation_gain)} m
                      </p>
                    </div>
                  </div>

                  {activity.average_heartrate && (
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        ❤️ Avg HR: <span className="font-medium text-gray-900 dark:text-gray-50">{Math.round(activity.average_heartrate)} bpm</span>
                      </span>
                      {activity.max_heartrate && (
                        <span className="text-gray-500 dark:text-gray-400">
                          Max: <span className="font-medium text-gray-900 dark:text-gray-50">{Math.round(activity.max_heartrate)} bpm</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <RiArrowRightLine className="ml-4 h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <RiRunLine className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            No Activities Found
          </h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            Sync your Strava activities to get started
          </p>
          <Button onClick={handleSync} disabled={syncing}>
            <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}
    </div>
  )
}

