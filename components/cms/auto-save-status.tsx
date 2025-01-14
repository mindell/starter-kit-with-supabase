import { useEffect, useState } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutoSaveStatusProps {
  lastSaved: Date | null
  saving: boolean
  error: string | null
  className?: string
}

export function AutoSaveStatus({
  lastSaved,
  saving,
  error,
  className,
}: AutoSaveStatusProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    if (!lastSaved) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diff = now.getTime() - lastSaved.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)

      if (minutes > 0) {
        setTimeAgo(`${minutes}m ago`)
      } else {
        setTimeAgo(`${seconds}s ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000)
    return () => clearInterval(interval)
  }, [lastSaved])

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Auto-saving...</span>
        </>
      ) : error ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Error saving: {error}</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span>Saved {timeAgo}</span>
        </>
      ) : null}
    </div>
  )
}
