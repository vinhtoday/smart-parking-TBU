'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sun, Moon, RefreshCw, Lock, User, ShieldCheck } from 'lucide-react'

/* =============================================
   TEXT CAPTCHA GENERATOR
   ============================================= */
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const CAPTCHA_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2980b9']

function generateCaptchaText(length = 5): string {
  let text = ''
  for (let i = 0; i < length; i++) {
    text += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
  }
  return text
}

function drawCaptcha(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height

  // Background
  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(0, 0, w, h)

  // Subtle gradient overlay
  const bgGrad = ctx.createLinearGradient(0, 0, w, h)
  bgGrad.addColorStop(0, 'rgba(148, 163, 184, 0.08)')
  bgGrad.addColorStop(1, 'rgba(100, 116, 139, 0.12)')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // Noise dots
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 150}, ${Math.random() * 150}, ${Math.random() * 150}, 0.3)`
    ctx.beginPath()
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Noise lines
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(${Math.random() * 180}, ${Math.random() * 180}, ${Math.random() * 180}, 0.25)`
    ctx.lineWidth = Math.random() * 1.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(Math.random() * w, Math.random() * h)
    // Bezier curve for more organic lines
    ctx.bezierCurveTo(
      Math.random() * w, Math.random() * h,
      Math.random() * w, Math.random() * h,
      Math.random() * w, Math.random() * h,
    )
    ctx.stroke()
  }

  // Draw each character
  const charSpacing = w / (text.length + 1.2)
  const baselineY = h / 2

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const x = charSpacing * (i + 1)
    const rotation = (Math.random() - 0.5) * 0.52 // ±15 degrees
    const yOffset = (Math.random() - 0.5) * 8
    const fontSize = 24 + Math.random() * 6

    ctx.save()
    ctx.translate(x, baselineY + yOffset)
    ctx.rotate(rotation)

    ctx.font = `bold ${fontSize}px 'Courier New', monospace`
    ctx.fillStyle = CAPTCHA_COLORS[Math.floor(Math.random() * CAPTCHA_COLORS.length)]
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Slight text shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.1)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1

    ctx.fillText(char, 0, 0)
    ctx.restore()
  }

  // Wavy baseline
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < w; x++) {
    const y = baselineY + 8 + Math.sin(x * 0.05 + Math.random()) * 2
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/* =============================================
   LOGIN PAGE COMPONENT
   ============================================= */
export default function LoginPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaText, setCaptchaText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawCaptchaToCanvas = useCallback((text: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawCaptcha(canvas, text)
  }, [])

  useEffect(() => {
    setMounted(true)
    const text = generateCaptchaText()
    setCaptchaText(text)
    // Small delay to ensure canvas is rendered
    const timer = setTimeout(() => {
      drawCaptchaToCanvas(text)
    }, 50)
    return () => clearTimeout(timer)
  }, [drawCaptchaToCanvas])

  const refreshCaptcha = useCallback(() => {
    const text = generateCaptchaText()
    setCaptchaText(text)
    setCaptchaInput('')
    setTimeout(() => {
      drawCaptchaToCanvas(text)
    }, 10)
  }, [drawCaptchaToCanvas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captchaText) {
      setError('Mã xác thực chưa sẵn sàng')
      return
    }

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    if (!captchaInput.trim()) {
      setError('Vui lòng nhập mã xác thực')
      return
    }

    // Client-side pre-verify
    if (captchaInput.trim().toLowerCase() !== captchaText.toLowerCase()) {
      setError('Mã xác thực không chính xác')
      refreshCaptcha()
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        username: username.trim(),
        password,
        captcha: captchaText,
        captchaAnswer: captchaInput,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        refreshCaptcha()
      } else {
        window.location.href = '/'
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2d4a7a] to-[#312e81] dark:from-[#0f172a] dark:via-[#0a1628] dark:to-[#1e1b4b] animate-gradient" />

      {/* Floating orbs for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-72 h-72 bg-blue-500/8 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-indigo-500/8 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[60%] w-60 h-60 bg-amber-400/5 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Theme toggle */}
      {mounted && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-amber-300 hover:bg-white/10 rounded-full h-10 w-10 backdrop-blur-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo & University Title */}
        <div className="text-center mb-8">
          {/* Logo with gold ring */}
          <div className="inline-flex items-center justify-center mb-5 relative">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 opacity-50 blur-[4px]" />
            <div className="relative w-20 h-20 rounded-full p-0.5 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600">
              <img src="/tbu-logo.jpg" alt="Logo TBU" className="w-full h-full rounded-full object-cover" />
            </div>
          </div>

          {/* University name — PROMINENT */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-wide leading-tight mb-1">
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent animate-shimmer drop-shadow-lg">
              TRƯỜNG ĐẠI HỌC THÁI BÌNH
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-blue-200/60 uppercase mt-1">
            Hệ thống quản lý bãi đỗ xe thông minh
          </p>
        </div>

        {/* Card */}
        <Card className="glass-card rounded-2xl shadow-2xl shadow-black/20 border-0 overflow-hidden animate-glow">
          {/* Top accent gradient */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Card header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#312e81] shadow-lg shadow-blue-900/20">
                  <Lock className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Đăng nhập</h2>
                  <p className="text-xs text-muted-foreground">Nhập thông tin để truy cập hệ thống</p>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400 font-medium flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-foreground/80">
                  Tên đăng nhập
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-amber-500 transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 focus:border-amber-400/50 focus:ring-amber-400/20 transition-all duration-200 text-sm"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">
                  Mật khẩu
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-amber-500 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 focus:border-amber-400/50 focus:ring-amber-400/20 transition-all duration-200 text-sm"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="captcha" className="text-sm font-semibold text-foreground/80">
                    Mã xác thực
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
                    onClick={refreshCaptcha}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Đổi mã
                  </Button>
                </div>
                <div className="flex gap-3 items-center">
                  {/* Canvas CAPTCHA */}
                  <div className="flex-shrink-0 relative rounded-xl overflow-hidden border border-border/60 shadow-sm">
                    <canvas
                      ref={canvasRef}
                      width={160}
                      height={48}
                      className="block select-none"
                      style={{ width: '160px', height: '48px' }}
                    />
                  </div>
                  <div className="relative flex-1 group">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-amber-500 transition-colors" />
                    <Input
                      id="captcha"
                      type="text"
                      placeholder="Nhập mã trên"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 focus:border-amber-400/50 focus:ring-amber-400/20 transition-all duration-200 text-sm uppercase tracking-widest font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-[#1e3a5f] via-[#2d4a7a] to-[#312e81] hover:from-[#1a3355] hover:via-[#253f6a] hover:to-[#282670] text-white shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang đăng nhập...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Đăng nhập
                  </span>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed">
                Hệ thống bãi đỗ xe thông minh TBU &copy; {new Date().getFullYear()}
              </p>
              <p className="text-[10px] text-center text-muted-foreground/40 mt-0.5">
                v1.0.0 &middot; Thái Bình University
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
