import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client with service role key - bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Types for database tables
export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  task_id: string | null
  duration: number
  mode: 'work' | 'shortBreak' | 'longBreak'
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  status: 'todo' | 'doing' | 'done'
  created_at: string
}

export interface Streak {
  id: string
  user_id: string
  current: number
  longest: number
}

export interface UserWithProfile {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  profile: Profile | null
}

export interface LeaderboardEntry {
  user_id: string
  name: string | null
  avatar_url: string | null
  focus_time: number // in minutes
  tasks_completed: number
  current_streak: number
}
