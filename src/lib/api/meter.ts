'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Meter, MeterBatchUpdateValues, MeterBulkSaveResult, MeterCreateValues } from '@/types/meter'
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
        mutationFn: (values: MeterBatchUpdateValues) => updateMeter(values),
        onMutate: async (values) => {
            await queryClient.cancelQueries({ queryKey: meterKeys.list(gatewayUID) })
            const previous = queryClient.getQueryData<Meter[]>(meterKeys.list(gatewayUID))
            if (previous) {
                queryClient.setQueryData<Meter[]>(
                    meterKeys.list(gatewayUID),
                    previous.map((m) => (m.meterId === values.meterId ? { ...m, ...values } : m)),
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
        mutationFn: (macId: string) => deleteMeter(macId, gatewayUid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayUid) })
        },
    })
}

/**
 * Bulk save for the "Save all" button.
 * Existing meters are saved together through the backend batch endpoint.
 */
export function useUpdateMetersBulk(gatewayUID: string) {
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
            queryClient.invalidateQueries({ queryKey: meterKeys.list(gatewayUID) })
        },
    })
}

async function getMeters(gatewayUid: string): Promise<Meter[]> {
    return apiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gatewayUid))
}

async function createMeter(gatewayUid: string, values: MeterCreateValues): Promise<Meter> {
    return apiFetch<Meter>(METER_ENDPOINT.base, {
        method: 'POST',
        body: JSON.stringify({ ...values, gatewayUID: gatewayUid, meterId: values.macId }),
    })
}

async function updateMeter(values: MeterBatchUpdateValues): Promise<Meter> {
    const { meterId, gatewayUID, ...body } = values
    return apiFetch<Meter>(METER_ENDPOINT.update(meterId, gatewayUID), {
        method: 'PUT',
        body: JSON.stringify(body),
    })
}

type MeterBatchResult = { meterId: string; ok: boolean; error?: string; data?: Meter }

async function updateMetersBatch(values: MeterBatchUpdateValues[]): Promise<MeterBatchResult[]> {
    const gatewayUID = values[0]?.gatewayUID ?? ''
    return apiFetch<MeterBatchResult[]>(METER_ENDPOINT.batch(gatewayUID), {
        method: 'PUT',
        body: JSON.stringify({ meters: values }),
    })
}

async function deleteMeter(macId: string, gatewayUID: string): Promise<void> {
    return apiFetch<void>(METER_ENDPOINT.delete(macId, gatewayUID), {
        method: 'DELETE',
    })
}
