import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    /*
     * Chỉ bảo vệ route PAGE, bỏ qua:
     * - /login (trang đăng nhập)
     * - /api/* (TẤT CẢ API routes — Arduino/serial bridge cần gọi không cần auth)
     * - /_next/* (Next.js internals)
     * - static files
     */
    '/((?!login|api/|_next/static|_next/image|favicon.ico|tbu-logo.jpg|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
}
