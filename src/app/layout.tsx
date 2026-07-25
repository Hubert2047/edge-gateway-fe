import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { AppShell } from '@/components/layouts/app-shell'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'MMold Edge',
    description: 'MMold Edge Gateway Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-Hant">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AuthSessionProvider>
                    <AppShell>{children}</AppShell>
                </AuthSessionProvider>
            </body>
        </html>
    )
}