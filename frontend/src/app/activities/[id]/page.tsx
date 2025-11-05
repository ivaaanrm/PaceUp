"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { stravaAPI, type Activity, type Lap, formatDistance, formatDuration, formatPace, formatSpeed, formatDate } from "@/lib/api"
import { Button } from "@/components/Button"
import { RiArrowLeftLine, RiRefreshLine, RiRunLine } from "@remixicon/react"
import { useAuth } from "@/contexts/AuthContext"

export default function ActivityDetailPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const params = useParams()
  const activityId = parseInt(params.id as string)

  const [activity, setActivity] = useState<Activity | null>(null)
  const [laps, setLaps] = useState<Lap[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadActivityData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [activityData, lapsData] = await Promise.all([
        stravaAPI.getActivity(activityId),
        stravaAPI.getActivityLaps(activityId).catch(() => []),
      ])
      setActivity(activityData)
      setLaps(lapsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
      console.error('Error loading activity:', err)
    } finally {
      setLoading(false)
    }
  }, [activityId])

  useEffect(() => {
    if (activityId) {
      loadActivityData()
    }
  }, [activityId, loadActivityData])

  const handleSyncLaps = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('Please log in to sync laps. Click your profile icon to sign in.')
      return
    }

    try {
      setSyncing(true)
      setError(null)
      await stravaAPI.syncActivityLaps(activityId)
      await loadActivityData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync laps'
      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
        setError('Please log in to sync laps. Click your profile icon to sign in.')
      } else {
        setError(errorMessage)
      }
      console.error('Error syncing laps:', err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RiRunLine className="mx-auto mb-4 h-12 w-12 animate-pulse text-orange-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading activity...</p>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Error Loading Activity
          </h2>
          <p className="mb-4 text-gray-500 dark:text-gray-400">{error || 'Activity not found'}</p>
          <Button onClick={() => router.push('/activities')}>
            <RiArrowLeftLine className="mr-2 h-4 w-4" />
            Back to Activities
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/activities')}
          className="mb-4"
        >
          <RiArrowLeftLine className="mr-2 h-4 w-4" />
          Back to Activities
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {activity.name}
              </h1>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {activity.sport_type}
              </span>
            </div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {formatDate(activity.start_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="mb-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Distance</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {formatDistance(activity.distance)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {formatDuration(activity.moving_time)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Pace</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {formatPace(activity.average_speed)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Elevation</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {Math.round(activity.total_elevation_gain)} m
          </p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
          Performance Metrics
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Avg Speed</dt>
            <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
              {formatSpeed(activity.average_speed)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Max Speed</dt>
            <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
              {formatSpeed(activity.max_speed)}
            </dd>
          </div>
          {activity.average_heartrate && (
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Avg Heart Rate</dt>
              <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                {Math.round(activity.average_heartrate)} bpm
              </dd>
            </div>
          )}
          {activity.max_heartrate && (
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Max Heart Rate</dt>
              <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                {Math.round(activity.max_heartrate)} bpm
              </dd>
            </div>
          )}
          {activity.average_cadence && (
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Avg Cadence</dt>
              <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                {Math.round(activity.average_cadence)} spm
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Laps Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Laps {laps.length > 0 && `(${laps.length})`}
          </h2>
          {laps.length === 0 && (
            <Button className="h-9 px-3 text-sm" onClick={handleSyncLaps} disabled={syncing || !isAuthenticated} title={!isAuthenticated ? "Please sign in to sync laps" : ""}>
              <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Laps'}
            </Button>
          )}
        </div>

        {laps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Lap
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Distance
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Time
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pace
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Avg HR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {laps.map((lap) => (
                  <tr key={lap.id}>
                    <td className="py-3 text-sm text-gray-900 dark:text-gray-50">
                      {lap.lap_index + 1}
                    </td>
                    <td className="py-3 text-sm text-gray-900 dark:text-gray-50">
                      {formatDistance(lap.distance)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 dark:text-gray-50">
                      {formatDuration(lap.moving_time)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 dark:text-gray-50">
                      {formatPace(lap.average_speed)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 dark:text-gray-50">
                      {lap.average_heartrate ? `${Math.round(lap.average_heartrate)} bpm` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No laps data available. Click &quot;Sync Laps&quot; to fetch lap data from Strava.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

