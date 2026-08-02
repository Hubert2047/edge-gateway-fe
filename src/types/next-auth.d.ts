import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import { DefaultSession } from "next-auth"
declare module "next-auth" {
    interface User {
        id: string
        role: string
        locale: string
        accessToken: string
        appConfig?: {
            timeZone: string
        }
    }

    interface Session {
        user: {
            id: string
            role: string
            locale: string
        } & DefaultSession["user"]

        accessToken: string
        appConfig?: {
            timeZone: string
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        locale: string
        accessToken: string
        appConfig?: {
            timeZone: string
        }
    }
}
