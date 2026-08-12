'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Gateway, GatewayFormValues } from '@/types/gateway'
import { GATEWAY_ENDPOINT } from '@/constances/url'
import { meterKeys } from './meter'
import { OVERVIEW_REFETCH_TIME } from './overview.queries'

export const gatewayKeys = {
    all: ['gateways'] as const,
    list: () => [...gatewayKeys.all, 'list'] as const,
}

export function useGateways(initialData: Gateway[]) {
    return useQuery({
        queryKey: gatewayKeys.list(),
        queryFn: getGateways,
        initialData,
        staleTime: OVERVIEW_REFETCH_TIME, 
    })
}

export function useCreateGateway() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (form: GatewayFormValues) => createGateway(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: gatewayKeys.list() })
        },
    })
}

export function useUpdateGateway() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, form }: { id: number; form: GatewayFormValues }) => updateGateway(id, form),
        onMutate: async ({ id, form }) => {
            await queryClient.cancelQueries({ queryKey: gatewayKeys.list() })
            const previous = queryClient.getQueryData<Gateway[]>(gatewayKeys.list())
            queryClient.setQueryData<Gateway[]>(gatewayKeys.list(), (old) =>
                old?.map((gateway) => (gateway.id === id ? { ...gateway, ...form } : gateway)),
            )
            return { previous }
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(gatewayKeys.list(), context.previous)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: gatewayKeys.list() })
        },
    })
}

export function useDeleteGateway() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => deleteGateway(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: gatewayKeys.list() })
        },
    })
}
export function useSyncGatewayMeters() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => syncGatewayMeters(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: gatewayKeys.list() })
            queryClient.invalidateQueries({ queryKey: meterKeys.list(id) })
        },
    })
}
function getGateways() {
    return apiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)
}

function createGateway(form: GatewayFormValues) {
    return apiFetch<Gateway>(GATEWAY_ENDPOINT.base, { method: 'POST', body: JSON.stringify(form) })
}

function updateGateway(id: number, form: GatewayFormValues) {
    return apiFetch<Gateway>(`${GATEWAY_ENDPOINT.base}/${id}`, { method: 'PUT', body: JSON.stringify(form) })
}

function deleteGateway(id: number) {
    return apiFetch<void>(`${GATEWAY_ENDPOINT.base}/${id}`, { method: 'DELETE' })
}
async function syncGatewayMeters(id: number): Promise<void> {
    return apiFetch(GATEWAY_ENDPOINT.syncMeter(id), { method: 'PUT' })
}
