export interface Hub {
    uid: string
    hubName: string
    hubIp: string
    hubPort: number
    enabled: boolean
    pollIntervalSeconds: number
    meterCount: number
    note: string
    updatedAt: string
}

export interface HubFormValues {
    uid?: string
    hubName: string
    hubIp: string
    hubPort: number
    enabled: boolean
    pollIntervalSeconds: number
    note: string
}
