export type ActivePowerPoint = {
    bucket: string
    activePower: number | null
}

export type MeterOverviewData = {
    activePower: ActivePowerPoint[]
    lastPolledAt: string | null
    voltage: number | null
    avgCurrent: number | null
    l1: number | null
    l2: number | null
    l3: number | null
}
export type OverviewActivePower = Record<string, MeterOverviewData>
