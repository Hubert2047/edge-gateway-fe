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
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-hidden bg-[#F7F5F0] p-6">
                {children}
            </main>
        </div>
    )
}