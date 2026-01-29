'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Flame,
  Calendar,
  Mail,
  Target,
  Ban,
  UserCheck,
  Loader2,
} from 'lucide-react'

interface UserStats {
  total_sessions: number
  total_tasks: number
  tasks_completed: number
  current_streak: number
  longest_streak: number
  total_focus_minutes: number
}

interface UserDetail {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  stats: UserStats
}

interface Session {
  id: string
  duration: number
  mode: string
  created_at: string
  task_id: string | null
}

interface Task {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

function getStatusColor(status: string) {
  switch (status) {
    case 'done':
      return 'default'
    case 'doing':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getModeColor(mode: string) {
  switch (mode) {
    case 'work':
      return 'default'
    case 'shortBreak':
      return 'secondary'
    case 'longBreak':
      return 'outline'
    default:
      return 'outline'
  }
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`)
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setSessions(data.sessions || [])
          setTasks(data.tasks || [])
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  const handleToggleStatus = async () => {
    if (!user) return
    setActionLoading(true)

    try {
      const action = user.is_banned ? 'enable' : 'disable'
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setUser(prev => prev ? { ...prev, is_banned: !prev.is_banned } : null)
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Focus Time', value: formatTime(user.stats.total_focus_minutes), icon: Clock },
    { label: 'Tasks Completed', value: `${user.stats.tasks_completed}/${user.stats.total_tasks}`, icon: CheckCircle },
    { label: 'Current Streak', value: `${user.stats.current_streak} days`, icon: Flame },
    { label: 'Longest Streak', value: `${user.stats.longest_streak} days`, icon: Target },
  ]

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/users')}>
          <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <Button
          variant={user.is_banned ? 'default' : 'destructive'}
          size="sm"
          onClick={handleToggleStatus}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" />
          ) : user.is_banned ? (
            <UserCheck className="mr-1 sm:mr-2 h-4 w-4" />
          ) : (
            <Ban className="mr-1 sm:mr-2 h-4 w-4" />
          )}
          <span className="hidden sm:inline">{user.is_banned ? 'Enable User' : 'Disable User'}</span>
          <span className="sm:hidden">{user.is_banned ? 'Enable' : 'Disable'}</span>
        </Button>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-xl sm:text-2xl">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-bold">{user.name || 'No name'}</h2>
                <Badge variant={user.is_banned ? 'destructive' : 'default'}>
                  {user.is_banned ? 'Disabled' : 'Active'}
                </Badge>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground text-sm">
                <Mail className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Joined {formatDate(user.created_at)}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span>Last active {formatDate(user.last_sign_in_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sessions & Tasks Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">
            Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({tasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Focus Sessions</CardTitle>
              <CardDescription>Recent sessions (last 50)</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No sessions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Date</TableHead>
                      <TableHead className="text-xs sm:text-sm">Mode</TableHead>
                      <TableHead className="text-xs sm:text-sm">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm">
                          {formatDate(session.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getModeColor(session.mode)} className="text-xs">
                            {session.mode === 'work' ? 'Focus' : session.mode === 'shortBreak' ? 'Short' : 'Long'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {formatDuration(session.duration)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Recent tasks (last 50)</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No tasks yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Title</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Created</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[150px] sm:max-w-none truncate">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(task.status)} className="text-xs">
                            {task.status === 'done' ? 'Done' : task.status === 'doing' ? 'Doing' : 'To Do'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                          {formatDate(task.created_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                          {formatDate(task.updated_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
