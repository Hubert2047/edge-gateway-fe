import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMeter, deleteMeter, getMeters, updateMeter } from './meter'
import type { Meter, MeterBulkSaveResult, MeterFormValues, MeterUpdateValues } from '@/types/meter'

export const meterKeys = {
  all: ['meters'] as const,
  list: (hubUid: string) => [...meterKeys.all, 'list', hubUid] as const,
}

export function useMeters(hubUid: string, initialData?: Meter[]) {
  return useQuery({
    queryKey: meterKeys.list(hubUid),
    queryFn: () => getMeters(hubUid),
    initialData,
    refetchInterval: 30_000,
  })
}

export function useCreateMeter(hubUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MeterFormValues) => createMeter(hubUid, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUid) })
    },
  })
}

export function useUpdateMeter(hubUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MeterUpdateValues) => updateMeter(values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: meterKeys.list(hubUid) })
      const previous = queryClient.getQueryData<Meter[]>(meterKeys.list(hubUid))
      if (previous) {
        queryClient.setQueryData<Meter[]>(
          meterKeys.list(hubUid),
          previous.map((m) => (m.macId === values.macId ? { ...m, ...values } : m))
        )
      }
      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context?.previous) {
        queryClient.setQueryData(meterKeys.list(hubUid), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUid) })
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
export function useUpdateMetersBulk(hubUid: string) {
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
          const message =
            result.reason instanceof Error ? result.reason.message : '儲存失敗'
          failed.push({ macId, message })
        }
      })
      return { succeeded, failed }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: meterKeys.list(hubUid) })
    },
  })
}