'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { normalizeRole } from '@/lib/roles'

const DEFAULT_IDLE_TIMEOUT_SECONDS = 600
const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

export function AdminIdleTimeout() {
    const { data: session, status } = useSession()
    const timerRef = useRef<number | null>(null)

    useEffect(() => {
        if (status !== 'authenticated' || normalizeRole(session?.user?.role) !== 'admin') return

        const configuredSeconds = Number(process.env.NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_SECONDS)
        const timeoutSeconds = Number.isFinite(configuredSeconds) && configuredSeconds >= 1
            ? configuredSeconds
            : DEFAULT_IDLE_TIMEOUT_SECONDS

        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' })
            } finally {
                await signOut({ callbackUrl: '/login' })
            }
        }

        function resetTimer() {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current)
            timerRef.current = window.setTimeout(logout, timeoutSeconds * 1000)
        }

        for (const event of activityEvents) window.addEventListener(event, resetTimer)
        resetTimer()

        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current)
            for (const event of activityEvents) window.removeEventListener(event, resetTimer)
        }
    }, [session?.user?.role, status])

    return null
}
