'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

type FeedbackType = 'all' | 'feature' | 'bug' | 'question' | 'other'

interface Feedback {
  id: string
  user_id: string | null
  type: string
  message: string
  rating: number | null
  name: string | null
  email: string | null
  created_at: string
  user_name: string
  user_avatar: string | null
}

interface FeedbackResponse {
  feedbacks: Feedback[]
  total: number
  page: number
  limit: number
}

const TYPES: { value: FeedbackType; label: string; icon: typeof MessageSquare }[] = [
  { value: 'all', label: 'All', icon: MessageSquare },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb },
  { value: 'bug', label: 'Bug Report', icon: Bug },
  { value: 'question', label: 'Question', icon: HelpCircle },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeColor(type: string) {
  switch (type) {
    case 'feature':
      return 'default'
    case 'bug':
      return 'destructive'
    case 'question':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'feature':
      return <Lightbulb className="h-4 w-4" />
    case 'bug':
      return <Bug className="h-4 w-4" />
    case 'question':
      return <HelpCircle className="h-4 w-4" />
    default:
      return <MoreHorizontal className="h-4 w-4" />
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<FeedbackType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const limit = 10

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        type,
      })
      const res = await fetch(`/api/admin/feedback?${params}`)
      if (res.ok) {
        const data: FeedbackResponse = await res.json()
        setFeedbacks(data.feedbacks)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, type])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  useEffect(() => {
    setCurrentPage(1)
  }, [type])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      })
      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f.id !== deleteId))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Error deleting feedback:', error)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={type} onValueChange={(v) => setType(v as FeedbackType)}>
          <TabsList>
            {TYPES.map(t => {
              const Icon = t.icon
              return (
                <TabsTrigger key={t.value} value={t.value} className="gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        <span className="text-sm text-muted-foreground">
          {total} feedback{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No feedback found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {feedbacks.map((feedback) => (
            <Card key={feedback.id} className="group">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    {feedback.user_avatar && <AvatarImage src={feedback.user_avatar} />}
                    <AvatarFallback className="text-xs">{getInitials(feedback.user_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{feedback.user_name}</span>
                      {feedback.email && (
                        <span className="text-xs text-muted-foreground">({feedback.email})</span>
                      )}
                      <Badge variant={getTypeColor(feedback.type)} className="gap-1 text-xs px-1.5 py-0">
                        {feedback.type}
                      </Badge>
                      {feedback.rating && (
                        <div className="flex items-center">
                          {[...Array(feedback.rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(feedback.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(feedback.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && feedbacks.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
