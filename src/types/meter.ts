export type PhaseMode = 'single_phase' | 'three_phase' | 'three_phase_balanced'
export type HardwareMeterType = string

export interface MeterCreateValues extends MeterFormValues {
    meterType: HardwareMeterType
}

export interface Meter {
    meterId: string
    macId: string
    gatewayUID: string
    name: string | null
    meterType: HardwareMeterType
    phaseMode: PhaseMode
    voltage: number
    powerFactor: number
    isVirtual: boolean
    enabled: boolean
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
    gatewayUID: string
    meterType: HardwareMeterType
    connectionType: string
    config: unknown
    note: string | null
}
