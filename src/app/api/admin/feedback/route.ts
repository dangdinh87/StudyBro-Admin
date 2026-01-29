import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const type = searchParams.get('type')

  try {
    let query = supabaseAdmin
      .from('feedbacks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data: feedbacks, count, error } = await query

    if (error) {
      console.error('Error fetching feedbacks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user info for feedbacks with user_id
    const feedbacksWithUsers = await Promise.all(
      (feedbacks || []).map(async (feedback) => {
        if (feedback.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', feedback.user_id)
            .single()

          return {
            ...feedback,
            user_name: profile?.name || feedback.name,
            user_avatar: profile?.avatar_url,
          }
        }
        return {
          ...feedback,
          user_name: feedback.name || 'Anonymous',
          user_avatar: null,
        }
      })
    )

    return NextResponse.json({
      feedbacks: feedbacksWithUsers,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a feedback
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await request.json()

    const { error } = await supabaseAdmin
      .from('feedbacks')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
