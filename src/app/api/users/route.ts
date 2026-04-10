import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

// GET - List all users (exclude password hash)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { username: { contains: search } },
          ],
        }
      : {}

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        name: true,
        admin: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error: unknown) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách người dùng' },
      { status: 500 }
    )
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:users:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { username, password, name, admin, active } = body

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Thiếu username, password hoặc name' },
        { status: 400 }
      )
    }

    // 🔒 Password complexity
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      )
    }
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { success: false, error: 'Username phải từ 3-30 ký tự' },
        { status: 400 }
      )
    }

    // Check username uniqueness
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username đã tồn tại' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        admin: admin === 1 ? 1 : 0,
        active: active !== false,
      },
      select: {
        id: true,
        username: true,
        name: true,
        admin: true,
        active: true,
        createdAt: true,
      },
    })

    // Log activity
    try {
      await db.activityLog.create({
        data: { action: 'USER_CREATE', details: `Tạo tài khoản: ${username} (${name})`, username },
      })
    } catch {}

    return NextResponse.json({ success: true, data: user })
  } catch (error: unknown) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tạo tài khoản' },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:users:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id, name, admin, active, password } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu id' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy người dùng' },
        { status: 404 }
      )
    }

    const updateData: { name?: string; admin?: number; active?: boolean; password?: string } = {}
    if (name !== undefined) updateData.name = name
    if (admin !== undefined) updateData.admin = admin === 1 ? 1 : 0
    if (active !== undefined) updateData.active = active
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        admin: true,
        active: true,
        createdAt: true,
      },
    })

    // Log activity
    try {
      await db.activityLog.create({
        data: { action: 'USER_UPDATE', details: `Cập nhật tài khoản: ${user.username}`, username: user.username },
      })
    } catch {}

    return NextResponse.json({ success: true, data: user })
  } catch (error: unknown) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể cập nhật người dùng' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user (prevent deleting self)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:users:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu id' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy người dùng' },
        { status: 404 }
      )
    }

    // Prevent deleting self - 🔒 Lấy username từ session, KHÔNG tin client
    if (auth.user.username === user.username) {
      return NextResponse.json(
        { success: false, error: 'Không thể xóa tài khoản của chính mình' },
        { status: 403 }
      )
    }

    await db.user.delete({ where: { id } })

    // Log activity - 🔒 Dùng username từ session
    try {
      await db.activityLog.create({
        data: { action: 'USER_DELETE', details: `Xóa tài khoản: ${user.username} (${user.name})`, username: auth.user.username },
      })
    } catch {}

    return NextResponse.json({ success: true, data: { message: `Đã xóa tài khoản ${user.username}` } })
  } catch (error: unknown) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể xóa người dùng' },
      { status: 500 }
    )
  }
}
