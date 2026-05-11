import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Helper: fetch current stats from Next.js API
async function fetchStats() {
  try {
    const response = await fetch('http://localhost:3000/api/stats')
    if (response.ok) {
      const data = await response.json()
      return data.data || data
    }
  } catch (error) {
    console.error('Error fetching stats from API:', error)
  }
  return null
}

io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // On connection: send current stats
  const stats = await fetchStats()
  if (stats) {
    socket.emit('stats_update', stats)
  }

  // On 'vehicle_entry': broadcast to all clients
  socket.on('vehicle_entry', (data) => {
    console.log('Vehicle entry:', data)
    io.emit('vehicle_entry', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // On 'vehicle_exit': broadcast to all clients
  socket.on('vehicle_exit', (data) => {
    console.log('Vehicle exit:', data)
    io.emit('vehicle_exit', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // On 'rfid_scan': broadcast RFID UID to all clients
  socket.on('rfid_scan', (data) => {
    console.log('RFID scan:', data)
    io.emit('rfid_scan', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // On 'full_sync': broadcast full sync data
  socket.on('full_sync', (data) => {
    console.log('Full sync:', data)
    io.emit('full_sync', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // On 'barrier_open': broadcast barrier status
  socket.on('barrier_open', (data) => {
    console.log('Barrier open:', data)
    io.emit('barrier_open', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // On 'status_change': broadcast system status
  socket.on('status_change', (data) => {
    console.log('Status change:', data)
    io.emit('status_change', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // Request stats update
  socket.on('request_stats', async () => {
    const latestStats = await fetchStats()
    if (latestStats) {
      socket.emit('stats_update', latestStats)
    }
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// Periodically push stats to all connected clients every 30 seconds
setInterval(async () => {
  const stats = await fetchStats()
  if (stats) {
    io.emit('stats_update', stats)
  }
}, 30000)

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Parking WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
