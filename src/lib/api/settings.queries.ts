'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type { UpdateSettingsInput } from '@/types/settings'
import { getSettings, updateSettings } from './settings'

export const settingsKeys = { all: ['settings'] as const, current: () => [...settingsKeys.all, 'current'] as const }

export function useSettings() {
    return useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings, retry: false })
}

export function useUpdateSettings() {
    return useMutation({
        mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    })
}
