'use client'

import { signOut } from 'next-auth/react'

export async function logoutAndRedirect() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
        await signOut({ callbackUrl: '/login' })
    }
}
