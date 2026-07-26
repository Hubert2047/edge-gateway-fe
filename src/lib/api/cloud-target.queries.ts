'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCloudTargets,
    createCloudTarget,
    updateCloudTarget,
    deleteCloudTarget,
    testCloudTargetConnection,
} from './cloud-target'
import type { CloudTarget, CloudTargetFormValues } from '@/types/cloud-target'

export const cloudTargetKeys = {
    all: ['cloud-targets'] as const,
    list: () => [...cloudTargetKeys.all, 'list'] as const,
}

export function useCloudTargets(initialData: CloudTarget[]) {
    return useQuery({
        queryKey: cloudTargetKeys.list(),
        queryFn: getCloudTargets,
        initialData,
        refetchInterval: 30_000,
    })
}

export function useCreateCloudTarget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (form: CloudTargetFormValues) => createCloudTarget(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cloudTargetKeys.list() })
        },
    })
}

export function useUpdateCloudTarget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, form }: { id: string; form: CloudTargetFormValues }) => updateCloudTarget(id, form),
        onMutate: async ({ id, form }) => {
            await queryClient.cancelQueries({ queryKey: cloudTargetKeys.list() })
            const previous = queryClient.getQueryData<CloudTarget[]>(cloudTargetKeys.list())
            queryClient.setQueryData<CloudTarget[]>(cloudTargetKeys.list(), (old) =>
                old?.map((target) => (target.id === id ? { ...target, ...form } : target))
            )
            return { previous }
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(cloudTargetKeys.list(), context.previous)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: cloudTargetKeys.list() })
        },
    })
}

export function useDeleteCloudTarget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteCloudTarget(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cloudTargetKeys.list() })
        },
    })
}

export function useTestCloudTargetConnection() {
    return useMutation({
        mutationFn: (id: string) => testCloudTargetConnection(id),
    })
}