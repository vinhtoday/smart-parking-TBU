/**
 * Parking Serial Bridge - Simulates Arduino serial communication
 * 
 * This is a test simulator that provides an HTTP API to:
 * - Simulate RFID scans
 * - Simulate vehicle entry/exit
 * - Send commands (FULL_SYNC, STATUS) to the main system
 * 
 * In production, this would connect to a real serial port
 * and communicate with the Arduino hardware.
 */

// ============ Configuration ============
const MAIN_API_URL = 'http://localhost:3000'
const WS_URL = 'http://localhost:3003'

// ============ State ============
let commandLog: Array<{ command: string; data: any; timestamp: string }> = []
let isRunning = true

// Sample RFID UIDs for testing
const sampleStudentUids = [
  'A1B2C3D4',
  'E5F6A7B8',
  'C9D0E1F2',
  'G3H4I5J6',
  'K7L8M9N0',
  'P1Q2R3S4',
  'T5U6V7W8',
  'X9Y0Z1A2',
]

const sampleTeacherUids = [
  'B3C4D5E6', // VIP
  'F7G8H9I0', // VIP
  'J1K2L3M4', // VIP
]

const sampleNames = [
  'Nguyễn Văn A',
  'Trần Thị B',
  'Lê Hoàng C',
  'Phạm Minh D',
  'Hoàng Thu E',
  'Đặng Quang F',
]

// ============ Helper Functions ============
function randomUid(type: 'student' | 'teacher'): string {
  const uids = type === 'student' ? sampleStudentUids : sampleTeacherUids
  return uids[Math.floor(Math.random() * uids.length)]
}

function randomName(): string {
  return sampleNames[Math.floor(Math.random() * sampleNames.length)]
}

function logCommand(command: string, data: any) {
  const entry = {
    command,
    data,
    timestamp: new Date().toISOString(),
  }
  commandLog.push(entry)
  // Keep last 100 commands
  if (commandLog.length > 100) {
    commandLog = commandLog.slice(-100)
  }
  console.log(`[${new Date().toLocaleTimeString()}] CMD: ${command}`, JSON.stringify(data))
}

// ============ HTTP Server (Bun native) ============
const server = Bun.serve({
  port: 3004,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    try {
      // GET /status - returns current state
      if (path === '/status' && req.method === 'GET') {
        return Response.json({
          success: true,
          data: {
            service: 'parking-serial',
            status: isRunning ? 'running' : 'stopped',
            mode: 'simulator',
            commandCount: commandLog.length,
            lastCommands: commandLog.slice(-10),
            availableStudentUids: sampleStudentUids,
            availableTeacherUids: sampleTeacherUids,
          },
        })
      }

      // POST /scan - simulates RFID scan
      if (path === '/scan' && req.method === 'POST') {
        const body = await req.json()
        const uid = body.uid || randomUid(body.type || 'student')
        const type = sampleTeacherUids.includes(uid) ? 'teacher' : 'student'
        const isVip = type === 'teacher'
        const name = body.name || randomName()

        const scanData = {
          uid,
          type,
          isVip,
          personName: name,
          timestamp: new Date().toISOString(),
        }

        logCommand('RFID_SCAN', scanData)

        // Forward to WebSocket
        try {
          const wsResponse = await fetch(WS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'rfid_scan',
              data: scanData,
            }),
          })
          // WebSocket doesn't accept HTTP POST directly, but we log it
          console.log('RFID scan event logged. Connect via WebSocket to receive events.')
        } catch {
          // WebSocket not available, that's ok
        }

        return Response.json({
          success: true,
          data: scanData,
          message: `Quét RFID: ${uid} - ${name} (${type})`,
        })
      }

      // POST /entry - simulates vehicle entry
      if (path === '/entry' && req.method === 'POST') {
        const body = await req.json()
        const uid = body.uid || randomUid(body.type || 'student')
        const type = sampleTeacherUids.includes(uid) ? 'teacher' : 'student'
        const isVip = type === 'teacher'
        const name = body.name || randomName()

        // Try to register via API
        try {
          const apiResponse = await fetch(`${MAIN_API_URL}/api/vehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rfidUid: uid,
              personName: name,
              personType: type,
              isVip,
            }),
          })
          const apiData = await apiResponse.json()
          logCommand('VEHICLE_ENTRY', { uid, name, type, isVip, result: apiData })
          return Response.json(apiData)
        } catch (error) {
          logCommand('VEHICLE_ENTRY', { uid, name, type, isVip, error: 'API unavailable' })
          return Response.json({
            success: false,
            error: 'Không thể kết nối đến API chính',
          })
        }
      }

      // POST /exit - simulates vehicle exit
      if (path === '/exit' && req.method === 'POST') {
        const body = await req.json()

        // If no uid specified, get one from parked vehicles
        let uid = body.uid
        if (!uid) {
          try {
            const parkedResponse = await fetch(`${MAIN_API_URL}/api/vehicles`)
            const parkedData = await parkedResponse.json()
            if (parkedData.success && parkedData.data.length > 0) {
              const randomVehicle = parkedData.data[Math.floor(Math.random() * parkedData.data.length)]
              uid = randomVehicle.rfidUid
            }
          } catch {
            // ignore
          }
        }

        if (!uid) {
          return Response.json({
            success: false,
            error: 'Không có xe nào trong bãi để ra',
          })
        }

        // Try to process exit via API
        try {
          const apiResponse = await fetch(`${MAIN_API_URL}/api/vehicles`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rfidUid: uid }),
          })
          const apiData = await apiResponse.json()
          logCommand('VEHICLE_EXIT', { uid, result: apiData })
          return Response.json(apiData)
        } catch (error) {
          logCommand('VEHICLE_EXIT', { uid, error: 'API unavailable' })
          return Response.json({
            success: false,
            error: 'Không thể kết nối đến API chính',
          })
        }
      }

      // POST /command - sends command
      if (path === '/command' && req.method === 'POST') {
        const body = await req.json()
        const { command } = body

        switch (command) {
          case 'FULL_SYNC': {
            // Fetch current parked vehicles and broadcast
            try {
              const response = await fetch(`${MAIN_API_URL}/api/vehicles`)
              const data = await response.json()
              const parkedVehicles = (data.data || []).map((v: any) => ({
                uid: v.rfidUid,
                isVip: v.isVip,
                personName: v.personName,
                entryTime: v.entryTime,
              }))
              logCommand('FULL_SYNC', { count: parkedVehicles.length })
              return Response.json({
                success: true,
                data: { parkedVehicles },
                message: `FULL_SYNC: ${parkedVehicles.length} xe trong bãi`,
              })
            } catch {
              return Response.json({ success: false, error: 'API unavailable' })
            }
          }

          case 'STATUS': {
            try {
              const response = await fetch(`${MAIN_API_URL}/api/stats`)
              const data = await response.json()
              logCommand('STATUS', data.data)
              return Response.json({
                success: true,
                data: data.data,
              })
            } catch {
              return Response.json({ success: false, error: 'API unavailable' })
            }
          }

          case 'BARRIER_OPEN': {
            logCommand('BARRIER_OPEN', { status: 'opened' })
            return Response.json({
              success: true,
              data: { status: 'opened', timestamp: new Date().toISOString() },
              message: 'Barrie đã mở',
            })
          }

          case 'PING': {
            logCommand('PING', {})
            return Response.json({
              success: true,
              data: { pong: true, timestamp: new Date().toISOString() },
            })
          }

          default:
            logCommand('UNKNOWN', { command })
            return Response.json({
              success: false,
              error: `Lệnh không xác nhận: ${command}`,
            })
        }
      }

      // POST /log - get command log
      if (path === '/log' && req.method === 'GET') {
        return Response.json({
          success: true,
          data: commandLog,
        })
      }

      // 404
      return Response.json(
        {
          success: false,
          error: 'Not found',
          availableEndpoints: [
            'GET /status - Trạng thái serial bridge',
            'POST /scan - Quét RFID (body: { uid?, type?, name? })',
            'POST /entry - Giả lập xe vào (body: { uid?, type?, name? })',
            'POST /exit - Giả lập xe ra (body: { uid? })',
            'POST /command - Gửi lệnh (body: { command: "FULL_SYNC|STATUS|BARRIER_OPEN|PING" })',
            'GET /log - Xem log lệnh',
          ],
        },
        { status: 404 }
      )
    } catch (error: any) {
      return Response.json(
        {
          success: false,
          error: error.message || 'Internal server error',
        },
        { status: 500 }
      )
    }
  },
})

console.log(`Parking Serial Bridge running on port ${server.port}`)
console.log(`Mode: Simulator (test environment)`)
console.log(`Main API: ${MAIN_API_URL}`)
console.log(`WebSocket: ${WS_URL}`)
console.log('')
console.log('Available endpoints:')
console.log('  GET  /status   - Trạng thái serial bridge')
console.log('  POST /scan     - Quét RFID')
console.log('  POST /entry    - Giả lập xe vào bãi')
console.log('  POST /exit     - Giả lập xe ra bãi')
console.log('  POST /command  - Gửi lệnh (FULL_SYNC, STATUS, BARRIER_OPEN, PING)')
console.log('  GET  /log      - Xem log lệnh')

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down serial bridge...')
  isRunning = false
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Shutting down serial bridge...')
  isRunning = false
  process.exit(0)
})
