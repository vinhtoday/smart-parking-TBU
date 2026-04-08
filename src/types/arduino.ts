export interface ArduinoStatus {
  connected: boolean
  serialPort?: string
  baudRate?: number
  lastError?: string
  availablePorts?: SerialPortInfo[]
  lastActivity?: string
  [key: string]: unknown
}

export interface SerialPortInfo {
  path: string
  manufacturer?: string
  vendorId?: string
  productId?: string
}

export interface SocketAlarmData {
  isAlarm: boolean
  source: 'FLAME' | 'GAS' | string
  message?: string
  rfidUid?: string
  uid?: string
  [key: string]: unknown
}
