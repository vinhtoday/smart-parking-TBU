# 🅿️ Bãi Đỗ Xe Thông Minh — ĐH Thái Bình (TBU)

> Hệ thống quản lý bãi đỗ xe thông minh sử dụng RFID (Arduino RC522), tích hợp web dashboard theo dõi realtime.

---

## 📋 Mục Lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cài đặt & Triển khai](#cài-đặt--triển-khai)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Hệ thống xác thực](#hệ-thống-xác-thực)
- [API Endpoints](#api-endpoints)
- [Arduino & Hardware](#arduino--hardware)
- [Tính năng chính](#tính-năng-chính)
- [Troubleshooting](#troubleshooting)
- [Backup & Restore](#backup--restore)
- [Bảo mật](#bảo-mật)
- [Lịch sử cập nhật](#lich-su-cap-nhat)

---

<a id="tổng-quan"></a>
## 🎯 Tổng Quan

Hệ thống bãi đỗ xe thông minh được phát triển cho Trường Đại học Thái Bình, tích hợp:

- **RFID RC522** — Đọc thẻ RFID để nhận diện sinh viên/giảng viên
- **Arduino Uno** — Điều khiển barrier, cảm biến cháy (flame) và khí gas (MQ-2)
- **Web Dashboard** — Giao diện quản lý realtime, thống kê, báo cáo
- **Socket.IO** — Thông báo realtime khi xe ra/vào, cảnh báo cháy/gas

### Quy trình hoạt động

```
RFID quét thẻ → Arduino gửi UID qua Serial → Mini-service xử lý
  → Lưu vào MySQL → Socket.IO broadcast → Web dashboard cập nhật realtime
  → Barrier mở/đóng → LCD Arduino hiển thị vị trí trống
```

---

<a id="kiến-trúc-hệ-thống"></a>
## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│  http://localhost:3000 — Next.js Dashboard               │
│  - Socket.IO client (port 3003)                          │
│  - Dark/Light theme, Responsive                          │
└──────────────┬──────────────────────┬────────────────────┘
               │ REST API            │ WebSocket
               ▼                     ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  NEXT.JS APP (port 3000) │  │  PARKING-WS (port 3003)   │
│  - App Router + Turbopack│  │  - Socket.IO server       │
│  - 15 API routes         │  │  - Xử lý RFID entry/exit  │
│  - NextAuth JWT          │  │  - Fire/Gas alarm relay   │
│  - Prisma ORM            │  │  - Relay bridge ↔ client  │
└──────────┬───────────────┘  └──────────┬───────────────┘
           │                             │
           ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  MySQL (port 3306)       │  ┌──────────────────────────┐
│  parking_db              │  │  PARKING-SERIAL (port 3004)│
│  - 8 tables              │  │  - serialport ↔ Arduino   │
└──────────────────────────┘  │  - Baud: 9600             │
                              └──────────┬───────────────┘
                                          │ USB Serial
                                          ▼
                              ┌──────────────────────────┐
                              │  ARDUINO UNO              │
                              │  - RFID RC522 (SPI)       │
                              │  - Flame sensor (D4)      │
                              │  - MQ-2 Gas sensor (D3)   │
                              │  - Servo barrier (D8)     │
                              │  - Buzzer (D5)            │
                              │  - LCD I2C 16x2           │
                              └──────────────────────────┘
```

---

<a id="công-nghệ-sử-dụng"></a>
## 💻 Công Nghệ Sử Dụng

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js (App Router + Turbopack) | 16.1.1 |
| **Env Config** | dotenv | 17.4.1 |
| **Language** | TypeScript | 5.x |
| **Runtime** | Bun | latest |
| **Database** | MySQL (Prisma ORM) | 6.11.1 |
| **UI Library** | shadcn/ui + Radix UI | latest |
| **Excel Export** | ExcelJS | 4.4.0 |
| **Charts** | Recharts | 3.8.1 |
| **Realtime** | Socket.IO (client + server) | 4.8.3 |
| **Auth** | NextAuth.js v4 (JWT + Credentials) | 4.24.11 |
| **Styling** | Tailwind CSS 4 (devDep) | 4.x |
| **Hardware** | serialport | 13.x |
| **Password** | bcryptjs | 3.0.3 |
| **Notifications** | Sonner (toast) | 2.0.6 |
| **Icons** | Lucide React | 0.525.0 |
| **Fonts** | Geist Sans + Geist Mono | Google Fonts |

---

<a id="cấu-trúc-thư-mục"></a>
## 📁 Cấu Trúc Thư Mục

```
my-project/
├── prisma/
│   └── schema.prisma              # 8 models: Student, Teacher, ParkedVehicle,
│                                  #   ParkingHistory, ParkingConfig, DailyStats, User, ActivityLog
├── public/
│   ├── favicon.ico
│   ├── robots.txt                  # SEO robots config
│   └── tbu-logo.jpg               # Logo trường TBU
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout + SessionProvider
│   │   ├── page.tsx               # Main dashboard (8 tabs)
│   │   ├── login/page.tsx         # Trang đăng nhập + CAPTCHA
│   │   ├── error.tsx              # Error boundary (try again)
│   │   ├── not-found.tsx          # 404 page
│   │   ├── theme-provider.tsx     # Dark/Light theme config
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth API
│   │       ├── activity-logs/route.ts # GET/POST activity logs (admin)
│   │       ├── config/route.ts    # GET/PUT cấu hình
│   │       ├── history/route.ts   # GET lịch sử + phân trang + lọc ngày
│   │       ├── report/route.ts    # GET báo cáo + doanh thu ngày
│   │       ├── guests/route.ts   # GET/POST khách vãng lai
│   │       ├── seed/route.ts      # POST seed dữ liệu (dev only, blocked in prod)
│   │       ├── stats/route.ts     # GET thống kê realtime
│   │       ├── students/route.ts  # CRUD sinh viên
│   │       ├── sync/route.ts      # POST đồng bộ dữ liệu từ Arduino
│   │       ├── teachers/route.ts  # CRUD giảng viên
│   │       ├── users/route.ts     # CRUD tài khoản (admin)
│   │       ├── vehicles/route.ts  # GET/POST/DELETE xe đang đỗ
│   │       └── vip/route.ts       # POST toggle VIP
│   ├── components/
│   │   ├── NextAuthProvider.tsx   # Client SessionProvider wrapper
│   │   ├── PersonTypeBadge.tsx    # Badge loại người (SV/GV/Khách) + VipBadge
│   │   ├── tabs/
│   │   │   ├── OverviewTab.tsx    # Tổng quan + bảng xe đang đỗ
│   │   │   ├── StudentsTab.tsx    # Quản lý sinh viên (CRUD)
│   │   │   ├── TeachersTab.tsx    # Quản lý giảng viên (CRUD + VIP)
│   │   │   ├── ManageTab.tsx      # Quản lý tài khoản (admin)
│   │   │   ├── HistoryTab.tsx     # Lịch sử + phân trang + lọc ngày + PDF
│   │   │   ├── ReportsTab.tsx     # Báo cáo + biểu đồ doanh thu + Excel + PDF
│   │   │   └── SettingsTab.tsx    # Cấu hình + kết nối Arduino
│   │   └── ui/                    # shadcn/ui components
│   ├── hooks/
│   │   ├── useParkingData.ts      # Data fetching hook
│   │   ├── useAlarmSound.ts       # Alarm sound hook (Web Audio API)
│   │   ├── useSocketIO.ts         # Socket.IO client hook
│   │   └── useArduinoConnection.ts # Arduino connection status hook
│   ├── lib/
│   │   ├── auth.ts                # NextAuth config + CAPTCHA verify
│   │   ├── db.ts                  # Prisma singleton connection
│   │   ├── format.ts              # Format VND, datetime, duration, Excel, PDF
│   │   ├── api-auth.ts            # verifyArduinoSecret() + requireAuth() + requireAdmin()
│   │   ├── rate-limit.ts          # In-memory rate limiter (TODO: Redis for production)
│   │   └── utils.ts               # cn() helper cho Tailwind
│   ├── mini-services/
│   │   ├── parking-serial.js      # Serial bridge Arduino (port 3004)
│   │   └── parking-ws.js          # Socket.IO server + RFID (port 3003)
│   ├── middleware.ts              # Route protection (NextAuth)
│   └── types/
│       ├── parking.ts             # Shared TypeScript interfaces
│       ├── arduino.ts             # Arduino alarm types
│       └── next-auth.d.ts         # NextAuth type augmentation
├── download/
│   └── parking_arduino_school.ino # Arduino firmware (RFID + sensors + LCD)
├── .env.example                    # Mẫu biến môi trường (copy → .env)
├── .env                          # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (không commit)
├── package.json
├── next.config.ts
├── start-dev.sh                  # Script khởi động tất cả services
└── README.md                     # File này
```

---

<a id="cài-đặt--triển-khai"></a>
## 🚀 Cài Đặt & Triển Khai

### Yêu cầu

- **Node.js** 18+ hoặc **Bun**
- **MySQL** 5.7+ hoặc **MariaDB** 10.3+
- **Arduino Uno** + RFID RC522 + Cảm biến + Servo (optional)

### Cài đặt

```bash
# 1. Clone và cài dependencies
git clone <repo>
cd my-project
bun install

# 2. Cấu hình .env từ file mẫu
cp .env.example .env
# → Chỉnh sửa .env: DATABASE_URL, NEXTAUTH_SECRET, ARDUINO_API_SECRET...
# Xem .env.example để biết đầy đủ các biến môi trường

# HOẶC tạo thủ công:
cat > .env << 'EOF'
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/parking_db
NEXTAUTH_SECRET=your-random-secret-string-min-32-chars
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3003
WS_PORT=3003
SERIAL_PORT=3004
ARDUINO_SERIAL_PORT=COM5
ARDUINO_BAUD_RATE=9600
ARDUINO_API_SECRET=your-arduino-api-secret-change-this
ARDUINO_WS_SECRET=your-arduino-ws-secret-change-this
EOF

# 3. Tạo database MySQL
mysql -u root -p -e "CREATE DATABASE parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 4. Push schema + generate Prisma client
npx prisma db push
npx prisma generate

# 5. Seed dữ liệu mặc định (config + tài khoản)
curl -X POST http://localhost:3000/api/seed

# 6. Chạy tất cả services
npm run dev                              # Website (port 3000)
node src/mini-services/parking-ws.js     # WebSocket (port 3003)
node src/mini-services/parking-serial.js # Arduino Bridge (port 3004)
```

Mở trình duyệt: **http://localhost:3000**

### Tài khoản mặc định

| Username | Password | Quyền (admin) | Mô tả |
|----------|----------|---------------|--------|
| `admin` | `admin123` | 1 (Toàn quyền) | Xem tất cả 8 tab, chỉnh cấu hình, quản lý user |
| `nhanvien` | `nv123456` | 0 (Giới hạn) | Chỉ xem Tổng quan, Lịch sử, Báo cáo |

> ⚠️ **Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!** Seed chỉ chạy trong development (`NODE_ENV ≠ production`).

> 🔑 **Secret keys**: `ARDUINO_API_SECRET` và `ARDUINO_WS_SECRET` bảo vệ API/WS khỏi gọi trái phép. Phải đặt **giá trị ngẫu nhiên mạnh** cho production!

> 🌐 **WebSocket URL**: `NEXT_PUBLIC_WS_URL` quyết định trình duyệt kết nối Socket.IO server nào. Default `http://localhost:3003`. Khi deploy production, đổi thành domain thực (ví dụ: `wss://parking.tbu.edu.vn`).

### Phân quyền theo tab

| Tab | admin=1 | admin=0 |
|-----|---------|---------|
| Tổng quan | ✅ | ✅ |
| Sinh viên | ✅ | ❌ |
| Giảng viên | ✅ | ❌ |
| Tài khoản | ✅ | ❌ |
| Lịch sử | ✅ | ✅ |
| Báo cáo | ✅ | ✅ |
| Cấu hình | ✅ | ❌ |

### Build Production

```bash
npm run build
npm run start   # Chạy trên port 3000
```

---

<a id="cơ-sở-dữ-liệu"></a>
## 🗄️ Cơ Sở Dữ Liệu

MySQL. Dữ liệu website và database đồng bộ realtime qua Prisma ORM.

### 8 Models (Prisma + MySQL)

#### `User` — Tài khoản đăng nhập
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| username | String (unique) | Tên đăng nhập |
| password | String | Hash bcryptjs |
| name | String | Họ tên hiển thị |
| admin | Int (default: 0) | 0=Nhân viên, 1=Admin |
| active | Boolean (default: true) | Kích hoạt/vô hiệu |
| createdAt / updatedAt | DateTime | Timestamps |

#### `Student` — Sinh viên đã đăng ký
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| name | String | Họ tên |
| rfidUid | String (unique) | Mã thẻ RFID |
| class | String | Lớp học |
| phone | String | Số điện thoại |

#### `Teacher` — Giảng viên đã đăng ký
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| name | String | Họ tên |
| rfidUid | String (unique) | Mã thẻ RFID |
| department | String | Khoa/Bộ môn |
| phone | String | Số điện thoại |
| isVip | Boolean (default: true) | VIP miễn phí |

#### `ParkedVehicle` — Xe đang gửi trong bãi
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| rfidUid | String (unique) | Mã thẻ RFID |
| personName | String | Tên người gửi |
| personType | String | student/teacher/guest |
| isVip | Boolean | Có phải VIP |
| entryTime | DateTime | Thời gian vào |

#### `ParkingHistory` — Lịch sử ra/vào
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| rfidUid | String | Mã thẻ RFID |
| personName | String | Tên |
| personType | String | Loại người dùng |
| isVip | Boolean | VIP |
| entryTime | DateTime | Thời gian vào |
| exitTime | DateTime? | Thời gian ra |
| duration | Int (default: 0) | Thời gian đỗ (giây) |
| fee | Int (default: 2000) | Phí (VNĐ) |

#### `ParkingConfig` — Cấu hình hệ thống (singleton)
| Field | Type | Default |
|-------|------|---------|
| id | String | "default" |
| maxSlots | Int | 6 |
| feePerTrip | Int | 2000 (VNĐ) |
| systemName | String | "BAI DO XE THONG MINH" |
| isOpen | Boolean | true |

#### `DailyStats` — Thống kê hàng ngày
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| date | String (unique) | Ngày (YYYY-MM-DD) |
| totalEntries / totalExits | Int | Số xe vào/ra |
| totalRevenue | Int | Doanh thu |
| studentCount / teacherCount | Int | Theo loại |

#### `ActivityLog` — Nhật ký hoạt động
| Field | Type | Mô tả |
|-------|------|-------|
| id | String (cuid) | Primary key |
| action | String | Loại hành động (LOGIN, VEHICLE_ENTRY, USER_CREATE...) |
| details | String | Chi tiết |
| username | String | Người thực hiện |
| createdAt | DateTime | Thời gian |

### Query dữ liệu

```sql
USE parking_db;
SELECT * FROM ParkedVehicle;
SELECT * FROM Student;
SELECT * FROM Teacher;
SELECT * FROM ParkingHistory;
SELECT * FROM User;
```

---

<a id="hệ-thống-xác-thực"></a>
## 🔐 Hệ Thống Xác Thực

### Luồng xác thực

```
User nhập username + password + CAPTCHA
  → POST /api/auth/callback/credentials
  → Server verify CAPTCHA (math: cộng/trừ/nhân)
  → Tìm user trong MySQL (WHERE username, active=true)
  → bcrypt.compare(password, hash)
  → JWT token tạo (chứa userId, username, role)
  → Cookie set (httpOnly, expires 8h)
  → Redirect to /
```

### Bảo vệ route (middleware.ts)

```
Mọi request → withAuth middleware
  → Chưa có session → Redirect /login
  → Có session → Cho qua
  → Bỏ qua: /login, /api/* (TẤT CẢ API routes — Arduino/serial bridge cần gọi không cần auth), static files
  → Mỗi API route tự bảo vệ bằng requireAuth() / requireAdmin() trong api-auth.ts
```

### Quản lý quyền qua MySQL

```sql
-- Cấp quyền admin
UPDATE User SET admin = 1 WHERE username = 'nhanvien';

-- Thu hồi quyền
UPDATE User SET admin = 0 WHERE username = 'admin';

-- Vô hiệu hóa tài khoản
UPDATE User SET active = 0 WHERE username = 'someuser';
```

### CAPTCHA

- Math-based tự sinh trên client (cộng/trừ/nhân, số 2-54)
- Server-side verify: reject số < 2, reject kết quả âm (trừ)
- Nút "Đổi mã" để refresh
- Hiển thị dạng toán: `37 × 8 = ?`

---

<a id="api-endpoints"></a>
## 🔌 API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/auth/callback/credentials` | Đăng nhập (username + password + CAPTCHA) |
| GET | `/api/auth/signout` | Đăng xuất |
| GET | `/api/auth/session` | Lấy session hiện tại |

### Config
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/config` | Lấy cấu hình hệ thống |
| PUT | `/api/config` | Cập nhật cấu hình (feePerTrip) |

### Guests
| Method | Path | Query Params | Mô tả |
|--------|------|-------------|-------|
| GET | `/api/guests` | `history=true` | Danh sách khách đang đỗ (hoặc lịch sử khách) |
| POST | `/api/guests` | — | Thêm khách vãng lai thủ công |

### Vehicles
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/vehicles` | Danh sách xe đang đỗ (public — không cần auth) |
| POST | `/api/vehicles` | Thêm xe (Arduino: cần secret header, Web: cần session) |
| DELETE | `/api/vehicles` | Xử lý xe ra (Arduino: cần secret header, Web: cần session) |

### Students
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/students` | Danh sách sinh viên |
| POST | `/api/students` | Thêm sinh viên |
| PUT | `/api/students` | Sửa thông tin sinh viên |
| DELETE | `/api/students` | Xóa sinh viên |

### Teachers
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/teachers` | Danh sách giảng viên |
| POST | `/api/teachers` | Thêm giảng viên |
| PUT | `/api/teachers` | Sửa thông tin giảng viên |
| DELETE | `/api/teachers` | Xóa giảng viên |

### History
| Method | Path | Query Params | Mô tả |
|--------|------|-------------|-------|
| GET | `/api/history` | `page, limit, search, startDate, endDate` | Lịch sử + phân trang + lọc |

### Report
| Method | Path | Query Params | Mô tả |
|--------|------|-------------|-------|
| GET | `/api/report` | `startDate, endDate` | Báo cáo theo người + dailyRevenue |

### Stats
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/stats` | Thống kê realtime (parkedCount, todayRevenue...) |

### Other
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/vip` | Toggle VIP cho giảng viên |
| POST | `/api/sync` | Đồng bộ từ Arduino (cần `X-Arduino-Secret` header) |
| POST | `/api/seed` | Seed dữ liệu mặc định (dev only, **blocked in production**) |

### Users
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/users` | Danh sách tài khoản (admin) |
| POST | `/api/users` | Tạo tài khoản mới (admin) |
| PUT | `/api/users` | Sửa tài khoản (admin) |
| DELETE | `/api/users` | Xóa tài khoản (admin, không xóa chính mình) |

### Activity Logs
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/activity-logs` | Danh sách nhật ký hoạt động (admin) |
| POST | `/api/activity-logs` | Tạo log (admin, username từ session) |

---

<a id="arduino--hardware"></a>
## 🔧 Arduino & Hardware

### Kết nối phần cứng

| Component | Pin Arduino | Mô tả |
|-----------|-------------|-------|
| RFID RC522 | SPI (D10=SS, D11=MOSI, D12=MISO, D13=SCK, D9=RST) | Đọc thẻ RFID |
| Flame Sensor | D4 | Cảm biến lửa |
| MQ-2 Gas Sensor | D3 | Cảm biến khí gas |
| Servo Motor | D8 | Barrier mở/đóng |
| Buzzer | D5 | Cảnh báo âm thanh |
| LCD I2C 16x2 | SDA=A4, SCL=A5 | Hiển thị thông tin |

### Cấu hình Arduino

Chỉnh sửa trực tiếp trong code Arduino rồi nạp lại (giá trị này **độc lập** với `maxSlots` trên web config):

```c
#define MAX_SLOTS    6    // Số vị trí đỗ tối đa (phải khớp với web config maxSlots)
#define MAX_VIP_SIZE 3    // Số thẻ VIP tối đa
```

### Dữ liệu Arduino → Web (qua Serial JSON)

Arduino gửi JSON qua Serial (9600 baud) cho Node.js serial bridge:

| Type | Mô tả |
|------|-------|
| `RFID_SCAN` | Quét được thẻ RFID |
| `VEHICLE_ENTRY` | Xe vào bãi |
| `VEHICLE_EXIT` | Xe ra bãi (kèm fee, duration) |
| `FIRE_ALARM` / `FIRE_CLEARED` | Cảnh báo cháy |
| `FULL_SYNC` | Đồng bộ toàn bộ (30s/lần) |

### LCD hiển thị

```
Line 1: "Cho trong: 3/6"    (Vị trí trống/tổng)
Line 2: "SV:2 GV:1"         (Sinh viên/Giảng viên đang đỗ)
```

### Tối ưu Arduino (v0.4.2)

- Non-blocking fire/gas safety (không dùng while() chặn hệ thống)
- Xóa ArduinoJson → tiết kiệm ~600 bytes RAM
- Serial.print() thủ công thay vì JSON library
- Buzzer/LCD blink bằng millis() thay vì delay()

### Test không cần Arduino

```bash
# Kiểm tra trạng thái serial bridge
curl http://localhost:3004/status

# Gửi scan test
curl -X POST http://localhost:3004/scan

# Test xe vào
curl -X POST http://localhost:3004/entry -H "Content-Type: application/json" -d '{"uid":"4B9C0705","personName":"Test","personType":"student"}'

# Test xe ra
curl -X POST http://localhost:3004/exit -H "Content-Type: application/json" -d '{"uid":"4B9C0705"}'
```

---

<a id="tính-năng-chính"></a>
## ✨ Tính Năng Chính

### Dashboard
- **8 tab**: Tổng quan, Sinh viên, Giảng viên, Tài khoản, Lịch sử, Báo cáo, Nhật ký, Cấu hình
- **5 card thống kê**: Xe đang gửi, Sinh viên, Giảng viên, RFID gần nhất, Thu nhập
- **Dark/Light mode**: Tự động theo hệ thống hoặc toggle thủ công
- **Responsive**: Desktop, tablet, mobile

### Realtime
- **Socket.IO**: Cập nhật realtime xe ra/vào, cảnh báo cháy/gas
- **Cảnh báo âm thanh**: Web Audio API (cháy: 800Hz square, gas: 500Hz sawtooth)
- **Banner cảnh báo**: Hiển thị banner đỏ/cam khi có alarm

### Quản lý
- **CRUD sinh viên/giảng viên**: Thêm, sửa, xóa, tìm kiếm
- **VIP miễn phí**: Toggle VIP cho giảng viên
- **Thêm xe thủ công**: Cho khách vãng lai
- **Xử lý xe ra**: Tự động tính phí + thời gian

### Thống kê & Báo cáo
- **5 khoảng thời gian**: Hôm nay, Tuần, Tháng, Quý, Năm
- **Lọc theo ngày**: DatePicker cho lịch sử và báo cáo
- **Biểu đồ doanh thu**: BarChart (recharts) theo ngày
- **Xuất Excel**: Grid lines, alternating rows, frozen header (ExcelJS)
- **Xuất PDF**: Print-to-PDF từ browser

### Xác thực
- **NextAuth JWT**: Session 8 giờ, auto redirect
- **CAPTCHA toán**: Chống brute force
- **Phân quyền**: admin=1 toàn quyền, admin=0 giới hạn tab
- **Quản lý qua MySQL**: Thêm/sửa quyền trực tiếp trong DB

### Giá xe & VIP

| Loại người | Phí/lượt |
|-------------|---------|
| Sinh viên | Theo cấu hình (mặc định 2,000đ) |
| Giảng viên thường | Theo cấu hình (mặc định 2,000đ) |
| Giảng viên VIP | Miễn phí |
| Khách | Theo cấu hình (mặc định 2,000đ) |

### Arduino Integration
- **Serial bridge**: Node.js ↔ Arduino qua serialport (9600 baud)
- **Non-blocking**: Fire/gas alarm không chặn RFID scanning
- **LCD hiển thị**: Vị trí trống, số SV/GV đang đỗ
- **Cảm biến**: Cháy (flame double-read) + Khí gas (MQ-2 debounce 2s)
- **FULL_SYNC**: Đồng bộ trạng thái 30 giây/lần

---

<a id="troubleshooting"></a>
## 🔧 Troubleshooting

### Arduino không kết nối được
1. Kiểm tra Arduino đã cắm USB chưa, cable có bị lỏng không
2. Đóng Arduino IDE Serial Monitor (nếu đang mở — chỉ 1 app được dùng cổng Serial)
3. Windows: Mở Device Manager → Ports (COM & LPT) xem Arduino ở COM mấy
4. Linux: Chạy `ls /dev/ttyUSB*` hoặc `ls /dev/ttyACM*`, thêm user vào nhóm dialout:
   ```bash
   sudo usermod -aG dialout $USER
   # Logout và login lại
   ```
5. Đặt đúng cổng trong `.env`: `ARDUINO_SERIAL_PORT=COM5`

### Arduino bị treo
1. **Non-blocking code**: Đảm bảo dùng bản Arduino v0.4.2+ (non-blocking fire/gas)
2. Không dùng `while()` vô hạn trong `loop()` — dùng `millis()` state machine
3. Xóa `ArduinoJson.h` nếu RAM đầy (UNO chỉ có 2KB)
4. Kiểm tra dây nối cảm biến (chập điện gây reset)

### Socket.IO không kết nối (WS ✘)
1. Kiểm tra parking-ws.js đang chạy: `curl http://localhost:3003`
2. Chạy lại: `node src/mini-services/parking-ws.js`
3. Serial Bridge cũng cần WS server để broadcast: chạy cả 2 services

### MySQL connection refused
1. Kiểm tra MySQL đang chạy: `systemctl status mysql` (Linux) hoặc kiểm tra Services (Windows)
2. Kiểm tra `.env` đúng: `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/parking_db`
3. Đảm bảo database đã tạo: `CREATE DATABASE parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
4. Push schema: `npx prisma db push`

### Prisma Client chưa generate
```bash
npx prisma generate
npm run build
```

### Dữ liệu Arduino không lên web
1. Mở terminal chạy Serial Bridge, xem log: `node src/mini-services/parking-serial.js`
2. Nếu thấy "Auto-detect" → Arduino chưa nhận diện, đặt cổng thủ công trong `.env`
3. Nếu thấy "Non-JSON" → Arduino đang gửi plain text thay vì JSON, kiểm tra code Arduino
4. Kiểm tra WS server đang chạy (`localhost:3003`)
5. Kiểm tra web page header: chỉ số WS và Arduino đều ✔ mới có realtime

---

<a id="backup--restore"></a>
## 💾 Backup & Restore Database

### Backup (Xuất dữ liệu)
```bash
# Export toàn bộ database
mysqldump -u root -p parking_db > backup_parking_$(date +%Y%m%d).sql

# Export riêng bảng users
mysqldump -u root -p parking_db User > backup_users_$(date +%Y%m%d).sql

# Export dữ liệu (không cấu trúc)
mysqldump -u root -p --no-create-info parking_db > data_only_$(date +%Y%m%d).sql
```

### Restore (Phục hồi dữ liệu)
```bash
# Import từ file backup
mysql -u root -p parking_db < backup_parking_20260407.sql

# Restore trên database mới
mysql -u root -p -e "CREATE DATABASE parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p parking_db < backup_parking_20260407.sql
npx prisma db push
```

### Backup tự động (Cron job)
```bash
# Thêm vào crontab (chạy mỗi ngày 2h sáng)
crontab -e
# Thêm dòng:
0 2 * * * mysqldump -u root -p parking_db > /path/to/backup/parking_$(date +\%Y\%m\%d).sql
```

---

<a id="bảo-mật"></a>
## 🛡️ Bảo Mật

### Kiến trúc bảo vệ API

```
┌──────────────────────────────────────────────────────────────┐
│  Arduino Serial Bridge (parking-serial.js)                    │
│  ┌─ POST /api/vehicles ──── Header: X-Arduino-Secret ──────┐ │
│  ├─ DELETE /api/vehicles ─ Header: X-Arduino-Secret ──────┤ │
│  ├─ POST /api/sync ───────── Header: X-Arduino-Secret ──────┤ │
│  └─ Socket.IO (bridge) ─── Auth: { type, secret } ─────────┘ │
│                                                              │
│  Web Dashboard (browser)                                     │
│  ┌─ POST/DELETE /api/vehicles ── NextAuth session ─────────┐ │
│  ├─ GET /api/vehicles ──────── Public (read-only) ──────────┤ │
│  ├─ /api/students, teachers ── requireAuth/requireAdmin ───┤ │
│  └─ /api/users, config PUT ─── requireAdmin ───────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Arduino Shared Secret (`ARDUINO_API_SECRET`)

API endpoints `/api/vehicles` (POST/DELETE) và `/api/sync` (POST) yêu cầu header `X-Arduino-Secret`. Arduino Serial Bridge tự gửi header này trên mọi request.

- **Nếu không set env var** → cho phép tất cả (dev mode)
- **Nếu set env var** → chỉ cho phép request có header khớp exact
- **Web dashboard** → dùng NextAuth session (không cần secret)

### WebSocket Bridge Auth (`ARDUINO_WS_SECRET`)

`parking-ws.js` (port 3003) yêu cầu bridge gửi `auth: { type: 'bridge', secret }` khi kết nối. Nếu secret sai hoặc thiếu → disconnect ngay.

### Command Whitelist (parking-serial.js)

Endpoint `POST /command` chỉ cho phép các lệnh an toàn:
`SYNC`, `STATUS`, `OPEN`, `CLOSE`, `BUZZER`, `RESET`, và JSON `WEB_RESPONSE`.
Các lệnh khác → trả 403 Forbidden.

### CAPTCHA nâng cao

- Số phạm vi lớn hơn: cộng/trừ 10-54, nhân 2-10
- Server-side reject số < 2, reject phép trừ có kết quả âm
- Rate limit 5 lần/phút theo username

### Security Headers

| Header | Value |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| X-XSS-Protection | 1; mode=block |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; ... |

### Rate Limiting

| Endpoint | Limit | Key |
|----------|-------|-----|
| Login | 5 lần/phút | Username |
| CRUD API | 30 req/phút | IP |

> ⚠️ Rate limiter hiện dùng in-memory Map — data mất khi restart. Production nên dùng Redis.

---

<a id="lich-su-cap-nhat"></a>
## 📝 Lịch Sử Cập Nhật

### v0.5.0 — Activity Logs Tab & Code Quality

**🔴 TypeScript fixes (3 errors → 0):**
- **`format.ts` ExcelJS namespace**: Thêm `import type ExcelJS from 'exceljs'` để TypeScript nhận diện namespace `ExcelJS.Borders` cho `Partial<ExcelJS.Borders>` type annotation
- **`calendar.tsx` labels prop**: Xóa `nextMonth`/`previousMonth`/`nextYear`/`previousYear` không tồn tại trong react-day-picker v9 — v9 dùng `labelNext`/`labelPrevious` cho accessibility, navigation handled bởi custom Chevron component
- **`ReportsTab.tsx` Recharts formatter**: Fix type mismatch — `Formatter<ValueType, NameType>` cho phép `value` là `ValueType` (generic), dùng type inference thay vì hardcode `number`

**🟢 Features:**
- **Tab Nhật ký hoạt động (ActivityLogsTab)**: Tab mới cho admin — xem toàn bộ nhật ký hệ thống trực tiếp trên web dashboard
- **Lọc theo loại hành động**: Dropdown 18 loại action (xé vào/ra, CRUD SV/GV/User, VIP, cấu hình, đăng nhập...)
- **Phân trang**: 30 bản ghi/trang, next/prev buttons
- **Icon + badge màu phân biệt**: Mỗi nhóm action có icon và badge màu riêng (xe=xanh lá, SV=xanh dương, GV=vàng, user=xanh, config=tím, login=xanh lá, logout=đỏ)
- **Username `arduino` highlight**: Log từ Arduino hiển thị màu xanh lá để phân biệt với user thường
- **Dashboard 8 tab**: Cập nhật từ 7 → 8 tabs
- **`GET /api/health`**: Endpoint health check public — trả `{ status: 'ok', timestamp, version }`
- **`error.tsx`**: Error boundary — trang lỗi với thông báo + nút "Thử lại"
- **`not-found.tsx`**: Custom 404 page — trang không tìm thấy với link về trang chủ
- **Lượt vào/ra hôm nay**: Card thống kê RFID hiển thị thêm todayEntries/todayExits

**🟡 Code quality:**
- **Footer version dynamic**: `v2.1` hardcoded → `v{APP_VERSION}` từ `constants.ts` (single source of truth)
- **`stats/route.ts` maxSlots fallback**: `4` → `6` (khớp Arduino `MAX_SLOTS=6` và seed data)
- **`sync/route.ts` unused destructuring**: Xóa `parkedCount` không sử dụng
- **Empty catch blocks**: Thêm comment `/* non-critical: activity log best-effort */` vào 13 chỗ
- **Unused vars**: Prefix `_` cho `req`, `ci`, `options` params; xóa `ACCENT_BG` constant không dùng
- **`package.json` start script**: `bun` → `node` (standalone Next.js nên chạy bằng node)
- **ESLint ignore**: Thêm `src/mini-services/**` (JS files, không cần TS linting)
- **`activity-logs` API**: Hỗ trợ filter theo `action` query param, trả `{ logs[], total }` với parallel count query
- **`useParkingData` hook**: Thêm `fetchActivityLogs`, `activityLogs`, `logsTotal`, `logsOffset`
- **Version bump** `0.4.5` → `0.5.0`

### v0.4.5 — Repo Cleanup & Audit Fixes
- **`.env.example`**: Tạo file mẫu biến môi trường đầy đủ — người mới clone repo chỉ cần `cp .env.example .env`
- **`dotenv` dependency**: Thêm `dotenv` vào `package.json` (trước đó dùng ngầm qua bun.lock)
- **Xóa `/mini-services/` dư thừa**: Thư mục root chứa bản cũ mini-services không còn được dùng, xóa khỏi git và filesystem
- **`package.json` rename**: Đổi tên package từ `nextjs_tailwind_shadcn_ts` thành `smart-parking-tbu`
- **`NEXT_PUBLIC_WS_URL` document**: Thêm biến env vào `.env.example` + README, giải thích cách deploy production
- **DailyStats sync fix**: Sửa `update: {}` rỗng trong `/api/sync` — giờ refresh `studentCount`/`teacherCount` mỗi lần Arduino sync
- **ActivityLog username**: Xe vào/ra qua Arduino giờ ghi `username: 'arduino'` thay vì rỗng — phân biệt được nguồn trigger
- **API document**: GET `/api/vehicles` ghi rõ là public (không cần auth) — phù hợp intranet

### v0.4.4 — Security Audit & Code Quality
- **Arduino API Secret**: Thêm `ARDUINO_API_SECRET` — POST/DELETE `/api/vehicles` và POST `/api/sync` yêu cầu header `X-Arduino-Secret`
- **WebSocket Bridge Auth**: Thêm `ARDUINO_WS_SECRET` — verify bridge secret khi kết nối `parking-ws.js`
- **CAPTCHA nâng cao**: Tăng range số (2-54), server-side reject số < 2 và kết quả âm
- **Content-Security-Policy**: Thêm CSP header chống XSS
- **Command Whitelist**: `/command` endpoint chỉ cho phép lệnh an toàn (SYNC, STATUS, OPEN, CLOSE, BUZZER, RESET)
- **feePerTrip validation**: PUT `/api/config` validate giá trị (integer 0-1.000.000)
- **MAX_SLOTS đồng bộ**: Sửa DB seed `maxSlots` 4→6 (khớp Arduino `MAX_SLOTS=6`)
- **TypeScript strict**: `ignoreBuildErrors: false`, `reactStrictMode: true`
- **ESLint nâng cấp**: Bật `no-explicit-any`, `no-unused-vars`, `prefer-const` (warn)
- **Cleanup**: Xóa `PersonBadge.tsx` (trùng `PersonTypeBadge.tsx`), xóa `package-lock.json`, xóa `.accesslog/.stats` khỏi git
- **CORS header**: Serial bridge thêm `X-Arduino-Secret` vào `Access-Control-Allow-Headers`
- **Rate limiter**: Thêm TODO comment về Redis migration cho production

### v0.4.3 — Bảo mật & Fix README
- **NEXTAUTH_SECRET**: Thêm secret JWT vào .env
- **Block /api/seed**: Block hoàn toàn trong production (return 404)
- **Security headers**: Thêm X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Username enumeration**: Đổi lỗi đăng nhập thành thông báo chung
- **Audit log poisoning**: Whitelist actions, ép username từ session
- **Self-delete bypass**: Lấy username từ session thay vì client body
- **Password complexity**: Yêu cầu mật khẩu tối thiểu 6 ký tự
- **CORS restrict**: WebSocket + Serial bridge giới hạn localhost only
- **Session timeout**: Giảm từ 24h → 8h
- **Serial bridge**: Bind 127.0.0.1 thay vì 0.0.0.0

### v0.4.2 — Tối ưu Arduino & Excel đẹp
- **Arduino non-blocking**: Fire/gas alarm dùng millis() thay vì while() chặn
- **Bỏ ArduinoJson**: Dùng Serial.print() thủ công, tiết kiệm ~600 bytes RAM
- **Excel đẹp hơn**: Chuyển sang ExcelJS, grid lines rõ ràng, alternating rows, frozen header
- **Xóa nút Refresh**: Bỏ nút xoay tròn trong header (realtime đủ)
- **Bỏ xlsx cũ**: Uninstall SheetJS, dùng exceljs 4.4.0

### v0.4.1 — Bỏ xuất Excel & Hoàn thiện Activity Log
- **Hoàn thiện Activity Log**: Ghi log cho sinh viên và giảng viên (thêm/sửa/xóa)

### v0.4.0 — Tính năng mới & Nâng cấp
- **Tab Quản lý tài khoản**: CRUD user trực tiếp trên web
- **Xuất PDF**: Lịch sử và Báo cáo hỗ trợ xuất PDF (print to PDF)
- **Activity Log**: Ghi log hoạt động (đăng nhập, thêm/xóa xe, thay đổi cấu hình...)
- **Full sync realtime**: Web nhận sự kiện đồng bộ dữ liệu từ Arduino qua Socket.IO

### v0.3.1 — Kiểm tra toàn bộ & Fix lỗi
- **Fix parking-serial.js**: FULL_SYNC broadcast kết quả tới web clients qua Socket.IO
- **Fix parking-ws.js**: Thêm gas_alarm event handler
- Build test: ✅ Compiled successfully, 0 errors

### v0.3.0 — Tối ưu code & Cleanup
- Xóa 33 shadcn/ui components không sử dụng (giảm ~70% thư mục ui/)
- Fix auth.ts: dùng db singleton thay vì tạo PrismaClient riêng
- Giữ 14 shadcn/ui components thực sự sử dụng

### v0.2.0 — Xác thực đăng nhập + CAPTCHA
- NextAuth.js v4 Credentials Provider + JWT
- Trang đăng nhập (`/login`) với logo TBU, dark/light theme
- CAPTCHA math-based (cộng/trừ/nhân), server-side verify
- Middleware bảo vệ route, phân quyền tab

### v0.1.0 — Refactoring chính + Arduino sync
- Split page.tsx thành 7 files (types + 6 tab components)
- History API: lọc theo ngày, Report API: dailyRevenue
- ReportsTab: BarChart doanh thu (recharts)
- Arduino LCD: hiển thị "Cho trong: X/Y"

### v0.0.1 — Phiên bản đầu tiên
- Next.js 16 + Prisma + MySQL + Socket.IO
- Arduino RFID integration
- Dashboard cơ bản với CRUD
