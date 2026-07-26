import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { AppShell } from '@/components/layouts/app-shell'
import { Toaster } from '@/components/ui/sonner'
const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'MMold Edge',
    description: 'MMold Edge Gateway Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-Hant" className="h-full">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}>
                <AuthSessionProvider>
                    <QueryProvider>
                        <Toaster position="top-right" />
                        <AppShell>{children}</AppShell>
                    </QueryProvider>
                </AuthSessionProvider>
            </body>
        </html>
    )
}