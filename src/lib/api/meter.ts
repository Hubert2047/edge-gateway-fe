'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Meter, MeterBulkSaveResult, MeterCreateValues, MeterFormValues, MeterUpdateValues } from '@/types/meter'
import { GATEWAY_ENDPOINT, METER_ENDPOINT } from '@/constances/url'

export const meterKeys = {
    all: ['meters'] as const,
    list: (gatewayUid: string) => [...meterKeys.all, 'list', gatewayUid] as const,
}

export function useMeters(gatewayUid: string, initialData?: Meter[]) {
    return useQuery({
        queryKey: meterKeys.list(gatewayUid),
        queryFn: () => getMeters(gatewayUid),
        initialData,
        placeholderData: keepPreviousData,
    })
}

export function useCreateMeter(gatewayUid: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (values: MeterCreateValues) => createMeter(gatewayUid, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayUid) })
        },
    })
}

export function useUpdateMeter(gatewayUID: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (values: MeterUpdateValues) => updateMeter(values),
        onMutate: async (values) => {
            await queryClient.cancelQueries({ queryKey: meterKeys.list(gatewayUID) })
            const previous = queryClient.getQueryData<Meter[]>(meterKeys.list(gatewayUID))
            if (previous) {
                queryClient.setQueryData<Meter[]>(
                    meterKeys.list(gatewayUID),
                    previous.map((m) => (m.macId === values.macId ? { ...m, ...values } : m)),
                )
            }
            return { previous }
        },
        onError: (_err, _values, context) => {
            if (context?.previous) {
                queryClient.setQueryData(meterKeys.list(gatewayUID), context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayUID) })
        },
    })
}

export function useDeleteMeter(gatewayUid: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (macId: string) => deleteMeter(macId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayUid) })
        },
    })
}

/**
 * Bulk save for the "Save all" button.
 * Backend has no batch endpoint, so this fires one PUT per dirty row via
 * Promise.allSettled, then reconciles the list with a single invalidate.
 */
export function useUpdateMetersBulk(gatewayUID: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (updates: MeterUpdateValues[]): Promise<MeterBulkSaveResult> => {
            const results = await Promise.allSettled(updates.map((u) => updateMeter(u)))
            const succeeded: string[] = []
            const failed: { macId: string; message: string }[] = []
            results.forEach((result, i) => {
                const macId = updates[i].macId
                if (result.status === 'fulfilled') {
                    succeeded.push(macId)
                } else {
                    const message = result.reason instanceof Error ? result.reason.message : 'Save failed'
                    failed.push({ macId, message })
                }
            })
            return { succeeded, failed }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayUID) })
        },
    })
}

async function getMeters(gatewayUid: string): Promise<Meter[]> {
    return apiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gatewayUid))
}

async function createMeter(gatewayUid: string, values: MeterCreateValues): Promise<Meter> {
    return apiFetch<Meter>(`/api/hubs/${encodeURIComponent(gatewayUid)}/meters`, {
        method: 'POST',
        body: JSON.stringify(values),
    })
}

async function updateMeter(values: MeterUpdateValues): Promise<Meter> {
    const { macId, ...rest } = values
    return apiFetch<Meter>(`${METER_ENDPOINT.base}/${encodeURIComponent(macId)}`, {
        method: 'PUT',
        body: JSON.stringify(rest),
    })
}

async function deleteMeter(macId: string): Promise<void> {
    return apiFetch<void>(`${METER_ENDPOINT.base}/${encodeURIComponent(macId)}`, {
        method: 'DELETE',
    })
}
