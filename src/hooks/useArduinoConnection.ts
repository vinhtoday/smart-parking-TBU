'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ArduinoStatus, SerialPortInfo } from '@/types/arduino'

export function useArduinoConnection() {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState<ArduinoStatus | null>(null)
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([])
  const [customPort, setCustomPort] = useState('')
  const [connecting, setConnecting] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch('http://localhost:3004/status', { signal: controller.signal })
      clearTimeout(timeoutId)
      const json: ArduinoStatus = await res.json()
      setConnected(json.connected === true)
      setStatus(json)
      setSerialPorts(json.availablePorts || [])
    } catch {
      setConnected(false)
      setStatus(null)
    }
  }, [])

  const connectSerial = useCallback(async (port: string) => {
    setConnecting(true)
    try {
      const res = await fetch('http://localhost:3004/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
      })
      const json = await res.json()
      if (json.success) {
        setCustomPort('')
        setTimeout(checkStatus, 3000)
        setTimeout(checkStatus, 6000)
      }
      return json
    } catch {
      return { success: false, error: 'Không thể kết nối Serial Bridge' }
    } finally {
      setConnecting(false)
    }
  }, [checkStatus])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [checkStatus])

  return {
    connected, status, serialPorts, customPort, setCustomPort, connecting,
    checkStatus, connectSerial,
  }
}
