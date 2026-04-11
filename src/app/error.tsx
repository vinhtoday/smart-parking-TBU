'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Đã xảy ra lỗi</h1>
        <p className="text-muted-foreground">
          {error.message || 'Ứng dụng gặp lỗi không xác định. Vui lòng thử lại.'}
        </p>
        <Button onClick={reset} variant="outline">
          Thử lại
        </Button>
      </div>
    </div>
  )
}
