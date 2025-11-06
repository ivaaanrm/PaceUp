"use client"

import { useEffect, useState, useMemo } from "react"
import { trainingPlanAPI, stravaAPI, type TrainingPlan, type TrainingPlanRequest, type Athlete, type ActivityCompletion, type PlanProgress } from "@/lib/api"
import { Button } from "@/components/Button"
import { Input } from "@/components/Input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select"
import { RiRunLine, RiArrowRightLine, RiArrowLeftLine, RiLoader2Fill, RiCheckLine, RiCalendarCheckLine, RiDeleteBinLine, RiAddLine } from "@remixicon/react"
import { useAuth } from "@/contexts/AuthContext"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/Accordion"

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function TrainingPlanPage() {
  const { isAuthenticated } = useAuth()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestPlan, setLatestPlan] = useState<TrainingPlan | null>(null)
  
  // Form state - Step 1
  const [distanceObjective, setDistanceObjective] = useState("")
  const [paceOrTimeObjective, setPaceOrTimeObjective] = useState("")
  const [personalRecordDistance, setPersonalRecordDistance] = useState("")
  const [personalRecordTime, setPersonalRecordTime] = useState("")
  const [longestRun4Weeks, setLongestRun4Weeks] = useState("")
  const [weeklyKms, setWeeklyKms] = useState("")
  const [activities, setActivities] = useState<any[]>([])
  
  // Form state - Step 2
  const [planDurationWeeks, setPlanDurationWeeks] = useState("10")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  
  // Form state - Step 3
  const [getPreviousActivities, setGetPreviousActivities] = useState(false)
  
  // Generated plan display
  const [generatedPlan, setGeneratedPlan] = useState<TrainingPlan | null>(null)
  const [completions, setCompletions] = useState<ActivityCompletion[]>([])
  const [progress, setProgress] = useState<PlanProgress | null>(null)
  const [updatingCompletion, setUpdatingCompletion] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [athleteData, planData, activitiesData] = await Promise.all([
        stravaAPI.getAthlete().catch(() => null),
        trainingPlanAPI.getLatestPlan().catch(() => null),
        stravaAPI.getActivities(200).catch(() => []),
      ])
      setAthlete(athleteData)
      setLatestPlan(planData)
      setActivities(activitiesData)
      
      // Calculate longest run in last 4 weeks
      if (activitiesData.length > 0) {
        const fourWeeksAgo = new Date()
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
        const recentActivities = activitiesData.filter(a => 
          new Date(a.start_date) >= fourWeeksAgo
        )
        if (recentActivities.length > 0) {
          const longest = recentActivities.reduce((max, a) => 
            a.distance > max.distance ? a : max, recentActivities[0]
          )
          setLongestRun4Weeks((longest.distance / 1000).toFixed(1))
        }
      }
      
      // If a plan exists, load it directly and skip the form
      if (planData) {
        setGeneratedPlan(planData)
        setCurrentStep(4) // Show the plan directly
        // Load completions and progress
        await loadPlanData(planData.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const canProceedStep1 = () => {
    return distanceObjective.trim() !== "" && paceOrTimeObjective.trim() !== ""
  }

  const canProceedStep2 = () => {
    return planDurationWeeks !== "" && parseInt(planDurationWeeks) > 0 && selectedDays.length > 0
  }

  const canSubmit = () => {
    return canProceedStep1() && canProceedStep2()
  }

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && canProceedStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit() || !isAuthenticated) return

    try {
      setGenerating(true)
      setError(null)
      
      const request: TrainingPlanRequest = {
        distance_objective: distanceObjective,
        pace_or_time_objective: paceOrTimeObjective,
        personal_record_distance: personalRecordDistance || undefined,
        personal_record_time: personalRecordTime ? parseFloat(personalRecordTime) : undefined,
        longest_run_4weeks: longestRun4Weeks ? parseFloat(longestRun4Weeks) : undefined,
        weekly_kms: weeklyKms ? parseFloat(weeklyKms) : undefined,
        plan_duration_weeks: parseInt(planDurationWeeks),
        training_days: selectedDays,
        get_previous_activities_context: getPreviousActivities,
      }

      const result = await trainingPlanAPI.generatePlan(request)
      setGeneratedPlan(result.plan)
      setLatestPlan(result.plan)
      setCurrentStep(4) // Show results
      // Load completions and progress for the new plan
      await loadPlanData(result.plan.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate training plan')
      console.error('Error generating plan:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleStartOver = () => {
    setCurrentStep(1)
    setGeneratedPlan(null)
    setLatestPlan(null)
    setCompletions([])
    setProgress(null)
    setDistanceObjective("")
    setPaceOrTimeObjective("")
    setPersonalRecordDistance("")
    setPersonalRecordTime("")
    setLongestRun4Weeks("")
    setWeeklyKms("")
    setPlanDurationWeeks("10")
    setSelectedDays([])
    setGetPreviousActivities(false)
    setError(null)
  }

  const loadPlanData = async (planId: number) => {
    try {
      const [completionsData, progressData] = await Promise.all([
        trainingPlanAPI.getPlanCompletions(planId).catch(() => []),
        trainingPlanAPI.getPlanProgress(planId).catch(() => null),
      ])
      setCompletions(completionsData)
      setProgress(progressData)
    } catch (err) {
      console.error('Error loading plan data:', err)
    }
  }

  const isActivityCompleted = (weekNumber: number, day: string, activityIndex: number): boolean => {
    return completions.some(
      c => c.week_number === weekNumber && 
           c.day === day && 
           c.activity_index === activityIndex && 
           c.is_completed
    )
  }

  const handleActivityToggle = async (weekNumber: number, day: string, activityIndex: number) => {
    if (!generatedPlan) return
    
    const isCompleted = isActivityCompleted(weekNumber, day, activityIndex)
    const newCompleted = !isCompleted
    const key = `${weekNumber}-${day}-${activityIndex}`
    
    try {
      setUpdatingCompletion(key)
      await trainingPlanAPI.updateActivityCompletion(
        generatedPlan.id,
        weekNumber,
        day,
        activityIndex,
        newCompleted
      )
      
      // Update local state
      const updatedCompletions = [...completions]
      const existingIndex = updatedCompletions.findIndex(
        c => c.week_number === weekNumber && c.day === day && c.activity_index === activityIndex
      )
      
      if (existingIndex >= 0) {
        updatedCompletions[existingIndex] = {
          ...updatedCompletions[existingIndex],
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null
        }
      } else {
        updatedCompletions.push({
          id: 0,
          plan_id: generatedPlan.id,
          week_number: weekNumber,
          day,
          activity_index: activityIndex,
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null
        })
      }
      
      setCompletions(updatedCompletions)
      
      // Refresh progress
      const progressData = await trainingPlanAPI.getPlanProgress(generatedPlan.id)
      setProgress(progressData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity completion')
      console.error('Error updating activity completion:', err)
    } finally {
      setUpdatingCompletion(null)
    }
  }

  const handleDeletePlan = async () => {
    if (!generatedPlan || !window.confirm('Are you sure you want to delete this training plan? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      await trainingPlanAPI.deletePlan(generatedPlan.id)
      setGeneratedPlan(null)
      setLatestPlan(null)
      setCompletions([])
      setProgress(null)
      setCurrentStep(1)
      // Reset form
      setDistanceObjective("")
      setPaceOrTimeObjective("")
      setPersonalRecordDistance("")
      setPersonalRecordTime("")
      setLongestRun4Weeks("")
      setWeeklyKms("")
      setPlanDurationWeeks("10")
      setSelectedDays([])
      setGetPreviousActivities(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete training plan')
      console.error('Error deleting plan:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RiLoader2Fill className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-shrink-0 rounded-full bg-blue-500 p-3">
            <RiRunLine className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              Personalized Training Plan
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Get a custom training plan tailored to your goals and fitness level
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Step 4: Generated Plan Display */}
      {currentStep === 4 && generatedPlan && (
        <div className="space-y-6">
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
            <div className="flex items-center gap-2 mb-2">
              <RiCheckLine className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100">
                Training Plan Generated Successfully!
              </h2>
            </div>
            <p className="text-green-700 dark:text-green-300">
              Your personalized {generatedPlan.training_plan_json.training_plan.length}-week training plan is ready.
            </p>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Training Progress</h3>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {progress.completed_activities} / {progress.total_activities} activities
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress_percentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {progress.progress_percentage.toFixed(1)}% complete
              </p>
            </div>
          )}

          {/* Insights and Summary - Accordion */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <Accordion type="multiple" defaultValue={[]}>
              <AccordionItem value="insights">
                <AccordionTrigger>
                  <h3 className="text-lg font-semibold">Insights on the Objective</h3>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-gray-700 dark:text-gray-300">
                    {generatedPlan.insights.split('\n').map((line, idx) => {
                      const trimmedLine = line.trim()
                      if (!trimmedLine) return null
                      // Check if line starts with bullet point indicators
                      if (trimmedLine.match(/^[-•*]\s/) || trimmedLine.startsWith('•')) {
                        return (
                          <div key={idx} className="flex items-start mb-2">
                            <span className="mr-2">•</span>
                            <span>{trimmedLine.replace(/^[-•*]\s*/, '')}</span>
                          </div>
                        )
                      }
                      return <p key={idx} className="mb-2">{trimmedLine}</p>
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="summary">
                <AccordionTrigger>
                  <h3 className="text-lg font-semibold">Summary of the Plan</h3>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-gray-700 dark:text-gray-300">
                    {generatedPlan.summary.split('\n').map((line, idx) => {
                      const trimmedLine = line.trim()
                      if (!trimmedLine) return null
                      // Check if line starts with bullet point indicators
                      if (trimmedLine.match(/^[-•*]\s/) || trimmedLine.startsWith('•')) {
                        return (
                          <div key={idx} className="flex items-start mb-2">
                            <span className="mr-2">•</span>
                            <span>{trimmedLine.replace(/^[-•*]\s*/, '')}</span>
                          </div>
                        )
                      }
                      return <p key={idx} className="mb-2">{trimmedLine}</p>
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Training Plan */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-lg font-semibold mb-4">Training Schedule</h3>
            <div className="space-y-6">
              {generatedPlan.training_plan_json.training_plan.map((week) => (
                <div key={week.week} className="border-b border-gray-200 dark:border-gray-800 pb-6 last:border-0 last:pb-0">
                  <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                    <RiCalendarCheckLine className="h-5 w-5 text-blue-500" />
                    Week {week.week}
                  </h4>
                  <div className="space-y-2">
                    {week.days.map((day, idx) => {
                      const isCompleted = isActivityCompleted(week.week, day.day, idx)
                      const completionKey = `${week.week}-${day.day}-${idx}`
                      const isUpdating = updatingCompletion === completionKey
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex gap-4 p-3 rounded-md transition-colors ${
                            isCompleted 
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                              : 'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          <div className="flex items-start pt-1">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => handleActivityToggle(week.week, day.day, idx)}
                              disabled={isUpdating}
                              className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100 min-w-[100px] mb-1">
                              {day.day}
                            </div>
                            <div className={`font-semibold mb-1 ${
                              isCompleted 
                                ? 'text-green-800 dark:text-green-200' 
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {day.activity_type}
                              {isCompleted && (
                                <RiCheckLine className="inline-block ml-2 h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div className={`text-sm ${
                              isCompleted 
                                ? 'text-green-700 dark:text-green-300' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {day.details}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={handleStartOver} variant="secondary">
              <RiAddLine className="mr-2 h-4 w-4" />
              Start New Plan
            </Button>
            <Button onClick={handleDeletePlan} variant="destructive" disabled={loading}>
              <RiDeleteBinLine className="mr-2 h-4 w-4" />
              Delete Plan
            </Button>
          </div>
        </div>
      )}

      {/* Form Steps - Only show when not displaying an existing plan */}
      {currentStep < 4 && (
        <>
          {/* Step 1: Primary Goal & Current Fitness */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
                <h2 className="text-xl font-semibold mb-4">Step 1: Your Goals & Current Fitness</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Distance Objective <span className="text-red-500">*</span>
                    </label>
                    <Select value={distanceObjective} onValueChange={setDistanceObjective}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select distance objective" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5km">5km</SelectItem>
                        <SelectItem value="10km">10km</SelectItem>
                        <SelectItem value="15km">15km</SelectItem>
                        <SelectItem value="Half Marathon">Half Marathon</SelectItem>
                        <SelectItem value="Marathon">Marathon</SelectItem>
                        <SelectItem value="Ultra Marathon">Ultra Marathon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pace or Time Objective <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g., 4:30 min/km or Sub 40 minutes"
                      value={paceOrTimeObjective}
                      onChange={(e) => setPaceOrTimeObjective(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Personal Record Distance (Optional)
                      </label>
                      <Select value={personalRecordDistance} onValueChange={setPersonalRecordDistance}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select distance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5km">5km</SelectItem>
                          <SelectItem value="10km">10km</SelectItem>
                          <SelectItem value="15km">15km</SelectItem>
                          <SelectItem value="Half Marathon">Half Marathon</SelectItem>
                          <SelectItem value="Marathon">Marathon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Personal Record Time/Pace (Optional)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 39.5 (minutes) or 4.5 (min/km)"
                        value={personalRecordTime}
                        onChange={(e) => setPersonalRecordTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Longest Run in Last 4 Weeks (Optional)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 15.5"
                      value={longestRun4Weeks}
                      onChange={(e) => setLongestRun4Weeks(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {longestRun4Weeks ? `${longestRun4Weeks} km` : 'Automatically calculated from your activities'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Average Weekly Kilometers (Optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 30"
                      value={weeklyKms}
                      onChange={(e) => setWeeklyKms(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleNext} disabled={!canProceedStep1()}>
                    Next <RiArrowRightLine className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Plan Duration & Training Days */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
                <h2 className="text-xl font-semibold mb-4">Step 2: Plan Structure</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Plan Duration (weeks) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="52"
                      value={planDurationWeeks}
                      onChange={(e) => setPlanDurationWeeks(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Training Days <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Select the days you want to train on
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-4 py-2 rounded-md border transition-colors ${
                            selectedDays.includes(day)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    {selectedDays.length > 0 && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Selected: {selectedDays.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <Button variant="secondary" onClick={handleBack}>
                    <RiArrowLeftLine className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleNext} disabled={!canProceedStep2()}>
                    Next <RiArrowRightLine className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Historical Context */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
                <h2 className="text-xl font-semibold mb-4">Step 3: Additional Context</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="previous-activities"
                      checked={getPreviousActivities}
                      onChange={(e) => setGetPreviousActivities(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="previous-activities" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Include previous activities from the last 4 weeks for context
                    </label>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <h3 className="text-sm font-semibold mb-2">Plan Summary</h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li><strong>Goal:</strong> {distanceObjective} - {paceOrTimeObjective}</li>
                    {personalRecordDistance && personalRecordTime && (
                      <li><strong>PR:</strong> {personalRecordDistance} in {personalRecordTime}</li>
                    )}
                    {longestRun4Weeks && <li><strong>Longest Run (4 weeks):</strong> {longestRun4Weeks} km</li>}
                    {weeklyKms && <li><strong>Weekly Volume:</strong> {weeklyKms} km</li>}
                    <li><strong>Duration:</strong> {planDurationWeeks} weeks</li>
                    <li><strong>Training Days:</strong> {selectedDays.join(", ")}</li>
                  </ul>
                </div>

                <div className="mt-6 flex justify-between">
                  <Button variant="secondary" onClick={handleBack}>
                    <RiArrowLeftLine className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!canSubmit() || generating || !isAuthenticated}
                    isLoading={generating}
                    loadingText="Generating Plan..."
                  >
                    {generating ? (
                      <>
                        <RiLoader2Fill className="mr-2 h-4 w-4 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        Generate Plan <RiCheckLine className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

