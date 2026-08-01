'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { AppUser, CreateUserValues, UserRole } from '@/types/user'
import { USER_ENDPOINT } from '@/constances/url'

export const userKeys = {
    all: ['users'] as const,
    list: () => [...userKeys.all, 'list'] as const,
}

export function useUsers(initialData: AppUser[]) {
    return useQuery({ queryKey: userKeys.list(), queryFn: getUsers, initialData, refetchInterval: 30_000 })
}

export function useCreateUser() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
    })
}
export function useUpdateUser() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, username, role, enabled }: { id: string; username: string, role: UserRole, enabled: boolean }) => updateUser(id, username, role, enabled),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
    })
}
export function useDeleteUser() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
    })
}

export function useResetUserPassword() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, password }: { id: string; password: string }) => resetUserPassword(id, password),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
    })
}

async function getUsers() {
    return apiFetch<AppUser[]>(USER_ENDPOINT.base)
}

async function createUser(values: CreateUserValues) {
    return apiFetch<AppUser>(USER_ENDPOINT.base, {
        method: 'POST',
        body: JSON.stringify({ ...values, role: toBackendRole(values.role) }),
    })
}

async function deleteUser(id: string) {
    return apiFetch<void>(`${USER_ENDPOINT.base}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function resetUserPassword(id: string, password: string) {
    return apiFetch<void>(USER_ENDPOINT.resetPass(id), {
        method: 'PUT',
        body: JSON.stringify({ password }),
    })
}

async function updateUser(id: string, username: string, role: UserRole, enabled: boolean) {
    return apiFetch<AppUser>(`${USER_ENDPOINT.base}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ username, role, enabled }),
    })
}

function toBackendRole(role: UserRole) {
    return role === 'admin' ? 'admin' : 'user'
}
