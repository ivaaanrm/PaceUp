"use client"

import { useEffect, useState } from "react"
import { trainingPlanAPI, stravaAPI, type TrainingPlan, type TrainingPlanRequest, type Athlete } from "@/lib/api"
import { Button } from "@/components/Button"
import { Input } from "@/components/Input"
import { RiRunLine, RiArrowRightLine, RiArrowLeftLine, RiLoader2Fill, RiCheckLine, RiCalendarCheckLine, RiDeleteBinLine, RiAddLine } from "@remixicon/react"
import { useAuth } from "@/contexts/AuthContext"

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
  const [personalRecord, setPersonalRecord] = useState("")
  const [weeklyKms, setWeeklyKms] = useState("")
  
  // Form state - Step 2
  const [planDurationWeeks, setPlanDurationWeeks] = useState("10")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  
  // Form state - Step 3
  const [getPreviousActivities, setGetPreviousActivities] = useState(false)
  
  // Generated plan display
  const [generatedPlan, setGeneratedPlan] = useState<TrainingPlan | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [athleteData, planData] = await Promise.all([
        stravaAPI.getAthlete().catch(() => null),
        trainingPlanAPI.getLatestPlan().catch(() => null),
      ])
      setAthlete(athleteData)
      setLatestPlan(planData)
      // If a plan exists, load it directly and skip the form
      if (planData) {
        setGeneratedPlan(planData)
        setCurrentStep(4) // Show the plan directly
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
        personal_record: personalRecord || undefined,
        weekly_kms: weeklyKms ? parseFloat(weeklyKms) : undefined,
        plan_duration_weeks: parseInt(planDurationWeeks),
        training_days: selectedDays,
        get_previous_activities_context: getPreviousActivities,
      }

      const result = await trainingPlanAPI.generatePlan(request)
      setGeneratedPlan(result.plan)
      setLatestPlan(result.plan)
      setCurrentStep(4) // Show results
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
    setDistanceObjective("")
    setPaceOrTimeObjective("")
    setPersonalRecord("")
    setWeeklyKms("")
    setPlanDurationWeeks("10")
    setSelectedDays([])
    setGetPreviousActivities(false)
    setError(null)
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
      setCurrentStep(1)
      // Reset form
      setDistanceObjective("")
      setPaceOrTimeObjective("")
      setPersonalRecord("")
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

          {/* Insights */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-lg font-semibold mb-3">Insights on the Objective</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {generatedPlan.insights}
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-lg font-semibold mb-3">Summary of the Plan</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {generatedPlan.summary}
            </p>
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
                    {week.days.map((day, idx) => (
                      <div key={idx} className="flex gap-4 p-3 rounded-md bg-gray-50 dark:bg-gray-900">
                        <div className="font-medium text-gray-900 dark:text-gray-100 min-w-[100px]">
                          {day.day}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            {day.activity_type}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {day.details}
                          </div>
                        </div>
                      </div>
                    ))}
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
                    <Input
                      placeholder="e.g., 10km, Half Marathon, Marathon"
                      value={distanceObjective}
                      onChange={(e) => setDistanceObjective(e.target.value)}
                    />
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Personal Record (Optional)
                    </label>
                    <Input
                      placeholder="e.g., 39:42 in 10km"
                      value={personalRecord}
                      onChange={(e) => setPersonalRecord(e.target.value)}
                    />
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
                    {personalRecord && <li><strong>PR:</strong> {personalRecord}</li>}
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

