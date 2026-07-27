export type MeterType = 'single_phase' | 'three_phase'

export interface Meter {
  macId: string
  hubUid: string
  meterName: string | null
  meterType: MeterType
  voltage: number
  powerFactor: number
  isVirtual: boolean
  enabled: boolean
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface MeterFormValues {
  macId: string
  meterName: string
  meterType: MeterType
  voltage: number
  powerFactor: number
}

export interface MeterUpdateValues {
  macId: string
  meterName?: string
  meterType?: MeterType
  voltage?: number
  powerFactor?: number
  enabled?: boolean
}

export interface MeterBulkSaveResult {
  succeeded: string[]
  failed: { macId: string; message: string }[]
}