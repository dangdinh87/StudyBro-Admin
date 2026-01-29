import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { stringify } from 'csv-stringify/sync'

type Period = 'today' | 'week' | 'month' | 'all'
type Metric = 'focus_time' | 'tasks' | 'streak'

function getDateRange(period: Period): { start: Date | null } {
  const now = new Date()

  switch (period) {
    case 'today':
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      return { start: todayStart }
    case 'week':
      const weekStart = new Date(now)
      // Get start of week (Sunday)
      const dayOfWeek = weekStart.getDay()
      weekStart.setDate(now.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)
      return { start: weekStart }
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: monthStart }
    case 'all':
    default:
      return { start: null }
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const period = (searchParams.get('period') || 'all') as Period
  const metric = (searchParams.get('metric') || 'focus_time') as Metric
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const { start } = getDateRange(period)

    // Get all profiles first
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url')

    if (profilesError) {
      console.error('Profiles error:', profilesError)
    }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Build sessions query for focus time
    // Note: sessions.user_id is TEXT, not UUID
    let sessionsQuery = supabaseAdmin
      .from('sessions')
      .select('user_id, duration')
      .eq('mode', 'work')

    if (start) {
      sessionsQuery = sessionsQuery.gte('created_at', start.toISOString())
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery

    if (sessionsError) {
      console.error('Sessions error:', sessionsError)
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Aggregate focus time by user (duration is in seconds)
    const focusTimeMap = new Map<string, number>()
    sessions?.forEach(s => {
      const current = focusTimeMap.get(s.user_id) || 0
      focusTimeMap.set(s.user_id, current + (s.duration || 0))
    })

    // Build tasks query for completed tasks
    // Note: tasks.user_id is TEXT, not UUID
    let tasksQuery = supabaseAdmin
      .from('tasks')
      .select('user_id')
      .eq('status', 'done')

    if (start) {
      tasksQuery = tasksQuery.gte('updated_at', start.toISOString())
    }

    const { data: tasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      console.error('Tasks error:', tasksError)
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    // Aggregate tasks by user
    const tasksMap = new Map<string, number>()
    tasks?.forEach(t => {
      const current = tasksMap.get(t.user_id) || 0
      tasksMap.set(t.user_id, current + 1)
    })

    // Get streaks (no time filter - always current state)
    // Note: streaks.user_id is UUID
    const { data: streaks, error: streaksError } = await supabaseAdmin
      .from('streaks')
      .select('user_id, current')

    if (streaksError) {
      console.error('Streaks error:', streaksError)
    }

    const streakMap = new Map<string, number>()
    streaks?.forEach(s => {
      streakMap.set(s.user_id, s.current || 0)
    })

    // Combine all user IDs from all data sources
    const userIds = new Set([
      ...focusTimeMap.keys(),
      ...tasksMap.keys(),
      ...streakMap.keys(),
    ])

    // Build entries
    let entries = Array.from(userIds).map(userId => {
      const profile = profilesMap.get(userId)
      return {
        user_id: userId,
        name: profile?.name || null,
        avatar_url: profile?.avatar_url || null,
        focus_time_minutes: Math.round((focusTimeMap.get(userId) || 0) / 60),
        tasks_completed: tasksMap.get(userId) || 0,
        current_streak: streakMap.get(userId) || 0,
        rank: 0,
      }
    })

    // Sort by selected metric
    entries.sort((a, b) => {
      switch (metric) {
        case 'focus_time':
          return b.focus_time_minutes - a.focus_time_minutes
        case 'tasks':
          return b.tasks_completed - a.tasks_completed
        case 'streak':
          return b.current_streak - a.current_streak
        default:
          return 0
      }
    })

    // Assign ranks (handle ties with same rank)
    let currentRank = 1
    let previousValue: number | null = null

    entries = entries.map((entry, index) => {
      const currentValue = metric === 'focus_time'
        ? entry.focus_time_minutes
        : metric === 'tasks'
          ? entry.tasks_completed
          : entry.current_streak

      if (previousValue !== null && currentValue !== previousValue) {
        currentRank = index + 1
      }
      previousValue = currentValue

      return { ...entry, rank: currentRank }
    })

    const total = entries.length
    const paginatedEntries = entries.slice(offset, offset + limit)

    return NextResponse.json({
      entries: paginatedEntries,
      period,
      metric,
      total,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Export leaderboard as CSV
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entries, period, metric } = await request.json()

    // Transform to CSV format
    const csvData = entries.map((entry: {
      rank: number
      name: string | null
      focus_time_minutes: number
      tasks_completed: number
      current_streak: number
    }) => ({
      Rank: entry.rank,
      Name: entry.name || 'Unknown',
      'Focus Time (min)': entry.focus_time_minutes,
      'Tasks Completed': entry.tasks_completed,
      'Current Streak': entry.current_streak,
    }))

    const csv = stringify(csvData, {
      header: true,
      columns: ['Rank', 'Name', 'Focus Time (min)', 'Tasks Completed', 'Current Streak'],
    })

    const filename = `leaderboard-${period}-${metric}-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
