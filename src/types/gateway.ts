export interface Gateway {
    id: number
    name: string
    ip: string
    port: number
    enabled: boolean
    pollIntervalSeconds: number
    meterCount: number
    note: string
    lastSeenAt?: string | null
    isOnline?: boolean
    updatedAt: string
    isVirtual: boolean
}

export interface GatewayFormValues {
    name: string
    ip: string
    port: number
    enabled: boolean
    pollIntervalSeconds: number
    note: string
}
