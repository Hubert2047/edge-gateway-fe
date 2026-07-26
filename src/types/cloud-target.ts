export interface CloudTarget {
    id: string
    name: string
    apiBaseUrl: string
    cloudServerId: string
    cloudServerSecret: string
    uploadIntervalSeconds: number
    enabled: boolean
    lastUploadAt: string | null
    pendingCount: number
}

export interface CloudTargetFormValues {
    id?: string
    name: string
    apiBaseUrl: string
    cloudServerId: string
    cloudServerSecret: string
    uploadIntervalSeconds: number
    enabled: boolean
}

export interface TestConnectionResult {
    success: boolean
    message?: string
}