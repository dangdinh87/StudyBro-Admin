'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Trophy,
  Clock,
  Target,
  Flame,
  Medal,
  Crown,
  CheckCircle,
  Loader2,
} from 'lucide-react'

type Period = 'today' | 'week' | 'month' | 'all'
type Metric = 'focus_time' | 'tasks' | 'streak'

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string | null
  avatar_url: string | null
  focus_time_minutes: number
  tasks_completed: number
  current_streak: number
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  period: Period
  metric: Metric
  total: number
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

const METRICS: { value: Metric; label: string; icon: typeof Clock }[] = [
  { value: 'focus_time', label: 'Focus Time', icon: Clock },
  { value: 'tasks', label: 'Tasks Done', icon: CheckCircle },
  { value: 'streak', label: 'Streak', icon: Flame },
]

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
  return <span className="text-muted-foreground font-mono">{rank}</span>
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatValue(entry: LeaderboardEntry, metric: Metric) {
  switch (metric) {
    case 'focus_time':
      return formatTime(entry.focus_time_minutes)
    case 'tasks':
      return `${entry.tasks_completed} tasks`
    case 'streak':
      return `${entry.current_streak} days`
  }
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('focus_time')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leaderboard?period=${period}&metric=${metric}`)
      if (res.ok) {
        const data: LeaderboardResponse = await res.json()
        setEntries(data.entries || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }, [period, metric])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, period, metric }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leaderboard-${period}-${metric}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  const topThree = entries.slice(0, 3)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Period Filter */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {PERIODS.map(p => (
              <TabsTrigger key={p.value} value={p.value} className="text-xs sm:text-sm">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Export Button */}
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || entries.length === 0}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Metric Tabs */}
      <div className="flex gap-2">
        {METRICS.map(m => {
          const Icon = m.icon
          return (
            <Button
              key={m.value}
              variant={metric === m.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMetric(m.value)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{m.label}</span>
            </Button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className={i !== 1 ? 'mt-8' : ''}>
                <CardContent className="pt-6 text-center">
                  <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-4 w-24 mx-auto mb-2" />
                  <Skeleton className="h-8 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No data available for this period.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Podium - Top 3 */}
          {topThree.length >= 3 && (
            <div className="grid grid-cols-3 gap-4">
              {/* 2nd Place */}
              <Card className="mt-8">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
                      {topThree[1]?.avatar_url && <AvatarImage src={topThree[1].avatar_url} />}
                      <AvatarFallback>{getInitials(topThree[1]?.name)}</AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-gray-400">
                      2
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm truncate">{topThree[1]?.name || 'Unknown'}</h3>
                  <p className="text-lg font-bold text-muted-foreground mt-1">
                    {formatValue(topThree[1], metric)}
                  </p>
                </CardContent>
              </Card>

              {/* 1st Place */}
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div className="relative inline-block mb-3">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-yellow-500/30">
                      {topThree[0]?.avatar_url && <AvatarImage src={topThree[0].avatar_url} />}
                      <AvatarFallback className="text-lg">{getInitials(topThree[0]?.name)}</AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-yellow-500">
                      1
                    </Badge>
                  </div>
                  <h3 className="font-semibold truncate">{topThree[0]?.name || 'Unknown'}</h3>
                  <p className="text-2xl font-bold text-yellow-500 mt-1">
                    {formatValue(topThree[0], metric)}
                  </p>
                </CardContent>
              </Card>

              {/* 3rd Place */}
              <Card className="mt-8">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
                      {topThree[2]?.avatar_url && <AvatarImage src={topThree[2].avatar_url} />}
                      <AvatarFallback>{getInitials(topThree[2]?.name)}</AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-amber-600">
                      3
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm truncate">{topThree[2]?.name || 'Unknown'}</h3>
                  <p className="text-lg font-bold text-muted-foreground mt-1">
                    {formatValue(topThree[2], metric)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Full Rankings Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Full Rankings
                </CardTitle>
                <span className="text-sm text-muted-foreground">{entries.length} of {total} users</span>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Focus Time</TableHead>
                    <TableHead className="hidden md:table-cell">Tasks</TableHead>
                    <TableHead className="hidden lg:table-cell">Streak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.user_id}>
                      <TableCell>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {getRankIcon(entry.rank)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                            <AvatarFallback className="text-xs">{getInitials(entry.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{entry.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={entry.rank === 1 && metric === 'focus_time' ? 'font-bold text-primary' : ''}>
                          {formatTime(entry.focus_time_minutes)}
                        </span>
                      </TableCell>
                      <TableCell className={`hidden md:table-cell ${entry.rank === 1 && metric === 'tasks' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        {entry.tasks_completed}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className={`font-medium ${entry.rank === 1 && metric === 'streak' ? 'text-orange-500' : ''}`}>
                            {entry.current_streak}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
