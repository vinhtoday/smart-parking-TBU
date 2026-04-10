/**
 * Smart Parking WebSocket Server
 * Port: 3003
 * 
 * Relay giữa Arduino Serial Bridge và Web clients.
 * Broadcast realtime events.
 * 
 * Dùng Socket.IO rooms thay vì iterate thủ công.
 * Bridge → room "bridges"
 * Web clients → room "clients"
 * 
 * Events từ Arduino bridge:
 *   - rfid_scan:     { rfidUid, rfidUidFormatted }
 *   - vehicle_entry:  { rfidUid, personName, personType, isVip }
 *   - vehicle_exit:   { rfidUid, personName, fee, duration, ... }
 *   - full_sync:      { parkedVehicles: [...] }
 *   - status_change:  { isOpen }
 *   - fire_alarm:     { isAlarm, source, message }
 */

const { Server } = require('socket.io')

// Load .env file (Next.js tự load, nhưng node trực tiếp thì không)
// override: true để ghi đè biến env hệ thống
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env'), override: true }) } catch {}

const PORT = process.env.WS_PORT || 3003
const BRIDGE_SECRET = process.env.ARDUINO_WS_SECRET || ''

const io = new Server(PORT, {
  // 🔒 Restrict CORS to localhost only
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
})

console.log(`[WS] WebSocket server running on port ${PORT}`)

// ========================
// Broadcast tới web clients (room "clients")
// An toàn: io.to('clients').emit() không crash khi room trống
// ========================
function broadcastToClients(event, data) {
  try {
    const clients = io.sockets.adapter.rooms.get('clients')
    const count = clients ? clients.size : 0
    io.to('clients').emit(event, data)
    if (count > 0) {
      console.log(`[WS] → ${event} to ${count} clients`)
    }
  } catch (err) {
    console.error(`[WS] Error broadcasting ${event}:`, err.message)
  }
}

// Broadcast tới Arduino bridges (room "bridges")
function broadcastToBridges(event, data) {
  try {
    const bridges = io.sockets.adapter.rooms.get('bridges')
    const count = bridges ? bridges.size : 0
    io.to('bridges').emit(event, data)
    if (count > 0) {
      console.log(`[WS] → ${event} to ${count} bridges`)
    }
  } catch (err) {
    console.error(`[WS] Error sending to bridges (${event}):`, err.message)
  }
}

io.on('connection', (socket) => {
  const type = socket.handshake.auth?.type || socket.handshake.query?.type || 'client'
  const secret = socket.handshake.auth?.secret || ''
  console.log(`[WS] + Connected: ${socket.id} (${type})`)

  // 🔒 Verify bridge secret — prevent unauthorized bridge impersonation
  if (type === 'bridge') {
    if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
      console.log(`[WS]   ✗ Bridge rejected — invalid secret from ${socket.id}`)
      socket.emit('error', { message: 'Invalid bridge secret' })
      socket.disconnect(true)
      return
    }
    socket.join('bridges')
    console.log(`[WS]   ↳ Bridge joined room "bridges"${BRIDGE_SECRET ? ' (authenticated)' : ''}`)
  } else {
    socket.join('clients')
    console.log(`[WS]   ↳ Client joined room "clients"`)
  }

  // Nhận events từ bridge và broadcast tới tất cả web clients
  socket.on('rfid_scan', (data) => {
    broadcastToClients('rfid_scan', data)
  })

  socket.on('vehicle_entry', (data) => {
    broadcastToClients('vehicle_entry', data)
  })

  socket.on('vehicle_exit', (data) => {
    broadcastToClients('vehicle_exit', data)
  })

  socket.on('full_sync', (data) => {
    broadcastToClients('full_sync', data)
  })

  socket.on('status_change', (data) => {
    broadcastToClients('status_change', data)
  })

  socket.on('fire_alarm', (data) => {
    broadcastToClients('fire_alarm', data)
  })

  socket.on('gas_alarm', (data) => {
    broadcastToClients('fire_alarm', data) // Gộp vào fire_alarm event cho web xử lý thống nhất
  })

  // Web client gửi lệnh tới Arduino bridge (checkout, alarm bell, etc.)
  socket.on('web_command', (data) => {
    broadcastToBridges('web_command', data)
  })

  socket.on('disconnect', (reason) => {
    console.log(`[WS] - Disconnected: ${socket.id} (${type}) reason: ${reason}`)
  })
})

// Log stats mỗi 60s
setInterval(() => {
  try {
    const allSockets = io.sockets.adapter.rooms
    const clientCount = allSockets.get('clients')?.size || 0
    const bridgeCount = allSockets.get('bridges')?.size || 0
    if (clientCount > 0 || bridgeCount > 0) {
      console.log(`[WS] Stats: ${clientCount} clients, ${bridgeCount} bridges`)
    }
  } catch {}
}, 60000)

process.on('SIGTERM', () => {
  console.log('[WS] Shutting down...')
  io.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[WS] Interrupted...')
  io.close()
  process.exit(0)
})
