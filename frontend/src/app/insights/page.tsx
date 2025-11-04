"use client"

import { useEffect, useState } from "react"
import { analysisAPI, stravaAPI, type TrainingAnalysis, type Athlete } from "@/lib/api"
import { Button } from "@/components/Button"
import { RiSparklingFill, RiLightbulbFlashLine, RiRunLine, RiHistoryLine, RiRefreshLine } from "@remixicon/react"
import { useAuth } from "@/contexts/AuthContext"

export default function InsightsPage() {
  const { isAuthenticated } = useAuth()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [latestAnalysis, setLatestAnalysis] = useState<TrainingAnalysis | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<TrainingAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [athleteData, analysisData, historyData] = await Promise.all([
        stravaAPI.getAthlete().catch(() => null),
        analysisAPI.getLatestAnalysis().catch(() => null),
        analysisAPI.getAnalysisHistory(5).catch(() => []),
      ])
      setAthlete(athleteData)
      setLatestAnalysis(analysisData)
      setAnalysisHistory(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAnalysis = async () => {
    try {
      setGeneratingAnalysis(true)
      setError(null)
      const result = await analysisAPI.generateAnalysis(30) // Analyze last 30 days
      setLatestAnalysis(result.analysis)
      // Refresh history
      const historyData = await analysisAPI.getAnalysisHistory(5)
      setAnalysisHistory(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis')
      console.error('Error generating analysis:', err)
    } finally {
      setGeneratingAnalysis(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RiSparklingFill className="mx-auto mb-4 h-12 w-12 animate-pulse text-purple-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading insights...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-full bg-purple-500 p-3">
              <RiSparklingFill className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                AI Training Insights
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {athlete?.firstname ? `${athlete.firstname}'s personalized coaching insights` : 'Personalized coaching powered by AI'}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleGenerateAnalysis} 
            disabled={generatingAnalysis || !isAuthenticated}
            title={!isAuthenticated ? "Please sign in to generate insights" : ""}
          >
            <RiSparklingFill className={`mr-2 h-4 w-4 ${generatingAnalysis ? 'animate-spin' : ''}`} />
            {generatingAnalysis ? 'Analyzing...' : 'Generate New Insights'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Latest Analysis */}
      {latestAnalysis ? (
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              Latest Analysis
            </h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <RiHistoryLine className="h-4 w-4" />
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {/* Summary Card */}
          <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 dark:from-purple-950/30 dark:to-purple-900/20 dark:border-purple-600">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-full bg-purple-500 p-3">
                <RiSparklingFill className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                  Summary
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {latestAnalysis.summary}
                </p>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  📊 Analyzed {latestAnalysis.activities_analyzed_count} activities from{' '}
                  {new Date(latestAnalysis.analysis_period_start).toLocaleDateString()} to{' '}
                  {new Date(latestAnalysis.analysis_period_end).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Training Load Insight */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <RiRunLine className="h-5 w-5 text-orange-500" />
              Training Load Analysis
            </h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {latestAnalysis.training_load_insight}
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <RiLightbulbFlashLine className="h-5 w-5 text-yellow-500" />
              Tips for Your Next Runs
            </h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {latestAnalysis.tips}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Analysis generated on {new Date(latestAnalysis.created_at).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-purple-300 p-12 text-center dark:border-purple-700">
          <RiSparklingFill className="mx-auto mb-4 h-16 w-16 text-purple-400" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-50">
            No AI Insights Yet
          </h3>
          <p className="mb-6 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Generate your first AI-powered training analysis to get personalized insights, 
            training load analysis, and actionable tips for your next runs.
          </p>
          <Button onClick={handleGenerateAnalysis} disabled={generatingAnalysis || !isAuthenticated} title={!isAuthenticated ? "Please sign in to generate insights" : ""}>
            <RiSparklingFill className={`mr-2 h-4 w-4 ${generatingAnalysis ? 'animate-spin' : ''}`} />
            {generatingAnalysis ? 'Analyzing...' : 'Generate Insights'}
          </Button>
        </div>
      )}

      {/* Analysis History */}
      {showHistory && analysisHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Previous Analyses
          </h2>
          <div className="space-y-4">
            {analysisHistory.map((analysis) => (
              <div
                key={analysis.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:border-purple-300 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:hover:border-purple-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RiHistoryLine className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {new Date(analysis.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {analysis.activities_analyzed_count} activities
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {analysis.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="mt-12 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
          How AI Insights Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <RiRunLine className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-50">Data Collection</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyzes your last 30 days of activities including distance, pace, heart rate, and elevation data.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <RiSparklingFill className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-50">AI Analysis</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced AI models act as your virtual running coach, analyzing patterns and progression.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <RiLightbulbFlashLine className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-50">Actionable Tips</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get personalized recommendations for training load, recovery, and performance improvement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

