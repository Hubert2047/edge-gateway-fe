import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { loginRequest } from '@/lib/api/auth'
import type { AppConfig } from '@/types/settings'

type AuthUser = {
    id: string
    name: string
    role: string
    locale: string
    accessToken: string
    appConfig?: AppConfig
}

type SessionUpdate = {
    user?: { locale?: string }
    appConfig?: AppConfig
}

export const authOptions: NextAuthOptions = {
    session: { strategy: 'jwt' },
    pages: { signIn: '/login' },

    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null
                }
                try {
                    const result = await loginRequest({
                        username: credentials.username,
                        password: credentials.password,
                    })
                    return {
                        id: String(result.data.user.id),
                        name: result.data.user.username,
                        role: result.data.user.role,
                        locale: result.data.user.locale,
                        accessToken: result.data.token,
                        appConfig: result.data.appConfig,
                    }
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Login failed'
                    throw new Error(message)
                }
            }
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                const authenticatedUser = user as AuthUser
                token.id = authenticatedUser.id
                token.role = authenticatedUser.role
                token.locale = authenticatedUser.locale
                token.accessToken = authenticatedUser.accessToken
                token.appConfig = authenticatedUser.appConfig
            }

            if (trigger === 'update') {
                const updated = session as SessionUpdate
                if (typeof updated?.user?.locale === 'string') token.locale = updated.user.locale
                if (token.role === 'admin' && updated?.appConfig) token.appConfig = updated.appConfig
            }

            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role
                session.user.locale = token.locale
            }
        
            session.accessToken = token.accessToken
            if (token.role === 'admin' && token.appConfig) {
                session.appConfig = token.appConfig
            }
        
            return session
        }
    },
}
