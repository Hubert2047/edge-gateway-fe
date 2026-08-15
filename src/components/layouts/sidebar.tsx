'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { normalizeRole } from '@/lib/roles'
import { ROUTES } from '@/constances/route'
import Image from 'next/image'
type NavItem = { key: string; href: string; adminOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
    { key: 'nav.overview', href: ROUTES.overview },
    { key: 'nav.cloudSync', href: ROUTES.cloudSync, adminOnly: true },
    { key: 'nav.gateways', href: ROUTES.gateways, adminOnly: true },
    { key: 'nav.meters', href: ROUTES.meters, adminOnly: true },
    { key: 'nav.historyData', href: ROUTES.historyData },
    // { key: 'nav.historyEvents', href: ROUTES.historyEvents, adminOnly: true },
    // { key: 'nav.processControl', href: ROUTES.processControl, adminOnly: true },
    // { key: 'nav.processRules', href: ROUTES.processRules, adminOnly: true },
    { key: 'nav.users', href: ROUTES.users, adminOnly: true },
    { key: 'nav.settings', href: ROUTES.settings },
]

const externalLinks = [
    // { key: 'nav.apiDocs', href: '#' },
    { key: 'nav.mmold', href: 'https://mmold.com', fallback: 'MMold.com' },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { t } = useI18n()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isOnline, setIsOnline] = useState<boolean | null>(null)
    const isAdmin = normalizeRole(session?.user?.role) === 'admin'
    const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOnline(navigator.onLine)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMobileOpen(false)
    }, [pathname])

    function isActive(href: string) {
        if (href === '/') return pathname === '/'
        return pathname?.startsWith(href)
    }

    const navigation = (
        <>
            <Link href='/overview' onClick={() => setMobileOpen(false)} className='flex items-center gap-3 px-5 py-3'>
                <Image
                    src="/assets/green-assistant-logo-dark.png"
                    alt="綠品助手 Logo"
                    width={160}
                    height={40}
                    className="h-9 w-auto object-contain"
                    unoptimized
                    priority
                />
                <span className='text-lg font-semibold'>MMold Edge</span>
            </Link>

            <nav className='flex flex-col gap-1 px-3'>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`rounded-md px-3 py-2 text-sm transition-colors ${isActive(item.href)
                            ? 'border-l-2 border-sidebar-primary-foreground bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                            }`}>
                        {t(item.key)}
                    </Link>
                ))}
            </nav>

            <div className='mt-2 flex flex-col gap-1 border-t border-sidebar-border px-3 pt-3 pb-0'>
                {externalLinks.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        target='_blank'
                        rel='noreferrer'
                        className='rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'>
                        {link.fallback ?? t(link.key)} ↗
                    </a>
                ))}
            </div>
        </>
    )

    const account = (
        <>
            <div className='flex items-center justify-between border-y border-sidebar-border px-6 py-4'>
                <div>
                    <p className='text-sm font-medium'>{session?.user?.name ?? 'admin'}</p>
                    <p className='text-xs uppercase text-sidebar-foreground/60'>
                        {session?.user?.role ?? 'ADMIN'}
                    </p>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className='cursor-pointer bg-sidebar-accent px-3 py-1.5 text-xs hover:bg-sidebar-accent/80'>
                    {t('nav.logout')}
                </button>
            </div>
            <div className='flex items-center gap-2 px-5 py-2 pb-3 text-xs text-sidebar-foreground/60'>
                <span className={`sidebar-status-dot mt-1 ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div className='flex flex-col gap-1'>
                    <span>{t('nav.edgeService')}</span>
                    <span>{isOnline ? t('nav.connected') : t('nav.disconnected')}</span>
                </div>
            </div>
        </>
    )

    return (
        <>
            <aside className='hidden min-h-0 w-64 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground md:flex'>
                <div className='min-h-0 flex-1 overflow-y-auto'>{navigation}</div>
                <div className='shrink-0'>{account}</div>
            </aside>
            <div className='fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-sidebar px-4 text-sidebar-foreground md:hidden'>
                <Link href='/overview' className='flex items-center gap-2'>
                    <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-foreground text-sm font-bold text-sidebar'>
                        M
                    </span>
                    <span className='font-semibold'>MMold Edge</span>
                </Link>
                <button
                    type='button'
                    aria-label={t('nav.openMenu')}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen(true)}
                    className='p-2'>
                    <Menu className='h-5 w-5' />
                </button>
            </div>
            {mobileOpen && (
                <div className='fixed inset-0 z-50 bg-black/40 md:hidden' onClick={() => setMobileOpen(false)} />
            )}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button
                    type='button'
                    aria-label={t('nav.closeMenu')}
                    onClick={() => setMobileOpen(false)}
                    className='absolute right-3 top-4 p-2'>
                    <X className='h-5 w-5' />
                </button>
                <div className='min-h-0 flex-1 overflow-y-auto'>{navigation}</div>
                <div className='shrink-0'>{account}</div>
            </aside>
        </>
    )
}
