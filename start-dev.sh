#!/bin/bash
# =============================================
# Smart Parking System - Dev Startup Script
# ĐH Thái Bình (TBU)
# =============================================

set -e

echo "========================================="
echo "  BÃI ĐỖ XE THÔNG MINH - TBU"
echo "  Khởi động môi trường development"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check prerequisites
echo -e "${YELLOW}[1/5]${NC} Kiểm tra prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt!"
    echo "Cài đặt: https://nodejs.org/"
    exit 1
fi
echo "  ✅ Node.js: $(node --version)"

if ! command -v npx &> /dev/null; then
    echo "❌ npx không tìm thấy!"
    exit 1
fi
echo "  ✅ npx: available"

# Check .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  File .env chưa tồn tại, tạo từ .env.example...${NC}"
    cp .env.example .env
    echo "  ✅ Đã tạo .env"
else
    echo "  ✅ .env: exists"
fi

# Install dependencies
echo ""
echo -e "${YELLOW}[2/5]${NC} Cài đặt dependencies..."
npm install --silent 2>&1 | tail -3
echo "  ✅ Dependencies installed"

# Setup database
echo ""
echo -e "${YELLOW}[3/5]${NC} Cài đặt database..."
npx prisma generate --silent 2>&1 | tail -2
npx prisma db push --accept-data-loss 2>&1 | tail -3
echo "  ✅ Database ready"

# (Seed sẽ chạy sau khi web server khởi động)

# Start services
echo ""
echo -e "${YELLOW}[4/5]${NC} Khởi động services..."
echo ""

# Kill existing processes on ports
echo -e "${CYAN}Dừng các process cũ...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

# Start WebSocket server (port 3003)
echo -e "${GREEN}▶ WebSocket Server (port 3003)${NC}"
node src/mini-services/parking-ws.js &
WS_PID=$!

# Start Arduino Serial Bridge (port 3004)
echo -e "${GREEN}▶ Arduino Serial Bridge (port 3004)${NC}"
node src/mini-services/parking-serial.js &
SERIAL_PID=$!

# Wait for mini-services
sleep 2

# Start Next.js dev server (port 3000)
echo -e "${GREEN}▶ Next.js Web Server (port 3000)${NC}"
npm run dev &
WEB_PID=$!

# Seed default config + users (chờ web server sẵn sàng)
echo ""
echo -e "${YELLOW}[5/5]${NC} Khởi tạo dữ liệu mặc định..."
sleep 5  # Đợi Next.js khởi động xong
curl -s -X POST http://localhost:3000/api/seed > /dev/null 2>&1 && echo "  ✅ Seed data ready" || echo "  ⚠️  Seed thất bại (chạy thủ công: curl -X POST http://localhost:3000/api/seed)"

echo ""
echo "========================================="
echo -e "${GREEN}✅ Tất cả services đã khởi động!${NC}"
echo "========================================="
echo ""
echo "  🌐 Website:     http://localhost:3000"
echo "  📡 WebSocket:   ws://localhost:3003"
echo "  🔌 Serial:      http://localhost:3004"
echo ""
echo "  PID - Web: $WEB_PID | WS: $WS_PID | Serial: $SERIAL_PID"
echo ""
echo "Nhấn Ctrl+C để dừng tất cả..."
echo ""

# Save PIDs for cleanup
echo "$WEB_PID $WS_PID $SERIAL_PID" > .dev-pids

# Wait for interrupt
wait
