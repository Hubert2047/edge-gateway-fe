'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Hub, HubFormValues } from '@/types/hub'

export const hubKeys = {
    all: ['hubs'] as const,
    list: () => [...hubKeys.all, 'list'] as const,
}

export function useHubs(initialData: Hub[]) {
    return useQuery({
        queryKey: hubKeys.list(),
        queryFn: getHubs,
        initialData,
        refetchInterval: 30_000,
    })
}

export function useCreateHub() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (form: HubFormValues) => createHub(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hubKeys.list() })
        },
    })
}

export function useUpdateHub() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ uid, form }: { uid: string; form: HubFormValues }) => updateHub(uid, form),
        onMutate: async ({ uid, form }) => {
            await queryClient.cancelQueries({ queryKey: hubKeys.list() })
            const previous = queryClient.getQueryData<Hub[]>(hubKeys.list())
            queryClient.setQueryData<Hub[]>(hubKeys.list(), (old) =>
                old?.map((hub) => (hub.uid === uid ? { ...hub, ...form } : hub)),
            )
            return { previous }
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(hubKeys.list(), context.previous)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: hubKeys.list() })
        },
    })
}

export function useDeleteHub() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (uid: string) => deleteHub(uid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hubKeys.list() })
        },
    })
}
export function useSyncHubMeters() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (uid: string) => syncHubMeters(uid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hubKeys.list() })
        },
    })
}
function getHubs() {
    return apiFetch<Hub[]>('/api/hubs')
}

function createHub(form: HubFormValues) {
    return apiFetch<Hub>('/api/hubs', { method: 'POST', body: JSON.stringify(form) })
}

function updateHub(uid: string, form: HubFormValues) {
    return apiFetch<Hub>(`/api/hubs/${uid}`, { method: 'PUT', body: JSON.stringify(form) })
}

function deleteHub(uid: string) {
    return apiFetch<void>(`/api/hubs/${uid}`, { method: 'DELETE' })
}
async function syncHubMeters(uid: string): Promise<void> {
    return apiFetch(`/api/hubs/${uid}/sync-meters`, { method: 'PUT' })
}
