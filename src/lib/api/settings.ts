import { SETTINGS_ENDPOINT } from '@/constances/url'
import type { UpdateSettingsInput, UserSettings } from '@/types/settings'
import { apiFetch } from './client'

export function getSettings() {
    return apiFetch<UserSettings>(SETTINGS_ENDPOINT.base)
}

export function updateSettings(input: UpdateSettingsInput) {
    return apiFetch<UserSettings>(SETTINGS_ENDPOINT.base, {
        method: 'PUT',
        body: JSON.stringify(input),
    })
}
