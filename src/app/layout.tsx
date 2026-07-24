import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AuthProvider } from '@/components/providers/session-provider'
import './globals.css'
import { Inter, IBM_Plex_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const plexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-mono',
})
export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)

    return (
        <html lang='zh-TW'>
            <body className={`${inter.variable} ${plexMono.variable} font-sans`}>
                <AuthProvider session={session}>{children}</AuthProvider>
            </body>
        </html>
    )
}
