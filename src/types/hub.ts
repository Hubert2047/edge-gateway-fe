export interface Hub {
    id: number
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
    hubName: string
    hubIp: string
    hubPort: number
    enabled: boolean
    pollIntervalSeconds: number
    note: string
}