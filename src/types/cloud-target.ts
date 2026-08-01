export interface CloudTarget {
    id: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecretMasked: string
    uploadIntervalSec: number
    enabled: boolean
    lastUploadAt: string | null
    pendingReadings: number
    remainingRounds: number
}

export interface CloudTargetFormValues {
    id?: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecret: string
    uploadIntervalSec: number
    enabled: boolean
}

export interface TestConnectionResult {
    success: boolean
    message?: string
}
