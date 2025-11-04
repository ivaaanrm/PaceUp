"use client"

import { useEffect, useState } from "react"
import { stravaAPI, type Athlete, type AthleteStats } from "@/lib/api"
import { Button } from "@/components/Button"
import { RiRefreshLine, RiRunLine } from "@remixicon/react"

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

export default function DashboardPage() {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [stats, setStats] = useState<AthleteStats | null>(null)
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
      const [athleteData, statsData] = await Promise.all([
        stravaAPI.getAthlete(),
        stravaAPI.getAthleteStats(),
      ])
      setAthlete(athleteData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

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

  const formatDistance = (meters: number) => `${(meters / 1000).toFixed(0)} km`
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Welcome back, {athlete?.firstname || 'Runner'}!
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {athlete?.city && athlete?.country
              ? `${athlete.city}, ${athlete.country}`
              : 'Your Strava Dashboard'}
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Activities'}
        </Button>
      </div>

      {/* Recent Totals (Last 4 Weeks) */}
      {stats?.recent_run_totals && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Last 4 Weeks
          </h2>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Runs"
              value={stats.recent_run_totals.count.toString()}
            />
            <StatCard
              label="Total Distance"
              value={formatDistance(stats.recent_run_totals.distance)}
            />
            <StatCard
              label="Total Time"
              value={formatTime(stats.recent_run_totals.moving_time)}
            />
            <StatCard
              label="Elevation Gain"
              value={`${Math.round(stats.recent_run_totals.elevation_gain)} m`}
            />
          </dl>
        </div>
      )}

      {/* Year to Date */}
      {stats?.ytd_run_totals && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Year to Date
          </h2>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Runs"
              value={stats.ytd_run_totals.count.toString()}
            />
            <StatCard
              label="Total Distance"
              value={formatDistance(stats.ytd_run_totals.distance)}
            />
            <StatCard
              label="Total Time"
              value={formatTime(stats.ytd_run_totals.moving_time)}
            />
            <StatCard
              label="Elevation Gain"
              value={`${Math.round(stats.ytd_run_totals.elevation_gain)} m`}
            />
          </dl>
        </div>
      )}

      {/* All Time */}
      {stats?.all_run_totals && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            All Time
          </h2>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Runs"
              value={stats.all_run_totals.count.toString()}
            />
            <StatCard
              label="Total Distance"
              value={formatDistance(stats.all_run_totals.distance)}
            />
            <StatCard
              label="Total Time"
              value={formatTime(stats.all_run_totals.moving_time)}
            />
            <StatCard
              label="Elevation Gain"
              value={`${Math.round(stats.all_run_totals.elevation_gain)} m`}
            />
          </dl>
        </div>
      )}

      {/* Empty State */}
      {!stats?.recent_run_totals && !stats?.ytd_run_totals && !stats?.all_run_totals && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <RiRunLine className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            No Stats Available
          </h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            Sync your Strava activities to see your stats
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

