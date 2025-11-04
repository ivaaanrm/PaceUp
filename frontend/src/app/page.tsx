"use client"

import { useEffect, useState, useMemo } from "react"
import { stravaAPI, type Athlete, type Activity, type LapWithActivity } from "@/lib/api"
import { Button } from "@/components/Button"
import { RiRefreshLine, RiRunLine, RiCalendarLine } from "@remixicon/react"
import { LapPaceChart } from "@/components/LapPaceChart"

// Race configuration
const RACE_DATE = new Date('2026-01-18')
const RACE_NAME = "La Mitja Half Marathon"
const TRAINING_START_DATE = new Date('2025-09-01')

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
        {value}
      </dd>
      {subtext && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {subtext}
        </p>
      )}
    </div>
  )
}

function RaceCountdown() {
  const [countdown, setCountdown] = useState({ days: 0, weeks: 0 })

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

  return (
    <div className="rounded-lg border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 p-6 dark:from-orange-950/30 dark:to-orange-900/20 dark:border-orange-600">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 rounded-full bg-orange-500 p-3">
          <RiCalendarLine className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {RACE_NAME}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {RACE_DATE.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {countdown.days}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                days to go
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {countdown.weeks}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                weeks to go
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
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

    const calculateStats = (activitiesInPeriod: Activity[]) => {
      return {
        count: activitiesInPeriod.length,
        distance: activitiesInPeriod.reduce((sum, a) => sum + a.distance, 0),
        time: activitiesInPeriod.reduce((sum, a) => sum + a.moving_time, 0),
        elevation: activitiesInPeriod.reduce((sum, a) => sum + a.total_elevation_gain, 0),
      }
    }

    return {
      lastWeek: calculateStats(
        activities.filter(a => new Date(a.start_date) >= oneWeekAgo)
      ),
      last4Weeks: calculateStats(
        activities.filter(a => new Date(a.start_date) >= fourWeeksAgo)
      ),
      sinceStart: calculateStats(activities),
    }
  }, [activities])

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      await stravaAPI.syncAll(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync data')
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
    return `${hours}h ${minutes}m`
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
        <Button onClick={handleSync} disabled={syncing}>
          <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Activities'}
        </Button>
      </div>

      {/* Race Countdown */}
      <div className="mb-8">
        <RaceCountdown />
      </div>

      {/* Training Stats Table */}
      {activities.length > 0 && (
        <div className="mb-8">
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

      {/* Lap Pace Chart */}
      {laps.length > 0 && (
        <div className="mb-8">
          <LapPaceChart laps={laps} />
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
          <Button onClick={handleSync} disabled={syncing}>
            <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}
    </div>
  )
}

