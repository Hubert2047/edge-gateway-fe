export type ActivePowerPoint = {
    bucket: string
    activePower: number | null
}

export type OverviewActivePower = Record<string, ActivePowerPoint[]>
