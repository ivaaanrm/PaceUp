"use client"

import { useEffect, useState } from "react"
import { stravaAPI, type LapWithActivity } from "@/lib/api"
import { Button } from "@/components/Button"
import { RiRefreshLine, RiRunLine } from "@remixicon/react"
import { LapPaceChart } from "@/components/LapPaceChart"
import { LapHeartRateChart } from "@/components/LapHeartRateChart"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/Accordion"
import { useAuth } from "@/contexts/AuthContext"

const TRAINING_START_DATE = new Date('2025-09-01')

export default function StatisticsPage() {
  const { isAuthenticated } = useAuth()
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
      const lapsData = await stravaAPI.getAllLaps(1000).catch(() => [])
      
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

  const handleSync = async () => {
    if (!isAuthenticated) {
      setError('Please log in to sync activities. Click your profile icon to sign in.')
      return
    }

    try {
      setSyncing(true)
      setError(null)
      await stravaAPI.syncAll(true) // true = include laps
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync data'
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
          <p className="text-gray-500 dark:text-gray-400">Loading statistics...</p>
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

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Statistics
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Detailed lap-by-lap analysis of your training
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing || !isAuthenticated} title={!isAuthenticated ? "Please sign in to sync activities" : ""}>
          <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Activities'}
        </Button>
      </div>

      {/* Charts - Accordions */}
      <div className="mb-8 space-y-4">
        {/* Lap Pace Over Time - Accordion */}
        {laps.length > 0 && (
          <Accordion type="single" collapsible className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <AccordionItem value="lap-pace">
              <AccordionTrigger className="px-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                  Lap Pace Over Time
                </h2>
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <LapPaceChart laps={laps} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Lap Heart Rate Over Time - Accordion */}
        {laps.length > 0 && (
          <Accordion type="single" collapsible className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <AccordionItem value="lap-heartrate">
              <AccordionTrigger className="px-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                  Lap Heart Rate Over Time
                </h2>
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <LapHeartRateChart laps={laps} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      {/* Empty State */}
      {laps.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <RiRunLine className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            No Statistics Available
          </h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            Sync your Strava activities to start tracking your lap statistics
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

