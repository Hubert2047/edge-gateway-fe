export interface Hub {
    uid: string
    name: string
    ip: string
    port: number
    enabled: boolean
    pollIntervalSeconds: number
    meterCount: number
    note: string
    updatedAt: string
}

export interface HubFormValues {
    uid?: string
    name: string
    ip: string
    port: number
    enabled: boolean
    pollIntervalSeconds: number
    note: string
}
