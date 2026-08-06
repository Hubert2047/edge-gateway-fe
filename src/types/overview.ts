export type ActivePowerPoint = {
    bucket: string
    activePower: number | null
}

export type MeterOverviewData = {
    activePower: ActivePowerPoint[]
    lastPolledAt: string | null
}

export type OverviewActivePower = Record<string, MeterOverviewData>
