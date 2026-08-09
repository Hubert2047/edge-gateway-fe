'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { TIMESERIES_ENDPOINT } from '@/constances/url'
import type { TimeseriesAxis, TimeseriesPoint } from '@/types/timeseries'
import { apiFetch } from './client'

export type TimeseriesParams = { gatewayUid: string; meterId: string; axis: TimeseriesAxis; start: string; end: string }
export const timeseriesKeys = { all: ['timeseries'] as const, get: (params: TimeseriesParams) => [...timeseriesKeys.all, params] as const }

export function useTimeseries(params: TimeseriesParams, enabled: boolean) {
    return useQuery({
        queryKey: timeseriesKeys.get(params),
        queryFn: () => getTimeseries(params),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: getTimeseriesStaleTime(params.axis),
        gcTime: 60 * 1000,
        retry: false,
    })
}

function getTimeseriesStaleTime(axis: TimeseriesAxis) {
    if (axis === 'minute') return 5_000
    if (axis === 'hour') return 30_000
    return 60_000
}

function getTimeseries(params: TimeseriesParams) {
    const query = new URLSearchParams({ gateway_uid: params.gatewayUid, meter_id: params.meterId, axis: params.axis, start: params.start, end: params.end })
    return apiFetch<TimeseriesPoint[]>(`${TIMESERIES_ENDPOINT.base}?${query.toString()}`)
}
