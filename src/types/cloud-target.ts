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

export interface CloudTargetListResponse {
    targets: CloudTarget[]
    cloudTargetMax: number
}

export interface CloudTargetFormValues {
    id?: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecret: string
    uploadIntervalSec: number
    enabled: boolean
    backfillEnabled?: boolean
    backfillFromTs?: string
    backfillToTs?: string
}

export interface TestConnectionResult {
    success: boolean
    message?: string
}
