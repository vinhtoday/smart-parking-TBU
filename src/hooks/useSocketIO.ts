'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { SocketAlarmData } from '@/types/arduino'

interface UseSocketIOProps {
  onVehicleEntry?: () => void
  onVehicleExit?: () => void
  onRfidScan?: (uid: string) => void
  onStatusChange?: () => void
  onFullSync?: () => void
  onFireAlarm?: (data: SocketAlarmData) => void
}

export function useSocketIO({
  onVehicleEntry,
  onVehicleExit,
  onRfidScan,
  onStatusChange,
  onFullSync,
  onFireAlarm,
}: UseSocketIOProps) {
  const [connected, setConnected] = useState(false)
  const callbacksRef = useRef({
    onVehicleEntry, onVehicleExit, onRfidScan,
    onStatusChange, onFullSync, onFireAlarm,
  })
  const socketRef = useRef<Socket | null>(null)

  // Keep callbacks ref up-to-date without triggering socket reconnect
  useEffect(() => {
    callbacksRef.current = {
      onVehicleEntry, onVehicleExit, onRfidScan,
      onStatusChange, onFullSync, onFireAlarm,
    }
  })

  useEffect(() => {
    let alive = true
    let socket: Socket | null = null
    try {
      socket = io('http://localhost:3003', {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 3000,
        timeout: 5000,
      })

      socketRef.current = socket

      socket.on('connect', () => { if (alive) setConnected(true) })
      socket.on('disconnect', () => { if (alive) setConnected(false) })

      socket.on('vehicle_entry', () => {
        if (alive) callbacksRef.current.onVehicleEntry?.()
      })
      socket.on('vehicle_exit', () => {
        if (alive) callbacksRef.current.onVehicleExit?.()
      })
      socket.on('rfid_scan', (data: Record<string, unknown>) => {
        if (!alive) return
        const uid = String(data?.rfidUid || data?.uid || '').replace(/\s+/g, '')
        callbacksRef.current.onRfidScan?.(uid)
      })
      socket.on('status_change', () => {
        if (alive) callbacksRef.current.onStatusChange?.()
      })
      socket.on('full_sync', () => {
        if (alive) callbacksRef.current.onFullSync?.()
      })
      socket.on('fire_alarm', (data: SocketAlarmData) => {
        if (alive) callbacksRef.current.onFireAlarm?.(data)
      })
      socket.on('connect_error', () => { if (alive) setConnected(false) })
    } catch {
      // Socket creation failed — connected stays false (initial state)
    }

    return () => {
      alive = false
      if (socket) {
        try { socket.disconnect() } catch {
          // disconnect failed silently
        }
      }
      socketRef.current = null
    }
  }, [])

  // Emit event to Socket.IO server (e.g., web_command to Arduino)
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { connected, emit }
}
