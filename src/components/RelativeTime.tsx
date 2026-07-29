'use client'

import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'

export function RelativeTime({ value }: { value: string | Date }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <span>-</span>
    }

    return <span>{formatRelativeTime(value)}</span>
}
