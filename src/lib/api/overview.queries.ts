'use client'

import { useQuery } from '@tanstack/react-query'
import type { OverviewActivePower } from '@/types/overview'
import { getOverviewActivePower } from './overview'
import { Gateway } from '@/types/gateway'
import { Meter } from '@/types/meter'
import { GATEWAY_ENDPOINT, METER_ENDPOINT } from '@/constances/url'
import { apiFetch } from './client'

export const overviewKeys = {
    all: ['overview'] as const,
    metersActivePower: () => [...overviewKeys.all, 'meters-active-power'] as const,
    meters: () => [...overviewKeys.all, 'meters'] as const,
}
export const OVERVIEW_REFETCH_TIME = 60_000
export function useOverviewActivePower() {
    return useQuery<OverviewActivePower>({
        queryKey: overviewKeys.metersActivePower(),
        queryFn: getOverviewActivePower,
        staleTime: OVERVIEW_REFETCH_TIME,
        retry: false,
    })
}

export function useOverviewMeters(initialData: Meter[]) {
    return useQuery({
        queryKey: overviewKeys.meters(),
        queryFn: () => apiFetch<Meter[]>(METER_ENDPOINT.base),
        initialData,
        staleTime: OVERVIEW_REFETCH_TIME,
    })
}