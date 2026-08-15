export interface CloudTargetBackfillStatus {
    status: string
    createdCount: number
    estimatedTotalCount: number
    currentMeterUid?: string
    currentCursorTs?: number
}

export interface CloudTarget {
    id: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecretMasked: string
    uploadIntervalSec: number
    uploadBatchSize: number
    flushPauseMs: number
    enabled: boolean
    connectionStatus: string
    lastUploadAt: string | null
    realtimePending: number
    backfill?: CloudTargetBackfillStatus | null
}

export interface CloudTargetListResponse {
    targets: CloudTarget[]
    cloudTargetMax: number
    uploadedToday?: number
}

export interface CloudTargetFormValues {
    id?: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecret: string
    uploadIntervalSec: number
    uploadBatchSize: number
    flushPauseMs: number
    enabled: boolean
    backfillEnabled?: boolean
    backfillFromTs?: string
    backfillToTs?: string
}

export interface TestConnectionResult {
    success: boolean
    message?: string
}
