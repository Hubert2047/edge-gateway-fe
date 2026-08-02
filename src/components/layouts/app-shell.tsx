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
        <div className="flex h-dvh flex-col overflow-hidden md:h-screen md:flex-row">
            <Sidebar />
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F5F0] p-4 pt-20 md:p-6">
                {children}
            </main>
        </div>
    )
}
