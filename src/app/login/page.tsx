'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sun, Moon, RefreshCw, Lock, User, ShieldCheck } from 'lucide-react'

function generateCaptcha(): { question: string; answer: number } {
  const ops = ['+', '-', '×'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a: number, b: number, answer: number

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 40) + 10  // 10-49
      b = Math.floor(Math.random() * 40) + 10  // 10-49
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * 40) + 15  // 15-54
      b = Math.floor(Math.random() * (a - 2)) + 2  // 2 to a-2, ensures a >= b+2
      answer = a - b
      break
    case '×':
      a = Math.floor(Math.random() * 9) + 2    // 2-10
      b = Math.floor(Math.random() * 9) + 2    // 2-10
      answer = a * b
      break
  }

  return { question: `${a} ${op} ${b}`, answer }
}

export default function LoginPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captcha, setCaptcha] = useState<{ question: string; answer: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    setCaptcha(generateCaptcha())
  }, [])

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha())
    setCaptchaInput('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captcha) {
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

    if (parseInt(captchaInput) !== captcha.answer) {
      setError('Mã xác thực không chính xác')
      refreshCaptcha()
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        username: username.trim(),
        password,
        captcha: captcha.question,
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
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
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
            className="text-white/80 hover:text-amber-300 hover:bg-white/10 rounded-full h-10 w-10"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm ring-2 ring-white/20 mb-4">
            <img src="/tbu-logo.jpg" alt="Logo TBU" className="w-14 h-14 rounded-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            HỆ THỐNG BÃI ĐỖ XE
          </h1>
          <p className="text-sm text-blue-200/70 font-semibold tracking-[0.15em] uppercase mt-1">
            Trường đại học Thái Bình
          </p>
        </div>

        <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/20 border-0 overflow-hidden">
          {/* Card header accent */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Lock className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Đăng nhập</h2>
                <p className="text-xs text-muted-foreground">Nhập thông tin để truy cập hệ thống</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-sm text-red-600 dark:text-red-400 font-medium">
                  ⚠️ {error}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">
                  Tên đăng nhập
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="captcha" className="text-sm font-medium">
                    Mã xác thực
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-blue-600"
                    onClick={refreshCaptcha}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Đổi mã
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  {/* CAPTCHA display */}
                  <div className="flex-shrink-0 select-none px-4 py-2.5 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-border font-mono text-lg font-bold tracking-widest text-foreground min-w-[120px] text-center relative overflow-hidden">
                    {/* Noise lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0" y1="10" x2="120" y2="30" stroke="currentColor" strokeWidth="1" />
                      <line x1="10" y1="0" x2="100" y2="40" stroke="currentColor" strokeWidth="1" />
                      <line x1="0" y1="35" x2="120" y2="5" stroke="currentColor" strokeWidth="1" />
                      <circle cx="20" cy="15" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      <circle cx="90" cy="25" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                    <span className="relative z-10">{captcha ? `${captcha.question} = ?` : '...'}</span>
                  </div>
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="captcha"
                      type="text"
                      placeholder="Trả lời"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      className="pl-10 h-11"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-200"
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
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-[11px] text-center text-muted-foreground">
                Hệ thống bãi đỗ xe thông minh TBU &copy; {new Date().getFullYear()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
