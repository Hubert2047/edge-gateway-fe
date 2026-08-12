'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Meter, MeterBatchUpdateValues, MeterBulkSaveResult, MeterCreateValues } from '@/types/meter'
import { GATEWAY_ENDPOINT, METER_ENDPOINT } from '@/constances/url'
import { overviewKeys } from './overview.queries'

export const meterKeys = {
    all: ['meters'] as const,
    list: (gatewayId: number) => [...meterKeys.all, 'list', gatewayId] as const,
}

export function useMeters(gatewayId: number, initialData?: Meter[]) {
    return useQuery({
        queryKey: meterKeys.list(gatewayId),
        queryFn: () => getMeters(gatewayId),
        initialData,
        placeholderData: keepPreviousData,
    })
}

export function useCreateMeter(gatewayId: number) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (values: MeterCreateValues) => createMeter(gatewayId, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayId) })
            queryClient.invalidateQueries({ queryKey: overviewKeys.meters() })
        },
    })
}

export function useUpdateMeter(gatewayId: number) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (values: MeterBatchUpdateValues) => updateMeter(values),
        onMutate: async (values) => {
            await queryClient.cancelQueries({ queryKey: meterKeys.list(gatewayId) })
            const previous = queryClient.getQueryData<Meter[]>(meterKeys.list(gatewayId))
            if (previous) {
                queryClient.setQueryData<Meter[]>(
                    meterKeys.list(gatewayId),
                    previous.map((m) => (m.meterId === values.meterId ? { ...m, ...values } : m)),
                )
            }
            return { previous }
        },
        onError: (_err, _values, context) => {
            if (context?.previous) {
                queryClient.setQueryData(meterKeys.list(gatewayId), context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayId) })
            queryClient.invalidateQueries({ queryKey: overviewKeys.meters() })
        },
    })
}

export function useDeleteMeter(gatewayId: number) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (macId: string) => deleteMeter(macId, gatewayId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayId) })
            queryClient.invalidateQueries({ queryKey: overviewKeys.meters() })
        },
    })
}

/**
 * Bulk save for the "Save all" button.
 * Existing meters are saved together through the backend batch endpoint.
 */
export function useUpdateMetersBulk(gatewayId: number) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (updates: MeterBatchUpdateValues[]): Promise<MeterBulkSaveResult> => {
            const result = await updateMetersBatch(updates)
            const succeeded: string[] = []
            const failed: { macId: string; message: string }[] = []
            result.forEach((item, i) => {
                const macId = updates[i].macId
                if (item.ok) succeeded.push(macId)
                else failed.push({ macId, message: item.error ?? 'Save failed' })
            })
            return { succeeded, failed }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayId) })
            queryClient.invalidateQueries({ queryKey: overviewKeys.meters() })
        },
    })
}

async function getMeters(gatewayId: number): Promise<Meter[]> {
    return apiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gatewayId))
}

async function createMeter(gatewayId: number, values: MeterCreateValues): Promise<Meter> {
    return apiFetch<Meter>(METER_ENDPOINT.base, {
        method: 'POST',
        body: JSON.stringify({ ...values, gatewayId, meterId: values.macId }),
    })
}

async function updateMeter(values: MeterBatchUpdateValues): Promise<Meter> {
    const { meterId, gatewayId, ...body } = values
    return apiFetch<Meter>(METER_ENDPOINT.update(meterId, gatewayId), {
        method: 'PUT',
        body: JSON.stringify(body),
    })
}

type MeterBatchResult = { meterId: string; ok: boolean; error?: string; data?: Meter }

async function updateMetersBatch(values: MeterBatchUpdateValues[]): Promise<MeterBatchResult[]> {
    const gatewayId = values[0]?.gatewayId ?? 0
    return apiFetch<MeterBatchResult[]>(METER_ENDPOINT.batch(gatewayId), {
        method: 'PUT',
        body: JSON.stringify({ meters: values }),
    })
}

async function deleteMeter(macId: string, gatewayId: number): Promise<void> {
    return apiFetch<void>(METER_ENDPOINT.delete(macId, gatewayId), {
        method: 'DELETE',
    })
}
