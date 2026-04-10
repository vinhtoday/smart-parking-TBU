/**
 * Smart Parking Arduino Serial Bridge
 * Port: 3004
 *
 * Tính năng:
 *  - Auto-detect cổng Serial
 *  - Auto-retry kết nối (mỗi 5s)
 *  - API đổi COM port từ web (POST /connect)
 *  - Đọc JSON từ Arduino Serial
 *  - HTTP endpoints để test
 *
 * Arduino gửi JSON:
 *   {"type":"RFID_SCAN","data":{"uid":"4B9C0705"}}
 *   {"type":"VEHICLE_ENTRY","data":{"uid":"4B9C0705",...}}
 *   {"type":"VEHICLE_EXIT","data":{"uid":"4B9C0705",...}}
 *   {"type":"FULL_SYNC","data":{"parkedVehicles":[...],...}}
 *   {"type":"STATUS","data":{"message":"SYSTEM_READY",...}}
 *
 * Arduino nghe lệnh: "SYNC\n", "STATUS\n"
 */

const http = require('http')
const path = require('path')

// Load .env file
try { require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }) } catch {}

const PORT = process.env.SERIAL_PORT || 3004
const WS_PORT = process.env.WS_PORT || 3003
let SERIAL_PORT_NAME = process.env.ARDUINO_SERIAL_PORT || ''
const BAUD_RATE = parseInt(process.env.ARDUINO_BAUD_RATE || '9600')
const RETRY_INTERVAL = 5000 // Thử kết nối lại mỗi 5 giây

let arduinoSerial = null
let arduinoRealConnected = false
let wsSocket = null
let serialBuffer = ''
let retryTimer = null
let lastError = ''
let availablePorts = []
let connectionAttempt = 0

// ========================
// WebSocket - broadcast tới web clients
// ========================
function connectWebSocket() {
  try {
    wsSocket = require('socket.io-client')(`http://localhost:${WS_PORT}`, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      timeout: 5000,
      auth: { type: 'bridge' },
    })
    wsSocket.on('connect', () => {
      console.log(`[Serial] ✅ WebSocket connected (port ${WS_PORT})`)
    })
    wsSocket.on('disconnect', () => {
      console.log(`[Serial] ⚠️ WebSocket disconnected`)
    })
    wsSocket.on('connect_error', () => {})
    wsSocket.on('reconnect_attempt', (attempt) => {
      console.log(`[Serial] 🔄 WebSocket reconnecting... attempt ${attempt}`)
    })
    wsSocket.on('reconnect_failed', () => {
      console.log(`[Serial] ❌ WebSocket reconnection failed`)
    })

    // Lắng nghe lệnh từ Web (qua Socket.IO relay)
    wsSocket.on('web_command', (cmdData) => {
      console.log(`[Serial] ⚡ Web command nhận được:`, cmdData?.command ? cmdData.command.substring(0, 100) : 'empty')
      const cmd = cmdData?.command || ''
      if (cmd) {
        sendToArduino(cmd)
      }
    })
  } catch (e) {
    console.log(`[Serial] ⚠️ Cannot connect to WebSocket: ${e.message}`)
  }
}

function broadcast(event, data) {
  try {
    if (wsSocket && wsSocket.connected) {
      wsSocket.emit(event, data)
    }
  } catch (err) {
    console.error(`[Serial] ⚠️ Broadcast error (${event}):`, err.message)
  }
}

// ========================
// Format UID: "4B9C0705" → "4B 9C 07 05"
// ========================
function formatUid(hex) {
  if (!hex || hex.length < 4) return hex
  return hex.match(/.{1,2}/g).join(' ').toUpperCase()
}

// ========================
// Xử lý event từ Arduino
// ========================
async function handleArduinoEvent(type, data) {
  // Normalize UID: strip spaces + uppercase (Arduino may send "A3 B2 C1 D0")
  const rawUid = (data?.uid || '').replace(/\s+/g, '').toUpperCase()
  const uidFormatted = formatUid(rawUid)

  console.log(`[Serial] 📡 ${type} | UID: ${uidFormatted}`)

  if (type === 'RFID_SCAN') {
    broadcast('rfid_scan', { rfidUid: rawUid, rfidUidFormatted: uidFormatted })

    // Phản hồi Arduino NGAY — kiểm tra xe đang đỗ để quyết định ENTRY/EXIT
    try {
      const vehiclesRes = await fetch('http://localhost:3000/api/vehicles')
      const vehiclesJson = await vehiclesRes.json()
      const isParked = vehiclesJson.success &&
        Array.isArray(vehiclesJson.data) &&
        vehiclesJson.data.some((v) => (v.rfidUid || '').replace(/\s+/g, '').toUpperCase() === rawUid)

      sendToArduino(JSON.stringify({
        type: 'WEB_RESPONSE',
        action: isParked ? 'EXIT' : 'ENTRY',
        rfidUid: rawUid,
        isParked,
        message: isParked ? 'XE_RA' : 'XE_VAO',
      }))
      console.log(`[Serial] → Arduino: WEB_RESPONSE ${isParked ? 'EXIT' : 'ENTRY'} (${uidFormatted})`)
    } catch (e) {
      // Nếu API lỗi, vẫn phản hồi cho Arduino để không bị treo
      sendToArduino(JSON.stringify({
        type: 'WEB_RESPONSE',
        action: 'ENTRY',
        rfidUid: rawUid,
        isParked: false,
        message: 'XE_VAO',
      }))
    }
    return
  }

  if (type === 'VEHICLE_ENTRY') {
    const scanData = {
      rfidUid: rawUid,
      personName: data?.personName || 'Khách',
      personType: data?.personType || 'guest',
      isVip: data?.isVip === true || data?.isVip === 'true',
    }

    try {
      const res = await fetch('http://localhost:3000/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData),
      })
      const json = await res.json()
      if (json.success) {
        console.log(`[Serial] ✅ Xe VÀO: ${scanData.personName} (${uidFormatted})`)
        broadcast('vehicle_entry', scanData)
        // Phản hồi Arduino NGAY — xe vào thành công
        sendToArduino(JSON.stringify({
          type: 'WEB_RESPONSE', action: 'VEHICLE_ENTRY', success: true,
          rfidUid: rawUid, personName: scanData.personName, personType: scanData.personType,
          message: 'OK_ENTRY',
        }))
      } else {
        console.log(`[Serial] ❌ Lỗi xe VÀO: ${json.error}`)
        broadcast('rfid_scan', { rfidUid: rawUid, rfidUidFormatted: uidFormatted, error: json.error })
        // Phản hồi Arduino — xe vào thất bại
        sendToArduino(JSON.stringify({
          type: 'WEB_RESPONSE', action: 'VEHICLE_ENTRY', success: false,
          rfidUid: rawUid, message: json.error || 'LOI',
        }))
      }
    } catch (e) {
      console.error(`[Serial] ❌ API lỗi: ${e.message}`)
    }
    return
  }

  if (type === 'VEHICLE_EXIT') {
    try {
      const res = await fetch('http://localhost:3000/api/vehicles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidUid: rawUid }),
      })
      const json = await res.json()
      if (json.success) {
        console.log(`[Serial] ✅ Xe RA: ${data?.personName || ''} (${uidFormatted}) | Phí: ${data?.fee || 0}đ | Thời gian: ${data?.duration || 0}s`)
        broadcast('vehicle_exit', json.data)
        // Phản hồi Arduino NGAY — xe ra thành công
        sendToArduino(JSON.stringify({
          type: 'WEB_RESPONSE', action: 'VEHICLE_EXIT', success: true,
          rfidUid: rawUid, fee: json.data?.fee || 0, duration: json.data?.duration || 0,
          message: 'OK_EXIT',
        }))
      } else {
        console.log(`[Serial] ❌ Lỗi xe RA: ${json.error}`)
        // Phản hồi Arduino — xe ra thất bại
        sendToArduino(JSON.stringify({
          type: 'WEB_RESPONSE', action: 'VEHICLE_EXIT', success: false,
          rfidUid: rawUid, message: json.error || 'LOI',
        }))
      }
    } catch (e) {
      console.error(`[Serial] ❌ API lỗi: ${e.message}`)
    }
    return
  }

  if (type === 'FULL_SYNC') {
    const syncData = {
      parkedVehicles: (data?.parkedVehicles || []).map(v => ({
        uid: (v.uid || '').replace(/\s+/g, '').toUpperCase(),
        personName: v.personName || '',
        personType: v.personType || '',  // Don't fallback to 'student' — let API decide via DB lookup
        isVip: v.isVip || false,
        entryTime: v.entryTime ? new Date(v.entryTime * 1000).toISOString() : new Date().toISOString(),
      })),
      parkedCount: data?.parkedCount || 0,
      studentCount: data?.studentCount || 0,
      teacherCount: data?.teacherCount || 0,
    }

    try {
      const res = await fetch('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData),
      })
      const json = await res.json()
      console.log(`[Serial] 🔄 Full sync: ${json.data?.message || 'OK'}`)
      // Broadcast để web dashboard biết dữ liệu đã được sync
      broadcast('full_sync', json.data)
    } catch (e) {
      console.error(`[Serial] ❌ Sync lỗi: ${e.message}`)
    }
    return
  }

  if (type === 'STATUS') {
    console.log(`[Serial] ℹ️ Arduino status: ${data?.message || 'OK'} | Xe: ${data?.parkedCount || 0}`)
    arduinoRealConnected = true
    return
  }

  // Fire alarm from Arduino
  if (type === 'FIRE_ALARM' || type === 'FIRE_CLEARED') {
    const isAlarm = type === 'FIRE_ALARM'
    const source = data?.source || 'UNKNOWN'
    console.log(`[Serial] ${isAlarm ? '🔥 CẢNH BÁO' : '✅ Đã xử lý'} | Nguồn: ${source}`)
    broadcast('fire_alarm', { isAlarm, source, message: data?.message || (isAlarm ? 'CANH BAO!' : 'Da xu ly') })
    return
  }

  // Gas alarm riêng (nếu Arduino gửi event type riêng cho gas)
  if (type === 'GAS_ALARM' || type === 'GAS_CLEARED') {
    const isAlarm = type === 'GAS_ALARM'
    const source = data?.source || 'GAS'
    console.log(`[Serial] ${isAlarm ? '💨 CẢNH BÁO GAS' : '✅ Gas đã xử lý'} | Nguồn: ${source}`)
    broadcast('fire_alarm', { isAlarm, source, message: data?.message || (isAlarm ? 'CANH BAO GAS!' : 'Da xu ly') })
    return
  }
}

// ========================
// Liệt kê cổng Serial khả dụng
// ========================
async function listSerialPorts() {
  try {
    const serialportModule = await import('serialport').catch(() => null)
    if (!serialportModule) return []
    const SerialPort = serialportModule.SerialPort
    const ports = await SerialPort.list()
    availablePorts = ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || '',
      vendorId: p.vendorId || '',
      productId: p.productId || '',
    }))
    return availablePorts
  } catch (e) {
    console.error(`[Serial] ❌ Không thể liệt kê cổng: ${e.message}`)
    return []
  }
}

// ========================
// Kết nối Serial
// ========================
async function connectArduinoSerial() {
  // Dừng retry cũ
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }

  // Đóng kết nối cũ nếu có
  if (arduinoSerial) {
    try { arduinoSerial.close() } catch {}
    arduinoSerial = null
  }

  // Nếu không có port → tự detect
  if (!SERIAL_PORT_NAME) {
    console.log(`[Serial] 🔍 ARDUINO_SERIAL_PORT chưa đặt → tự tìm cổng...`)
    const ports = await listSerialPorts()
    if (ports.length === 0) {
      console.log(`[Serial] ⚠️  Không tìm thấy cổng Serial nào`)
      console.log(`[Serial]    Đảm bảo Arduino đã cắm USB và driver đã cài`)
      console.log(`[Serial]    Hoặc đặt trong .env: ARDUINO_SERIAL_PORT=COM5`)
      lastError = 'Không tìm thấy cổng Serial. Cắm Arduino hoặc đặt ARDUINO_SERIAL_PORT trong .env'
      scheduleRetry()
      return
    }

    // Thử tìm Arduino (thường có vendorId 2341 hoặc manufacturer "Arduino")
    const arduinoPort = ports.find(p =>
      p.manufacturer?.includes('Arduino') ||
      p.manufacturer?.includes('CH340') ||
      p.manufacturer?.includes('CH341') ||
      p.manufacturer?.includes('FTDI') ||
      p.vendorId === '2341' || // Arduino official
      p.vendorId === '1a86'    // CH340
    )

    if (arduinoPort) {
      SERIAL_PORT_NAME = arduinoPort.path
      console.log(`[Serial] 🎯 Tìm thấy Arduino: ${SERIAL_PORT_NAME} (${arduinoPort.manufacturer})`)
    } else {
      // Không tìm được → dùng cổng đầu tiên
      SERIAL_PORT_NAME = ports[0].path
      console.log(`[Serial] 🤔 Không nhận diện được Arduino, thử cổng: ${SERIAL_PORT_NAME}`)
      console.log(`[Serial]    Các cổng khả dụng:`)
      for (const p of ports) {
        console.log(`      - ${p.path} (${p.manufacturer || 'Unknown'})`)
      }
    }
  }

  connectionAttempt++
  console.log(`[Serial] 🔌 Thử kết nối ${SERIAL_PORT_NAME}... (lần ${connectionAttempt})`)

  try {
    const serialportModule = await import('serialport').catch(() => null)
    if (!serialportModule) throw new Error('serialport not available')
    const SerialPort = serialportModule.SerialPort

    arduinoSerial = new SerialPort({
      path: SERIAL_PORT_NAME,
      baudRate: BAUD_RATE,
    })

    arduinoSerial.on('open', () => {
      console.log(`[Serial] ✅ Đã kết nối Arduino trên ${SERIAL_PORT_NAME} (${BAUD_RATE} baud)`)
      arduinoRealConnected = true
      lastError = ''
      connectionAttempt = 0

      // Yêu cầu Arduino gửi sync ngay
      setTimeout(() => {
        if (arduinoSerial && arduinoSerial.open) {
          arduinoSerial.write('SYNC\n')
          console.log(`[Serial] → Arduino: SYNC`)
        }
      }, 1500)
    })

    arduinoSerial.on('data', (chunk) => {
      const text = chunk.toString()
      serialBuffer += text

      // Tách theo dòng (mỗi JSON kết thúc bằng \n)
      const lines = serialBuffer.split('\n')
      serialBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const json = JSON.parse(trimmed)
          const type = json.type
          const data = json.data || {}
          handleArduinoEvent(type, data)
        } catch (e) {
          // Không phải JSON → log ra để debug
          console.log(`[Serial] ? Non-JSON: ${trimmed.substring(0, 80)}`)
        }
      }
    })

    arduinoSerial.on('close', () => {
      console.log(`[Serial] ⚠️ Arduino disconnected (${SERIAL_PORT_NAME})`)
      arduinoRealConnected = false
      arduinoSerial = null
      scheduleRetry()
    })

    arduinoSerial.on('error', (err) => {
      arduinoRealConnected = false
      arduinoSerial = null
      lastError = err.message

      if (err.message.includes('No such file') || err.message.includes('cannot open') || err.message.includes('Access denied') || err.message.includes('Permission')) {
        console.error(`[Serial] ❌ Không mở được ${SERIAL_PORT_NAME}: ${err.message}`)
        console.log(`[Serial]    Kiểm tra:`)
        console.log(`      1. Arduino đã cắm USB chưa?`)
        console.log(`      2. Cổng đúng chưa? (Hiện tại: ${SERIAL_PORT_NAME})`)
        console.log(`      3. Arduino IDE đang dùng cổng này không? (Đóng Arduino IDE Serial Monitor)`)
        console.log(`      4. Trên Linux: sudo usermod -aG dialout $USER rồi logout/login`)
      } else {
        console.error(`[Serial] ❌ Serial error: ${err.message}`)
      }
      scheduleRetry()
    })
  } catch (e) {
    console.error(`[Serial] ❌ Lỗi: ${e.message}`)
    lastError = e.message
    scheduleRetry()
  }
}

// ========================
// Retry scheduler
// ========================
function scheduleRetry() {
  if (retryTimer) return
  if (arduinoSerial && arduinoSerial.open) return // Đã kết nối

  retryTimer = setTimeout(() => {
    retryTimer = null
    connectArduinoSerial()
  }, RETRY_INTERVAL)
}

// ========================
// Gửi lệnh tới Arduino
// ========================
function sendToArduino(cmd) {
  if (arduinoSerial && arduinoSerial.open) {
    arduinoSerial.write(cmd + '\n')
    console.log(`[Serial] → Arduino: ${cmd}`)
    return true
  }
  console.log(`[Serial] ⚠️ Không gửi được — Arduino chưa kết nối`)
  return false
}

// ========================
// HTTP Server
// ========================
const server = http.createServer((req, res) => {
  // 🔒 Restrict CORS to localhost only
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const parsedUrl = new URL(req.url || '', `http://localhost:${PORT}`)
  const pathname = parsedUrl.pathname

  // GET /status - Trạng thái chi tiết
  if (req.method === 'GET' && pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: true,
      connected: arduinoRealConnected,
      mode: arduinoRealConnected ? 'serial' : 'http_test',
      serialPort: SERIAL_PORT_NAME || 'auto',
      baudRate: BAUD_RATE,
      lastError: lastError || null,
      attempt: connectionAttempt,
      availablePorts: availablePorts,
      wsConnected: wsSocket?.connected || false,
      message: arduinoRealConnected
        ? `Arduino đã kết nối trên ${SERIAL_PORT_NAME}`
        : lastError
          ? `Lỗi: ${lastError}`
          : `Chưa kết nối Arduino. Tự tìm cổng hoặc đặt ARDUINO_SERIAL_PORT trong .env`,
    }))
    return
  }

  // GET /ports - Liệt kê cổng Serial
  if (req.method === 'GET' && pathname === '/ports') {
    listSerialPorts().then(ports => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        current: SERIAL_PORT_NAME || 'auto',
        ports: ports,
      }))
    }).catch(() => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Không thể liệt kê cổng' }))
    })
    return
  }

  // POST /connect - Đổi cổng và kết nối lại
  if (req.method === 'POST' && pathname === '/connect') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {}
        const newPort = data.port || data.serialPort || ''

        if (!newPort) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Thiếu "port" (ví dụ: "COM5" hoặc "/dev/ttyUSB0")' }))
          return
        }

        SERIAL_PORT_NAME = newPort
        connectionAttempt = 0
        lastError = ''
        console.log(`[Serial] 🔄 Đổi cổng sang: ${SERIAL_PORT_NAME}`)

        // Kết nối lại ngay
        connectArduinoSerial()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          message: `Đang kết nối ${SERIAL_PORT_NAME}...`,
          port: SERIAL_PORT_NAME,
        }))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Lỗi' }))
      }
    })
    return
  }

  // POST /scan - Test quét thẻ
  if (req.method === 'POST' && pathname === '/scan') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        let scanData
        if (body) {
          try { scanData = JSON.parse(body) } catch { scanData = null }
        }

        if (scanData && scanData.uid) {
          handleArduinoEvent('RFID_SCAN', { uid: scanData.uid })
        } else {
          const mockUids = ['4B9C0705', 'E5F67890', '11223344', '55667788']
          const mockUid = mockUids[Math.floor(Math.random() * mockUids.length)]
          handleArduinoEvent('RFID_SCAN', { uid: mockUid })
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, message: 'Scan processed' }))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Lỗi scan' }))
      }
    })
    return
  }

  // POST /entry - Test xe vào
  if (req.method === 'POST' && pathname === '/entry') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        let data = body ? JSON.parse(body) : {}
        handleArduinoEvent('VEHICLE_ENTRY', {
          uid: data.uid || '4B9C0705',
          personName: data.personName || 'Test',
          personType: data.personType || 'student',
          isVip: data.isVip || false,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, message: 'Entry processed' }))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Lỗi' }))
      }
    })
    return
  }

  // POST /exit - Test xe ra
  if (req.method === 'POST' && pathname === '/exit') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        let data = body ? JSON.parse(body) : {}
        handleArduinoEvent('VEHICLE_EXIT', {
          uid: data.uid || '4B9C0705',
          personName: data.personName || 'Test',
          isVip: data.isVip || false,
          fee: data.fee || 2000,
          duration: data.duration || 300,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, message: 'Exit processed' }))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Lỗi' }))
      }
    })
    return
  }

  // POST /sync - Yêu cầu Arduino gửi full sync
  if (req.method === 'POST' && pathname === '/sync') {
    const sent = sendToArduino('SYNC')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: sent,
      message: sent ? 'SYNC command sent to Arduino' : 'Arduino chưa kết nối',
    }))
    return
  }

  // POST /command - Gửi lệnh tuỳ ý tới Arduino
  if (req.method === 'POST' && pathname === '/command') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {}
        const cmd = data.command || ''
        if (!cmd) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Thiếu "command"' }))
          return
        }
        const sent = sendToArduino(cmd)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: sent, command: cmd }))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Lỗi' }))
      }
    })
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ success: false, error: 'Endpoint không tồn tại' }))
})

server.listen(PORT, '127.0.0.1', async () => {
  console.log('')
  console.log('========================================')
  console.log('  🔌 Arduino Serial Bridge')
  console.log(`  HTTP Port: ${PORT}`)
  console.log(`  WebSocket: ${WS_PORT}`)
  console.log(`  Serial: ${SERIAL_PORT_NAME || '(tự detect)'} (${BAUD_RATE} baud)`)
  console.log('========================================')
  console.log('')
  console.log('Endpoints:')
  console.log(`  GET  http://localhost:${PORT}/status   - Trạng thái chi tiết`)
  console.log(`  GET  http://localhost:${PORT}/ports    - Liệt kê cổng Serial`)
  console.log(`  POST http://localhost:${PORT}/connect  - Đổi cổng {"port":"COM5"}`)
  console.log(`  POST http://localhost:${PORT}/scan     - Test quét thẻ`)
  console.log(`  POST http://localhost:${PORT}/entry    - Test xe vào`)
  console.log(`  POST http://localhost:${PORT}/exit     - Test xe ra`)
  console.log(`  POST http://localhost:${PORT}/sync     - Yêu cầu sync từ Arduino`)
  console.log(`  POST http://localhost:${PORT}/command  - Gửi lệnh {"command":"OPEN"}`)
  console.log('')

  // Liệt kê cổng ngay khi khởi động
  const ports = await listSerialPorts()
  if (ports.length > 0) {
    console.log('Cổng Serial khả dụng:')
    for (const p of ports) {
      const isArduino = p.manufacturer?.includes('Arduino') || p.manufacturer?.includes('CH340') || p.manufacturer?.includes('CH341') || p.manufacturer?.includes('FTDI')
      console.log(`  ${isArduino ? '🤖' : '  '} ${p.path}  (${p.manufacturer || 'Unknown'})`)
    }
    console.log('')
  } else {
    console.log('⚠️  Không tìm thấy cổng Serial nào.')
    console.log('   Đảm bảo Arduino đã cắm USB và driver đã cài.')
    console.log('')
  }

  // Kết nối WebSocket trước
  connectWebSocket()

  // Kết nối Serial (sẽ auto-detect nếu chưa đặt)
  connectArduinoSerial()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Serial] Shutting down...')
  if (retryTimer) clearTimeout(retryTimer)
  if (arduinoSerial) try { arduinoSerial.close() } catch {}
  server.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Serial] Interrupted...')
  if (retryTimer) clearTimeout(retryTimer)
  if (arduinoSerial) try { arduinoSerial.close() } catch {}
  server.close()
  process.exit(0)
})
