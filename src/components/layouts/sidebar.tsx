'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
    { label: '總覽', href: '/' },
    { label: '雲端同步', href: '/cloud-sync' },
    { label: '本地閘道', href: '/gateways' },
    { label: '智慧勾表', href: '/meters' },
    { label: '歷史資料', href: '/history-data' },
    { label: '歷史事件', href: '/history-events' },
    { label: '製程管制', href: '/process-control' },
    { label: '製程規則', href: '/process-rules' },
    { label: '系統設定', href: '/settings' },
]

const externalLinks = [
    { label: 'API 文件', href: '#' },
    { label: 'MMold.com', href: 'https://mmold.com' },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    function isActive(href: string) {
        if (href === '/') return pathname === '/'
        return pathname?.startsWith(href)
    }

    return (
        <aside className="flex w-64 shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground">
            <div>
                <Link href="/" className="flex items-center gap-3 px-6 py-6">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-foreground text-sm font-bold text-sidebar">
                        M
                    </span>
                    <span className="text-lg font-semibold">MMold Edge</span>
                </Link>

                <nav className="flex flex-col gap-1 px-3">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`rounded-md px-3 py-2 text-sm transition-colors ${isActive(item.href)
                                ? 'border-l-2 border-sidebar-primary-foreground bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="mt-6 flex flex-col gap-1 border-t border-sidebar-border px-3 pt-4">
                    {externalLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        >
                            {link.label} ↗
                        </a>
                    ))}
                </div>
            </div>

            <div>
                <div className="mb-3 border-y px-4 py-4 border-sidebar-border  flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">{session?.user?.name ?? 'admin'}</p>
                        <p className="text-xs text-sidebar-foreground/60 uppercase">
                            {(session?.user as any)?.role ?? 'ADMIN'}
                        </p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="cursor-pointer rounded-md bg-sidebar-accent px-3 py-1.5 text-xs hover:bg-sidebar-accent/80"
                    >
                        登出
                    </button>
                </div>
                <div className="px-4 py-4 flex items-center gap-2 text-xs text-sidebar-foreground/60">
                    <div className='flex align-start gap-2'>
                        <span className="h-2 w-2 mt-1 rounded-full bg-emerald-400" />
                        <div className='flex flex-col gap-1'>
                            <span>Edge service</span>
                            <span >連線正常</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}