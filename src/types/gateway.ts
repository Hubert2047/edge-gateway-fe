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
}

export interface GatewayFormValues {
    uid: string
    name: string
    ip: string
    port: number
    enabled: boolean
    pollIntervalSeconds: number
    note: string
}
