'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Meter, MeterBulkSaveResult, MeterCreateValues, MeterFormValues, MeterUpdateValues } from '@/types/meter'

export const meterKeys = {
    all: ['meters'] as const,
    list: (hubUid: string) => [...meterKeys.all, 'list', hubUid] as const,
}

export function useMeters(hubUid: string, initialData?: Meter[]) {
    return useQuery({
        queryKey: meterKeys.list(hubUid),
        queryFn: () => getMeters(hubUid),
        initialData,
        placeholderData: keepPreviousData,
    })
}

export function useCreateMeter(hubUid: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (values: MeterCreateValues) => createMeter(hubUid, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUid) })
        },
    })
}

export function useUpdateMeter(hubUID: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (values: MeterUpdateValues) => updateMeter(values),
        onMutate: async (values) => {
            await queryClient.cancelQueries({ queryKey: meterKeys.list(hubUID) })
            const previous = queryClient.getQueryData<Meter[]>(meterKeys.list(hubUID))
            if (previous) {
                queryClient.setQueryData<Meter[]>(
                    meterKeys.list(hubUID),
                    previous.map((m) => (m.macId === values.macId ? { ...m, ...values } : m)),
                )
            }
            return { previous }
        },
        onError: (_err, _values, context) => {
            if (context?.previous) {
                queryClient.setQueryData(meterKeys.list(hubUID), context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUID) })
        },
    })
}

export function useDeleteMeter(hubUid: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (macId: string) => deleteMeter(macId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUid) })
        },
    })
}

/**
 * Bulk save for the "儲存全部" button.
 * Backend has no batch endpoint, so this fires one PUT per dirty row via
 * Promise.allSettled, then reconciles the list with a single invalidate.
 */
export function useUpdateMetersBulk(hubUID: string) {
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
                    const message = result.reason instanceof Error ? result.reason.message : '儲存失敗'
                    failed.push({ macId, message })
                }
            })
            return { succeeded, failed }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUID) })
        },
    })
}

async function getMeters(hubUid: string): Promise<Meter[]> {
    return apiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hubUid)}/meters`)
}

async function createMeter(hubUid: string, values: MeterCreateValues): Promise<Meter> {
    return apiFetch<Meter>(`/api/hubs/${encodeURIComponent(hubUid)}/meters`, {
        method: 'POST',
        body: JSON.stringify(values),
    })
}

async function updateMeter(values: MeterUpdateValues): Promise<Meter> {
    const { macId, ...rest } = values
    return apiFetch<Meter>(`/api/meters/${encodeURIComponent(macId)}`, {
        method: 'PUT',
        body: JSON.stringify(rest),
    })
}

async function deleteMeter(macId: string): Promise<void> {
    return apiFetch<void>(`/api/meters/${encodeURIComponent(macId)}`, {
        method: 'DELETE',
    })
}
