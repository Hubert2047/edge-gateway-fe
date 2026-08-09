'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Gateway, GatewayFormValues } from '@/types/gateway'
import { GATEWAY_ENDPOINT } from '@/constances/url'
import { meterKeys } from './meter'

export const gatewayKeys = {
    all: ['gateways'] as const,
    list: () => [...gatewayKeys.all, 'list'] as const,
}

export function useGateways(initialData: Gateway[]) {
    return useQuery({
        queryKey: gatewayKeys.list(),
        queryFn: getGateways,
        initialData,
        refetchInterval: 2 * 60_000,
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
        mutationFn: ({ uid, form }: { uid: string; form: GatewayFormValues }) => updateGateway(uid, form),
        onMutate: async ({ uid, form }) => {
            await queryClient.cancelQueries({ queryKey: gatewayKeys.list() })
            const previous = queryClient.getQueryData<Gateway[]>(gatewayKeys.list())
            queryClient.setQueryData<Gateway[]>(gatewayKeys.list(), (old) =>
                old?.map((gateway) => (gateway.uid === uid ? { ...gateway, ...form } : gateway)),
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
        mutationFn: (uid: string) => deleteGateway(uid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: gatewayKeys.list() })
        },
    })
}
export function useSyncGatewayMeters() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (uid: string) => syncGatewayMeters(uid),
        onSuccess: (_data, uid) => {
            queryClient.invalidateQueries({ queryKey: gatewayKeys.list() })
            queryClient.invalidateQueries({ queryKey: meterKeys.list(uid) })
        },
    })
}
function getGateways() {
    return apiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)
}

function createGateway(form: GatewayFormValues) {
    return apiFetch<Gateway>(GATEWAY_ENDPOINT.base, { method: 'POST', body: JSON.stringify(form) })
}

function updateGateway(uid: string, form: GatewayFormValues) {
    return apiFetch<Gateway>(`${GATEWAY_ENDPOINT.base}/${uid}`, { method: 'PUT', body: JSON.stringify(form) })
}

function deleteGateway(uid: string) {
    return apiFetch<void>(`${GATEWAY_ENDPOINT.base}/${uid}`, { method: 'DELETE' })
}
async function syncGatewayMeters(uid: string): Promise<void> {
    return apiFetch(GATEWAY_ENDPOINT.syncMeter(uid), { method: 'PUT' })
}
