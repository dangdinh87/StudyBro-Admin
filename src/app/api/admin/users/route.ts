import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Verify admin session
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // Fetch users from auth.users with pagination
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Get user IDs to fetch profiles
    const userIds = authData.users.map(u => u.id)

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Profiles error:', profilesError)
    }

    // Create a map of profiles by user ID
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Combine auth users with profiles
    let users = authData.users.map(user => {
      const profile = profilesMap.get(user.id)
      const bannedUntil = user.banned_until
      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()

      return {
        id: user.id,
        email: user.email || '',
        name: profile?.name || user.user_metadata?.full_name || null,
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        banned_until: bannedUntil,
        is_banned: isBanned,
      }
    })

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase()
      users = users.filter(
        u =>
          u.email.toLowerCase().includes(searchLower) ||
          (u.name && u.name.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json({
      users,
      total: authData.total || users.length,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
