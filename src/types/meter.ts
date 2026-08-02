export type MeterType = 'single_phase' | 'three_phase'
export interface MeterCreateValues extends MeterFormValues {
    meterType: MeterType
}
export interface Meter {
    meterId?: string
    macId: string
    gatewayUID: string
    name: string | null
    meterType: MeterType
    measurementType: MeterType
    voltage: number
    powerFactor: number
    isVirtual: boolean
    enabled: boolean
    note: string | null
    createdAt: string
    updatedAt: string
}

export type MeterFormValues  = {
    macId: string
    name: string
    measurementType: MeterType
    voltage: number
    powerFactor: number
    enabled: boolean   
}

export interface MeterUpdateValues {
    macId: string
    name: string | null
    measurementType: MeterType
    voltage?: number
    powerFactor: number
    enabled: boolean
}

export interface MeterBulkSaveResult {
    succeeded: string[]
    failed: { macId: string; message: string }[]
}
