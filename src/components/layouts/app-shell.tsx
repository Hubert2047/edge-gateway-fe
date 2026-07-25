'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const isAuthPage = pathname?.startsWith('/login')

    if (isAuthPage) {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-[#F7F5F0]">{children}</main>
        </div>
    )
}