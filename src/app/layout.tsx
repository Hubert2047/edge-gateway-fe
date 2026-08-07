import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { AppShell } from '@/components/layouts/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { I18nProvider } from '@/lib/i18n'
import { authOptions } from '@/lib/auth'
const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'MMold Edge',
    description: 'MMold Edge Gateway Management',
    icons: {
        icon: '/assets/green-assistant-logo-dark.png',
        shortcut: '/assets/green-assistant-logo-dark.png',
        apple: '/assets/green-assistant-logo-dark.png',
    },
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)

    return (
        <html lang="zh-Hant" className="h-full">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}>
                <AuthSessionProvider session={session}>
                    <I18nProvider>
                        <QueryProvider>
                            <Toaster position="top-right" />
                            <AppShell>{children}</AppShell>
                        </QueryProvider>
                    </I18nProvider>
                </AuthSessionProvider>
            </body>
        </html>
    )
}
