export interface CloudTarget {
    id: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecretMasked: string
    uploadIntervalSeconds: number
    enabled: boolean
    lastUploadAt: string | null
    pendingCount: number
}

export interface CloudTargetFormValues {
    id?: string
    name: string
    apiBaseUrl: string
    apiKey: string
    apiSecret: string
    uploadIntervalSeconds: number
    enabled: boolean
}

export interface TestConnectionResult {
    success: boolean
    message?: string
}
