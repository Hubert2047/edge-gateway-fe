'use client'

import { useSyncExternalStore } from 'react'
import { formatRelativeTime } from '@/lib/utils'

type ClientRelativeTimeProps = {
    value: unknown
    locale: 'zh-TW' | 'en'
    fallback: string
}

const emptySubscribe = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ClientRelativeTime({ value, locale, fallback }: ClientRelativeTimeProps) {
    const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

    if (!isHydrated) return '\u00a0'
    if (typeof value !== 'string' || value.trim() === '') return fallback

    try {
        return String(formatRelativeTime(value, locale))
    } catch {
        return fallback
    }
}
