"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Lap } from "@/lib/api"
import { useIsMobile } from "@/lib/useMobile"

interface ActivityPaceHeartRateChartProps {
  laps: Lap[]
}

export function ActivityPaceHeartRateChart({ laps }: ActivityPaceHeartRateChartProps) {
  const isMobile = useIsMobile()
  
  const chartData = useMemo(() => {
    if (!laps || laps.length === 0) return []

    let cumulativeDistance = 0
    const dataPoints: Array<{ distance: number; pace: number; heartRate: number | null }> = []
    
    laps
      .filter((lap) => lap.average_speed && lap.average_speed > 0)
      .forEach((lap, index) => {
        // Calculate pace in min/km
        const paceMinutesPerKm = 1000 / (lap.average_speed! * 60)
        const heartRate = lap.average_heartrate ? Math.round(lap.average_heartrate) : null
        
        const lapStartDistance = Math.round(cumulativeDistance * 10) / 10
        cumulativeDistance += lap.distance / 1000
        const lapEndDistance = Math.round(cumulativeDistance * 10) / 10
        
        // Add point at start of lap
        dataPoints.push({
          distance: lapStartDistance,
          pace: paceMinutesPerKm,
          heartRate: heartRate,
        })
        
        // Add point at end of lap
        dataPoints.push({
          distance: lapEndDistance,
          pace: paceMinutesPerKm,
          heartRate: heartRate,
        })
      })
    
    return dataPoints
  }, [laps])

  const formatPaceValue = (value: number) => {
    const minutes = Math.floor(value)
    const seconds = Math.round((value - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">
          No lap data available. Sync laps to see pace and heart rate over distance.
        </p>
      </div>
    )
  }

  // Calculate domains for better visualization
  const paceValues = chartData.map(d => d.pace).filter((p): p is number => p != null)
  const hrValues = chartData.map(d => d.heartRate).filter((hr): hr is number => hr != null)
  
  const minPace = paceValues.length > 0 ? Math.floor(Math.min(...paceValues) * 2) / 2 - 0.5 : 2
  const maxPace = paceValues.length > 0 ? Math.ceil(Math.max(...paceValues) * 2) / 2 + 0.5 : 6
  
  const minHR = hrValues.length > 0 ? Math.floor(Math.min(...hrValues) / 10) * 10 - 10 : 100
  const maxHR = hrValues.length > 0 ? Math.ceil(Math.max(...hrValues) / 10) * 10 + 10 : 200

  return (
    <div className={`rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${isMobile ? 'p-3' : 'p-6'}`}>
      <h3 className={`${isMobile ? 'mb-3 text-base' : 'mb-4 text-lg'} font-semibold text-gray-900 dark:text-gray-50`}>
        Pace & Heart Rate Over Distance
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={chartData} 
          margin={isMobile 
            ? { top: 5, right: 5, left: 5, bottom: 5 }
            : { top: 5, right: 30, left: 20, bottom: 5 }
          }
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-gray-200 dark:stroke-gray-800" 
            opacity={0.3}
          />
          <XAxis
            dataKey="distance"
            type="number"
            scale="linear"
            className="text-xs fill-gray-500 dark:fill-gray-500"
            tick={{ fill: 'currentColor' }}
            label={{ 
              value: 'Distance (km)', 
              position: 'insideBottom', 
              offset: -5,
              className: 'text-sm fill-gray-700 dark:fill-gray-300'
            }}
          />
          <YAxis
            yAxisId="pace"
            orientation="left"
            domain={[maxPace, minPace]} // Reversed so faster pace is higher
            tickFormatter={formatPaceValue}
            width={isMobile ? 40 : 56}
            className="text-xs fill-gray-500 dark:fill-gray-500"
            tick={{ fill: 'currentColor' }}
            label={!isMobile ? { 
              value: 'Pace (min/km)', 
              angle: -90, 
              position: 'insideLeft',
              className: 'text-sm fill-orange-600 dark:fill-orange-400'
            } : undefined}
          />
          <YAxis
            yAxisId="heartrate"
            orientation="right"
            domain={[minHR, maxHR]}
            width={isMobile ? 40 : 56}
            className="text-xs fill-gray-500 dark:fill-gray-500"
            tick={{ fill: 'currentColor' }}
            label={!isMobile ? { 
              value: 'Heart Rate (bpm)', 
              angle: 90, 
              position: 'insideRight',
              className: 'text-sm fill-red-600 dark:fill-red-400'
            } : undefined}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    <p className="mb-2 font-semibold text-gray-900 dark:text-gray-50">
                      {data.distance.toFixed(1)} km
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Pace:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                          {formatPaceValue(data.pace)} /km
                        </span>
                      </div>
                      {data.heartRate && (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Heart Rate:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            {data.heartRate} bpm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          {isMobile ? (
            <Legend 
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '10px' }}
              formatter={(value) => {
                if (value === 'pace') return 'Pace (min/km)'
                if (value === 'heartRate') return 'Heart Rate (bpm)'
                return value
              }}
              iconType="line"
            />
          ) : (
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'pace') return 'Pace'
                if (value === 'heartRate') return 'Heart Rate'
                return value
              }}
            />
          )}
          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            name="pace"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            yAxisId="heartrate"
            type="monotone"
            dataKey="heartRate"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            name="heartRate"
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

