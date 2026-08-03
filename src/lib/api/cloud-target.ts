'use client'

import { CloudTarget, CloudTargetFormValues, TestConnectionResult } from '@/types/cloud-target'
import { apiFetch } from './client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'

export const cloudTargetKeys = {
    all: ['cloud-targets'] as const,
    list: () => [...cloudTargetKeys.all, 'list'] as const,
}

export function useCloudTargets(initialData: CloudTarget[]) {
    return useQuery({
        queryKey: cloudTargetKeys.list(),
        queryFn: getCloudTargets,
        initialData,
        refetchInterval: 60_000,
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
                old?.map((target) => (target.id === id ? { ...target, ...form } : target)),
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

export function useFlushAllCloudTargets() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: flushAllCloudTargets,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cloudTargetKeys.list() })
        },
    })
}

export function useFlushCloudTarget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => flushCloudTarget(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cloudTargetKeys.list() })
        },
    })
}

function getCloudTargets() {
    return apiFetch<CloudTarget[]>(CLOUD_TARGET_ENDPOINT.base)
}

function createCloudTarget(form: CloudTargetFormValues) {
    return apiFetch<CloudTarget>(CLOUD_TARGET_ENDPOINT.base, { method: 'POST', body: JSON.stringify(form) })
}

function updateCloudTarget(id: string, form: CloudTargetFormValues) {
    return apiFetch<CloudTarget>(`${CLOUD_TARGET_ENDPOINT.base}/${id}`, { method: 'PUT', body: JSON.stringify(form) })
}

function deleteCloudTarget(id: string) {
    return apiFetch<void>(`${CLOUD_TARGET_ENDPOINT.base}/${id}`, { method: 'DELETE' })
}

function testCloudTargetConnection(id: string) {
    return apiFetch<TestConnectionResult>(CLOUD_TARGET_ENDPOINT.test(id), { method: 'POST' })
}

function flushAllCloudTargets() {
    return apiFetch<void>(CLOUD_TARGET_ENDPOINT.flushAll, { method: 'POST' })
}

function flushCloudTarget(id: string) {
    return apiFetch<void>(CLOUD_TARGET_ENDPOINT.flush(id), { method: 'POST' })
}
