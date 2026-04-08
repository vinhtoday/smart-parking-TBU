'use client'

import { useCallback, useEffect } from 'react'

let audioCtx: AudioContext | null = null
let alarmTimeouts: ReturnType<typeof setTimeout>[] = []
let activeOscillators: OscillatorNode[] = []
let isAlarmPlaying = false
let audioUnlocked = false

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function stopAllOscillators() {
  for (const osc of activeOscillators) {
    try {
      osc.stop()
      osc.disconnect()
    } catch {
      // oscillator already stopped
    }
  }
  activeOscillators = []
}

function clearAllTimeouts() {
  for (const t of alarmTimeouts) {
    clearTimeout(t)
  }
  alarmTimeouts = []
}

// Chuông báo cháy: Two-tone siren ("wee-woo" pattern) — alternating 700Hz ↔ 1200Hz
function playFireSirenCycle() {
  if (!isAlarmPlaying) return
  const ctx = getAudioContext()

  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.type = 'square'

  const now = ctx.currentTime
  osc1.frequency.setValueAtTime(700, now)
  osc1.frequency.setValueAtTime(1200, now + 0.35)

  gain1.gain.setValueAtTime(0.28, now)
  gain1.gain.setValueAtTime(0.28, now + 0.30)
  gain1.gain.linearRampToValueAtTime(0.01, now + 0.34)
  gain1.gain.setValueAtTime(0.28, now + 0.35)
  gain1.gain.setValueAtTime(0.28, now + 0.65)
  gain1.gain.linearRampToValueAtTime(0.01, now + 0.70)

  osc1.start(now)
  osc1.stop(now + 0.70)
  activeOscillators.push(osc1)

  const timeout = setTimeout(() => {
    playFireSirenCycle()
  }, 850)
  alarmTimeouts.push(timeout)
}

// Chuông báo khí gas: Industrial horn — low frequency pulse
function playGasHornCycle() {
  if (!isAlarmPlaying) return
  const ctx = getAudioContext()

  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  const gain2 = ctx.createGain()

  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)

  osc1.type = 'sawtooth'
  osc2.type = 'sine'

  const now = ctx.currentTime
  osc1.frequency.setValueAtTime(350, now)
  osc1.frequency.linearRampToValueAtTime(200, now + 0.8)

  osc2.frequency.setValueAtTime(150, now)
  osc2.frequency.linearRampToValueAtTime(100, now + 0.8)

  gain1.gain.setValueAtTime(0.25, now)
  gain1.gain.setValueAtTime(0.25, now + 0.55)
  gain1.gain.linearRampToValueAtTime(0.01, now + 0.80)

  gain2.gain.setValueAtTime(0.15, now)
  gain2.gain.setValueAtTime(0.15, now + 0.55)
  gain2.gain.linearRampToValueAtTime(0.01, now + 0.80)

  osc1.start(now)
  osc1.stop(now + 0.80)
  osc2.start(now)
  osc2.stop(now + 0.80)
  activeOscillators.push(osc1, osc2)

  const timeout = setTimeout(() => {
    playGasHornCycle()
  }, 1050)
  alarmTimeouts.push(timeout)
}

export function useAlarmSound() {
  // Unlock AudioContext on first user interaction (click/keydown/touch)
  // Browser chặn autoplay — phải có user gesture mới cho phép phát âm
  useEffect(() => {
    function unlock() {
      if (audioUnlocked) return
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => { audioUnlocked = true }).catch(() => {})
      } else {
        audioUnlocked = true
      }
    }
    document.addEventListener('click', unlock, { once: false })
    document.addEventListener('keydown', unlock, { once: false })
    document.addEventListener('touchstart', unlock, { once: false })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  const startAlarmSound = useCallback(async (isFire: boolean) => {
    stopAllOscillators()
    clearAllTimeouts()
    isAlarmPlaying = true

    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
    } catch {
      // Browser chặn — thử tạo AudioContext mới
      try {
        audioCtx = new AudioContext()
        await audioCtx.resume()
      } catch {
        return
      }
    }

    if (isFire) {
      playFireSirenCycle()
    } else {
      playGasHornCycle()
    }
  }, [])

  const stopAlarmSound = useCallback(() => {
    isAlarmPlaying = false
    stopAllOscillators()
    clearAllTimeouts()
  }, [])

  return { startAlarmSound, stopAlarmSound }
}
