import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get total users count
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const totalUsers = authData.total || 0

    // Count active users (not banned)
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    const activeUsers = allUsers?.users.filter(u => {
      const bannedUntil = u.banned_until
      return !bannedUntil || new Date(bannedUntil) <= new Date()
    }).length || 0

    // Count new users this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newUsersThisWeek = allUsers?.users.filter(u =>
      new Date(u.created_at) >= weekAgo
    ).length || 0

    // Get total focus time (from sessions where mode='work')
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('duration')
      .eq('mode', 'work')

    const totalFocusMinutes = sessions?.reduce((sum, s) => sum + Math.floor((s.duration || 0) / 60), 0) || 0

    // Get total tasks completed
    const { count: totalTasksCompleted } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')

    // Get total active streaks
    const { data: streaks } = await supabaseAdmin
      .from('streaks')
      .select('current')
      .gt('current', 0)

    const activeStreaks = streaks?.length || 0
    const longestStreak = streaks?.reduce((max, s) => Math.max(max, s.current || 0), 0) || 0

    // Get recent activity (last 7 days sessions count per day)
    const { data: recentSessions } = await supabaseAdmin
      .from('sessions')
      .select('created_at')
      .gte('created_at', weekAgo.toISOString())
      .eq('mode', 'work')

    // Group by day
    const activityByDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      activityByDay[key] = 0
    }

    recentSessions?.forEach(s => {
      const day = s.created_at.split('T')[0]
      if (activityByDay[day] !== undefined) {
        activityByDay[day]++
      }
    })

    const activityChart = Object.entries(activityByDay).map(([date, count]) => ({
      date,
      sessions: count,
    }))

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        newUsersThisWeek,
        totalFocusMinutes,
        totalTasksCompleted: totalTasksCompleted || 0,
        activeStreaks,
        longestStreak,
      },
      activityChart,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
