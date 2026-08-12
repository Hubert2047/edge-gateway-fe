export type PhaseMode = 'single_phase' | 'three_phase' | 'three_phase_balanced'
export type HardwareMeterType = string

export interface MeterCreateValues extends MeterFormValues {
    meterType: HardwareMeterType
}
export type MeterStatus = 'online' | 'offline' | 'disabled'
export interface Meter {
    meterId: string
    macId: string
    gatewayId: number
    name: string | null
    meterType: HardwareMeterType
    phaseMode: PhaseMode
    voltage: number
    powerFactor: number
    isVirtual: boolean
    enabled: boolean
    lastSeenAt?: string
    lastState?: number | null
    isOnline?: boolean
    note: string | null
    createdAt: string
    updatedAt: string
    connectionType: string
    config: unknown
}

export type MeterFormValues = {
    macId: string
    name: string
    phaseMode: PhaseMode
    voltage: number
    powerFactor: number
    enabled: boolean
}

export interface MeterUpdateValues {
    macId: string
    name: string | null
    phaseMode: PhaseMode
    voltage?: number
    powerFactor: number
    enabled: boolean
}

export interface MeterBulkSaveResult {
    succeeded: string[]
    failed: { macId: string; message: string }[]
}

export interface MeterBatchUpdateValues extends MeterUpdateValues {
    meterId: string
    gatewayId: number
    meterType: HardwareMeterType
    connectionType: string
    config: unknown
    note: string | null
}
