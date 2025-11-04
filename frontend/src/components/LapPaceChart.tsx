"use client"

import { useMemo } from "react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { LapWithActivity } from "@/lib/api"

interface LapPaceChartProps {
  laps: LapWithActivity[]
}

export function LapPaceChart({ laps }: LapPaceChartProps) {
  const chartData = useMemo(() => {
    // Convert laps to chart data with pace, filtering for reasonable pace values
    const MIN_PACE = 2.0  // 2:00 min/km
    const MAX_PACE = 6.5  // 6:30 min/km
    
    const lapsByDate: { [key: string]: any[] } = {}
    
    laps
      .filter((lap) => lap.average_speed && lap.average_speed > 0)
      .forEach((lap) => {
        // Calculate pace in min/km
        const paceMinutesPerKm = 1000 / (lap.average_speed! * 60)
        
        // Filter to only include paces between 2:00 and 6:30 min/km
        if (paceMinutesPerKm >= MIN_PACE && paceMinutesPerKm <= MAX_PACE) {
          const date = new Date(lap.start_date)
          const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          
          if (!lapsByDate[dateKey]) {
            lapsByDate[dateKey] = []
          }
          
          lapsByDate[dateKey].push({
            date: dateKey,
            fullDate: date,
            pace: paceMinutesPerKm,
            activityName: lap.activity_name,
            lapIndex: lap.lap_index + 1,
          })
        }
      })
    
    // Sort dates and flatten to array
    return Object.entries(lapsByDate)
      .sort(([, a], [, b]) => a[0].fullDate.getTime() - b[0].fullDate.getTime())
      .flatMap(([, laps]) => laps)
  }, [laps])

  const formatPace = (value: number) => {
    const minutes = Math.floor(value)
    const seconds = Math.round((value - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">
          No lap data available. Sync activities with laps to see the chart.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
        Lap Pace Over Time
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis
            type="category"
            dataKey="date"
            allowDuplicatedCategory={false}
            className="text-xs text-gray-500 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            type="number"
            dataKey="pace"
            tickFormatter={formatPace}
            className="text-xs text-gray-500 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
            domain={[2, 6.5]}
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {data.date}
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                      {data.activityName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Lap {data.lapIndex}
                    </p>
                    <p className="mt-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                      Pace: {formatPace(data.pace)} /km
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={() => 'Lap Pace'}
          />
          <Scatter
            name="Lap Pace"
            data={chartData}
            fill="#f97316"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Showing {chartData.length} laps between 2:00 and 6:30 min/km pace
      </p>
    </div>
  )
}

