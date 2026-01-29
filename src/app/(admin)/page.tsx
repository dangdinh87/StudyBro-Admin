'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  CheckCircle,
  Flame,
  Trophy,
  TrendingUp,
} from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  newUsersThisWeek: number
  totalFocusMinutes: number
  totalTasksCompleted: number
  activeStreaks: number
  longestStreak: number
}

interface ActivityData {
  date: string
  sessions: number
}

interface DashboardResponse {
  stats: DashboardStats
  activityChart: ActivityData[]
}

function formatFocusTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k hrs`
  }
  return `${hours} hrs`
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activityChart, setActivityChart] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/dashboard')
        if (res.ok) {
          const data: DashboardResponse = await res.json()
          setStats(data.stats)
          setActivityChart(data.activityChart)
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: 'Registered accounts',
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      description: 'Not banned',
    },
    {
      title: 'New This Week',
      value: stats?.newUsersThisWeek || 0,
      icon: UserPlus,
      description: 'Last 7 days',
    },
    {
      title: 'Total Focus Time',
      value: formatFocusTime(stats?.totalFocusMinutes || 0),
      icon: Clock,
      description: 'All users combined',
      isFormatted: true,
    },
    {
      title: 'Tasks Completed',
      value: formatNumber(stats?.totalTasksCompleted || 0),
      icon: CheckCircle,
      description: 'All time',
      isFormatted: true,
    },
    {
      title: 'Active Streaks',
      value: stats?.activeStreaks || 0,
      icon: Flame,
      description: 'Users with streak > 0',
    },
  ]

  const maxSessions = Math.max(...activityChart.map(d => d.sessions), 1)

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stat.isFormatted ? stat.value : formatNumber(stat.value as number)}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Activity Chart & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Focus sessions in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-end gap-2 h-32">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="flex-1 h-full" />
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {activityChart.map((day) => {
                  const height = maxSessions > 0 ? (day.sessions / maxSessions) * 100 : 0
                  const date = new Date(day.date)
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day.sessions} sessions`}
                      />
                      <span className="text-xs text-muted-foreground">{dayName}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Highlights
            </CardTitle>
            <CardDescription>Platform achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Flame className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Longest Streak</p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.longestStreak || 0} days
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Focus</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.floor((stats?.totalFocusMinutes || 0) / 60)}h {(stats?.totalFocusMinutes || 0) % 60}m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tasks Done</p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.totalTasksCompleted || 0} tasks
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
