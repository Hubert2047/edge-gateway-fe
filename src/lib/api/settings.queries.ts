'use client'

import { useMutation } from '@tanstack/react-query'
import type { UpdateSettingsInput } from '@/types/settings'
import { updateSettings } from './settings'

export function useUpdateSettings() {
    return useMutation({
        mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    })
}
