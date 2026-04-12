import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// POST - Seed default data (BLOCKED in production)
export async function POST() {
  // 🔒 Block seed in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Seed endpoint is disabled in production' },
      { status: 404 }
    )
  }

  try {
    // Seed default config if not exists
    const existingConfig = await db.parkingConfig.findUnique({
      where: { id: 'default' },
    })

    if (!existingConfig) {
      await db.parkingConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
          id: 'default',
          maxSlots: 6,
          feePerTrip: 2000,
          systemName: 'BAI DO XE THONG MINH',
          isOpen: true,
        },
      })
    }

    // Seed default users if not exist
    const existingAdmin = await db.user.findUnique({
      where: { username: 'admin' },
    })

    if (!existingAdmin) {
      console.warn('[SEED] Created default admin account (admin/admin123). Change this password immediately!')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await db.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'Quản trị viên',
          admin: 1,
          active: true,
        },
      })
    }

    const existingStaff = await db.user.findUnique({
      where: { username: 'nhanvien' },
    })

    if (!existingStaff) {
      console.warn('[SEED] Created default staff account (nhanvien/nv123456). Change this password immediately!')
      const hashedPassword = await bcrypt.hash('nv123456', 10)
      await db.user.create({
        data: {
          username: 'nhanvien',
          password: hashedPassword,
          name: 'Nhân viên',
          admin: 0,
          active: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Đã khởi tạo dữ liệu mặc định thành công',
    })
  } catch (error: unknown) {
    console.error('Error seeding data:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể khởi tạo dữ liệu' },
      { status: 500 }
    )
  }
}
