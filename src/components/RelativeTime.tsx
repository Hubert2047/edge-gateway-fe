'use client'

import { useSyncExternalStore } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

export function RelativeTime({ value }: { value: string | Date }) {
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false,
    )
    const { locale } = useI18n()

    if (!mounted) {
        return <span>-</span>
    }

    return <span>{formatRelativeTime(value, locale)}</span>
}
