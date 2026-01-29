import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  try {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Get user sessions (recent 50)
    const { data: sessions, count: sessionsCount } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Get user tasks (recent 50)
    const { data: tasks, count: tasksCount } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: streak } = await supabaseAdmin
      .from('streaks')
      .select('current, longest')
      .eq('user_id', userId)
      .single()

    // Calculate total focus time
    const totalFocusMinutes = sessions
      ?.filter(s => s.mode === 'work')
      .reduce((sum, s) => sum + Math.floor((s.duration || 0) / 60), 0) || 0

    const bannedUntil = authUser.user.banned_until
    const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        name: profile?.name || authUser.user.user_metadata?.full_name || null,
        avatar_url: profile?.avatar_url || authUser.user.user_metadata?.avatar_url || null,
        created_at: authUser.user.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        banned_until: bannedUntil,
        is_banned: isBanned,
        profile,
        stats: {
          total_sessions: sessionsCount || 0,
          total_tasks: tasksCount || 0,
          tasks_completed: tasks?.filter(t => t.status === 'done').length || 0,
          current_streak: streak?.current || 0,
          longest_streak: streak?.longest || 0,
          total_focus_minutes: totalFocusMinutes,
        },
      },
      sessions: sessions || [],
      tasks: tasks || [],
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Enable/Disable user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'disable') {
      // Ban until year 2099
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h', // ~100 years
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'User disabled' })
    }

    if (action === 'enable') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'User enabled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
