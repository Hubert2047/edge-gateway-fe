export type AppSettings = {
    locale?: 'zh-TW' | 'en'
    [key: string]: unknown
}

export const SETTINGS_STORAGE_KEY = 'edge-gateway-settings'

export function getStoredSettings(): AppSettings {
    if (typeof window === 'undefined') return {}

    try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (!raw) return {}
        const parsed: unknown = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed as AppSettings : {}
    } catch {
        return {}
    }
}

export function saveSettings(patch: AppSettings): AppSettings {
    const next = { ...getStoredSettings(), ...patch }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    return next
}
