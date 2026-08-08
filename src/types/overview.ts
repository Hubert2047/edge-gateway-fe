export type ActivePowerPoint = {
    bucket: string
    activePower: number | null
}

export type MeterOverviewData = {
    activePower: ActivePowerPoint[]
    lastPolledAt: string | null
    voltage: number | null
    avgCurrent: number | null
    ch1Current: number | null
    ch2Current: number | null
    ch3Current: number | null
}
export type OverviewActivePower = Record<string, MeterOverviewData>
