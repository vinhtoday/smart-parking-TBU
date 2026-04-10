import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

function verifyCaptcha(expression: string, answer: string): boolean {
  const parts = expression.trim().split(' ')
  if (parts.length !== 3) return false
  const a = parseInt(parts[0])
  const op = parts[1]
  const b = parseInt(parts[2])
  if (isNaN(a) || isNaN(b)) return false

  let expected: number
  switch (op) {
    case '+': expected = a + b; break
    case '-': expected = a - b; break
    case '×': expected = a * b; break
    default: return false
  }

  return parseInt(answer) === expected
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Đăng nhập',
      credentials: {
        username: { label: 'Tên đăng nhập', type: 'text' },
        password: { label: 'Mật khẩu', type: 'password' },
        captcha: { label: 'Captcha', type: 'text' },
        captchaAnswer: { label: 'Câu trả lời captcha', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu')
        }

        // Rate limiting by username
        const rateCheck = rateLimit(`login:${credentials.username}`, 5, 60 * 1000) // 5 attempts per minute per username
        if (!rateCheck.success) {
          throw new Error(`Quá nhiều lần đăng nhập. Vui lòng đợi ${rateCheck.retryAfter} giây`)
        }

        // Xác thực CAPTCHA
        if (!credentials.captcha || !credentials.captchaAnswer) {
          throw new Error('Vui lòng nhập mã xác thực')
        }
        if (!verifyCaptcha(credentials.captcha, credentials.captchaAnswer)) {
          throw new Error('Mã xác thực không chính xác')
        }

        // Tìm user trong database
        const user = await db.user.findUnique({
          where: { username: credentials.username },
        })

        if (!user || !user.active || !(await bcrypt.compare(credentials.password, user.password))) {
          // 🔒 Generic error - không lộ username tồn tại hay không
          throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác')
        }

        // Log LOGIN activity
        try { await db.activityLog.create({ data: { action: 'LOGIN', details: 'Đăng nhập thành công', username: user.username } }) } catch {}

        // Trả về user object cho session
        return {
          id: user.id,
          name: user.name,
          email: user.username, // dùng username làm email cho next-auth
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Lấy thông tin admin từ DB
        const dbUser = await db.user.findUnique({
          where: { username: user.email as string },
          select: { admin: true, username: true, name: true },
        })
        token.userId = user.id
        token.username = dbUser?.username
        token.role = dbUser?.admin === 1 ? 'admin' : 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.name = token.name as string
        session.user.username = token.username
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 giờ (giảm từ 24h)
  },
  secret: process.env.NEXTAUTH_SECRET,
}
