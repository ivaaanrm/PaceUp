"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { stravaAPI, type Activity, formatDistance, formatDuration, formatPace, formatDate } from "@/lib/api"
import { Button } from "@/components/Button"
import { BarChart } from "@/components/BarChart"
import { ActivityChartTooltip } from "@/components/CustomTooltips"
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableRoot } from "@/components/Table"
import { RiRefreshLine, RiRunLine, RiArrowRightLine, RiArrowUpSLine, RiArrowDownSLine, RiArrowUpDownLine } from "@remixicon/react"
import { useAuth } from "@/contexts/AuthContext"

// Training start date - only show activities from this date onwards
const TRAINING_START_DATE = new Date('2025-09-01')

// Format date as DD/MM/YYYY
function formatCompactDate(dateString: string): string {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function ActivitiesPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<keyof Activity | null>('start_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await stravaAPI.getActivities(200)
      
      // Filter activities from training start date
      // Note: Backend already returns activities sorted from newest to oldest
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

  // Sort activities based on sortColumn and sortDirection
  const sortedActivities = useMemo(() => {
    if (!sortColumn) return activities
    
    return [...activities].sort((a, b) => {
      let aValue: any = a[sortColumn]
      let bValue: any = b[sortColumn]
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      // Handle date strings
      if (sortColumn === 'start_date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return 0
    })
  }, [activities, sortColumn, sortDirection])

  // Transform activities data for chart
  const chartData = useMemo(() => {
    return activities
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((activity) => {
        const date = new Date(activity.start_date)
        const dateStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        
        return {
          date: dateStr,
          "Distance (km)": activity.distance / 1000,
          distance: activity.distance,
          average_speed: activity.average_speed,
          average_heartrate: activity.average_heartrate,
        }
      })
  }, [activities])

  const handleSort = (column: keyof Activity) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      // Default to descending for date column, ascending for others
      setSortDirection(column === 'start_date' ? 'desc' : 'asc')
    }
  }

  const getSortIcon = (column: keyof Activity) => {
    if (sortColumn !== column) {
      return <RiArrowUpDownLine className="ml-1 h-3 w-3 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <RiArrowUpSLine className="ml-1 h-3 w-3 text-orange-500" />
      : <RiArrowDownSLine className="ml-1 h-3 w-3 text-orange-500" />
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
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
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

      {/* Distance Chart */}
      {activities.length > 0 && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Distance Over Time
          </h2>
          <BarChart
            data={chartData}
            index="date"
            categories={["Distance (km)"]}
            colors={["orange"]}
            valueFormatter={(value) => `${value.toFixed(2)} km`}
            showLegend={false}
            showGridLines={true}
            yAxisLabel="Distance (km)"
            customTooltip={ActivityChartTooltip}
            className="h-64"
            barCategoryGap="20%"
          />
        </div>
      )}

      {/* Activities Table */}
      {activities.length > 0 ? (
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-hidden">
            <Table className="w-full" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '15%' }} />
                <col className="hidden sm:table-column" style={{ width: '25%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <TableHead className="bg-gray-50 dark:bg-gray-800/50">
                <TableRow>
                  <TableHeaderCell 
                    className="cursor-pointer select-none text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:text-sm"
                    onClick={() => handleSort('start_date')}
                  >
                    <div className="flex items-center">
                      Date
                      {getSortIcon('start_date')}
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell 
                    className="hidden cursor-pointer select-none text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:table-cell sm:text-sm"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell className="text-xs sm:text-sm">Type</TableHeaderCell>
                  <TableHeaderCell 
                    className="cursor-pointer select-none text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:text-sm"
                    onClick={() => handleSort('distance')}
                  >
                    <div className="flex items-center">
                      Distance
                      {getSortIcon('distance')}
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell 
                    className="cursor-pointer select-none text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:text-sm"
                    onClick={() => handleSort('average_speed')}
                  >
                    <div className="flex items-center">
                      Pace
                      {getSortIcon('average_speed')}
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell 
                    className="cursor-pointer select-none text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:text-sm"
                    onClick={() => handleSort('average_heartrate')}
                  >
                    <div className="flex items-center">
                      Heart Rate
                      {getSortIcon('average_heartrate')}
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell className="text-xs sm:text-sm"></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedActivities.map((activity) => (
                  <TableRow key={activity.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <TableCell className="text-gray-900 dark:text-gray-50">
                      <span className="text-[10px] sm:text-xs">{formatCompactDate(activity.start_date)}</span>
                    </TableCell>
                    <TableCell className="hidden font-medium text-gray-900 dark:text-gray-50 sm:table-cell">
                      <span className="truncate block text-[10px] sm:text-xs" title={activity.name}>{activity.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-orange-100 px-1 py-0.5 text-[9px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 sm:px-1.5 sm:text-[10px]">
                        {activity.sport_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-50">
                      <span className="text-[10px] sm:text-xs">{formatDistance(activity.distance)}</span>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-50">
                      <span className="text-[10px] sm:text-xs">{formatPace(activity.average_speed)}</span>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-50">
                      {activity.average_heartrate ? (
                        <span className="text-[10px] sm:text-xs">{Math.round(activity.average_heartrate)} bpm</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => router.push(`/activities/${activity.id}`)}
                        variant="secondary"
                        className="h-6 w-6 p-0 sm:h-7 sm:w-auto sm:px-2"
                      >
                        <RiArrowRightLine className="h-3 w-3 sm:mr-1 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden text-[10px] sm:inline sm:text-xs">View</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

