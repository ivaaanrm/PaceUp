"use client"

import { useMemo } from "react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { LapWithActivity } from "@/lib/api"

interface LapHeartRateChartProps {
  laps: LapWithActivity[]
}

export function LapHeartRateChart({ laps }: LapHeartRateChartProps) {
  const chartData = useMemo(() => {
    const lapsByDate: { [key: string]: any[] } = {}
    
    laps
      .filter((lap) => lap.average_heartrate && lap.average_heartrate > 0)
      .forEach((lap) => {
        const date = new Date(lap.start_date)
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        
        if (!lapsByDate[dateKey]) {
          lapsByDate[dateKey] = []
        }
        
        lapsByDate[dateKey].push({
          date: dateKey,
          fullDate: date,
          heartrate: lap.average_heartrate,
          activityName: lap.activity_name,
          lapIndex: lap.lap_index + 1,
        })
      })
    
    // Sort dates and flatten to array
    return Object.entries(lapsByDate)
      .sort(([, a], [, b]) => a[0].fullDate.getTime() - b[0].fullDate.getTime())
      .flatMap(([, laps]) => laps)
  }, [laps])

  // Calculate heart rate domain
  const heartRateData = chartData.map(d => d.heartrate).filter((hr): hr is number => hr != null)
  const minHR = heartRateData.length > 0 ? Math.floor(Math.min(...heartRateData) / 10) * 10 - 10 : 100
  const maxHR = heartRateData.length > 0 ? Math.ceil(Math.max(...heartRateData) / 10) * 10 + 10 : 200

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center py-6">
        <p className="text-gray-500 dark:text-gray-400">
          No heart rate data available. Sync activities with laps to see the chart.
        </p>
      </div>
    )
  }

  return (
    <div className="py-6">
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
            dataKey="heartrate"
            className="text-xs text-gray-500 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
            domain={[minHR, maxHR]}
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {data.date}
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-gray-50">
                      {data.activityName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Lap {data.lapIndex}
                    </p>
                    <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                      Heart Rate: {Math.round(data.heartrate)} bpm
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={() => 'Heart Rate'}
          />
          <Scatter
            name="Heart Rate"
            data={chartData}
            fill="#ef4444"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Showing {chartData.length} laps with heart rate data
      </p>
    </div>
  )
}
