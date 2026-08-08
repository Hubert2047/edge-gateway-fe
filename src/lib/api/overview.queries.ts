'use client'

import { useQuery } from '@tanstack/react-query'
import type { OverviewActivePower } from '@/types/overview'
import { getOverviewActivePower } from './overview'

export const overviewKeys = {
    all: ['overview'] as const,
    metersActivePower: () => [...overviewKeys.all, 'meters-active-power'] as const,
}

export function useOverviewActivePower() {
    return useQuery<OverviewActivePower>({
        queryKey: overviewKeys.metersActivePower(),
        queryFn: getOverviewActivePower,
        staleTime: 60_000,
        gcTime: 60 * 1000,
        refetchInterval: 60 * 1000,
        retry: false,
    })
}
