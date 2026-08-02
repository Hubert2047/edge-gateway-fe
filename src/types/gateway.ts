export interface Gateway {
    uid: string
    name: string
    ip: string
    port: number
    enabled: boolean
    pollIntervalSeconds: number
    meterCount: number
    note: string
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
