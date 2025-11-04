"use client"

import { useState } from "react"
import { Input } from "@/components/Input"
import { Button } from "@/components/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select"
import { RiCalculatorLine } from "@remixicon/react"

// Distance options in meters
const DISTANCE_OPTIONS = [
  { label: "3km", value: 3000 },
  { label: "3mi", value: 4828.03 },
  { label: "5km", value: 5000 },
  { label: "6mi", value: 9656.06 },
  { label: "10km", value: 10000 },
  { label: "15km", value: 15000 },
  { label: "10mi", value: 16093.4 },
  { label: "20km", value: 20000 },
  { label: "Half Marathon", value: 21097.5 },
  { label: "Full Marathon", value: 42195 },
  { label: "50km", value: 50000 },
  { label: "Comrades Marathon", value: 90000 },
]

// Riegel's constant
const RIEGEL_CONSTANT = 1.06

export default function CalculatorPage() {
  const [recentDistance, setRecentDistance] = useState<string>("5000") // 5km default
  const [timeInput, setTimeInput] = useState("")
  const [goalDistance, setGoalDistance] = useState<string>("21097.5") // Half Marathon default
  const [predictedTime, setPredictedTime] = useState<number | null>(null)
  const [predictedPace, setPredictedPace] = useState<number | null>(null)

  // Parse time input (HH:MM:SS or MM:SS)
  const parseTime = (timeStr: string): number | null => {
    if (!timeStr.trim()) return null
    
    const parts = timeStr.split(":").map(Number)
    
    if (parts.length === 2) {
      // MM:SS format
      const [minutes, seconds] = parts
      if (isNaN(minutes) || isNaN(seconds)) return null
      return minutes * 60 + seconds
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
      return hours * 3600 + minutes * 60 + seconds
    }
    
    return null
  }

  // Format time in seconds to HH:MM:SS or MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Format pace (min/km)
  const formatPace = (seconds: number, distanceMeters: number): string => {
    const paceSecondsPerKm = (seconds / distanceMeters) * 1000
    const minutes = Math.floor(paceSecondsPerKm / 60)
    const seconds_part = Math.floor(paceSecondsPerKm % 60)
    return `${minutes}:${seconds_part.toString().padStart(2, '0')}`
  }

  const calculatePrediction = () => {
    const T1 = parseTime(timeInput)
    const D1 = parseFloat(recentDistance)
    const D2 = parseFloat(goalDistance)

    if (!T1 || !D1 || !D2) {
      setPredictedTime(null)
      setPredictedPace(null)
      return
    }

    // Riegel's formula: T2 = T1 x (D2/D1)^1.06
    const T2 = T1 * Math.pow(D2 / D1, RIEGEL_CONSTANT)
    
    setPredictedTime(T2)
    setPredictedPace(T2 / D2) // seconds per meter
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-shrink-0 rounded-full bg-blue-500 p-3">
            <RiCalculatorLine className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              Running Calculators
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Predict your race times and pace
            </p>
          </div>
        </div>
      </div>

      {/* Race Time Predictor Section */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-50">
          Race Time Predictor
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Use this calculator to predict your race time based on a previous race result. 
          This calculator uses Riegel's formula and assumes you have trained appropriately for the distance.
        </p>

        <div className="space-y-6">
          {/* Recent Race Distance */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Recent Race Distance
            </label>
            <Select value={recentDistance} onValueChange={setRecentDistance}>
              <SelectTrigger>
                <SelectValue placeholder="Select distance" />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recent Race Time */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Recent Race Time
            </label>
            <Input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="HH:MM:SS or MM:SS (e.g., 25:00 or 1:25:00)"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter time in HH:MM:SS or MM:SS format
            </p>
          </div>

          {/* Goal Race Distance */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Goal Race Distance
            </label>
            <Select value={goalDistance} onValueChange={setGoalDistance}>
              <SelectTrigger>
                <SelectValue placeholder="Select distance" />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calculate Button */}
          <Button onClick={calculatePrediction} className="w-full">
            Calculate Prediction
          </Button>

          {/* Results */}
          {predictedTime !== null && (
            <div className="mt-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                Predicted Race Time
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Time</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(predictedTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pace</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                    {formatPace(predictedTime, parseFloat(goalDistance))} /km
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
            About Riegel's Formula
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            This calculator uses Riegel's equation: <strong>T2 = T1 × (D2/D1)^1.06</strong>
            <br />
            This formula is most accurate for distances from 1 mile to Half Marathon. 
            For distances above Half Marathon, it tends to be optimistic.
          </p>
        </div>
      </div>
    </div>
  )
}

