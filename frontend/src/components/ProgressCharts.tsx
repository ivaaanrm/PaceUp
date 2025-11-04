"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { LapWithActivity } from "@/lib/api"

interface ProgressChartsProps {
  laps: LapWithActivity[]
}

export function ProgressCharts({ laps }: ProgressChartsProps) {
  const chartData = useMemo(() => {
    const MIN_PACE = 2.0
    const MAX_PACE = 6.5

    // Group laps by week
    const lapsByWeek: { [key: string]: any[] } = {}

    laps
      .filter((lap) => lap.average_speed && lap.average_speed > 0)
      .forEach((lap) => {
        const paceMinutesPerKm = 1000 / (lap.average_speed! * 60)
        
        if (paceMinutesPerKm >= MIN_PACE && paceMinutesPerKm <= MAX_PACE) {
          const date = new Date(lap.start_date)
          // Get week start (Monday)
          const dayOfWeek = date.getDay()
          const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          const weekStart = new Date(date.setDate(diff))
          weekStart.setHours(0, 0, 0, 0)
          
          const weekKey = weekStart.toISOString().split('T')[0]

          if (!lapsByWeek[weekKey]) {
            lapsByWeek[weekKey] = []
          }

          lapsByWeek[weekKey].push({
            pace: paceMinutesPerKm,
            heartrate: lap.average_heartrate,
            cadence: lap.average_cadence,
            date: date,
          })
        }
      })

    // Calculate weekly averages
    const weeklyData = Object.entries(lapsByWeek)
      .map(([weekKey, laps]) => {
        const validPaces = laps.filter(l => l.pace).map(l => l.pace)
        const validHR = laps.filter(l => l.heartrate).map(l => l.heartrate)
        const validCadence = laps.filter(l => l.cadence).map(l => l.cadence)

        return {
          week: new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weekDate: new Date(weekKey),
          avgPace: validPaces.length > 0 
            ? validPaces.reduce((a, b) => a + b, 0) / validPaces.length 
            : null,
          avgHeartRate: validHR.length > 0
            ? validHR.reduce((a, b) => a + b, 0) / validHR.length
            : null,
          avgCadence: validCadence.length > 0
            ? validCadence.reduce((a, b) => a + b, 0) / validCadence.length
            : null,
          lapCount: laps.length,
        }
      })
      .sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())

    return weeklyData
  }, [laps])

  // Calculate improvement metrics
  const improvement = useMemo(() => {
    if (chartData.length < 2) return null

    const firstWeek = chartData[0]
    const lastWeek = chartData[chartData.length - 1]

    const paceImprovement = firstWeek.avgPace && lastWeek.avgPace
      ? ((firstWeek.avgPace - lastWeek.avgPace) / firstWeek.avgPace) * 100
      : null

    const hrImprovement = firstWeek.avgHeartRate && lastWeek.avgHeartRate
      ? ((firstWeek.avgHeartRate - lastWeek.avgHeartRate) / firstWeek.avgHeartRate) * 100
      : null

    return {
      weeks: chartData.length,
      pace: paceImprovement,
      heartRate: hrImprovement,
    }
  }, [chartData])

  const formatPace = (value: number) => {
    const minutes = Math.floor(value)
    const seconds = Math.round((value - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">
          No lap data available for progress analysis
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Improvement Summary */}
      {improvement && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-50">
            Progress Over {improvement.weeks} Weeks
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {improvement.pace !== null && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pace Improvement</p>
                <p className={`text-2xl font-bold ${
                  improvement.pace > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {improvement.pace > 0 ? '+' : ''}{improvement.pace.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {improvement.pace > 0 ? 'Faster' : 'Slower'}
                </p>
              </div>
            )}
            {improvement.heartRate !== null && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Heart Rate Change</p>
                <p className={`text-2xl font-bold ${
                  improvement.heartRate < 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {improvement.heartRate > 0 ? '+' : ''}{improvement.heartRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {improvement.heartRate < 0 ? 'More efficient' : 'Higher effort'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pace Progress Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
          Average Pace by Week
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis
              dataKey="week"
              className="text-xs text-gray-500 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              tickFormatter={formatPace}
              className="text-xs text-gray-500 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
              domain={['auto', 'auto']}
              reversed
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
                      {data.avgPace && (
                        <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                          Pace: {formatPace(data.avgPace)} /km
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {data.lapCount} laps
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
              dataKey="avgPace"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ fill: '#f97316', r: 4 }}
              name="Average Pace"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heart Rate Progress Chart */}
      {chartData.some(d => d.avgHeartRate) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Average Heart Rate by Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis
                dataKey="week"
                className="text-xs text-gray-500 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs text-gray-500 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
                domain={['auto', 'auto']}
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
                        {data.avgHeartRate && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            HR: {Math.round(data.avgHeartRate)} bpm
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgHeartRate"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 4 }}
                name="Average Heart Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cadence Progress Chart */}
      {chartData.some(d => d.avgCadence) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Average Cadence by Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis
                dataKey="week"
                className="text-xs text-gray-500 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs text-gray-500 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
                domain={['auto', 'auto']}
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
                        {data.avgCadence && (
                          <p className="mt-1 text-sm text-purple-600 dark:text-purple-400">
                            Cadence: {Math.round(data.avgCadence)} spm
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgCadence"
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ fill: '#a855f7', r: 4 }}
                name="Average Cadence"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

