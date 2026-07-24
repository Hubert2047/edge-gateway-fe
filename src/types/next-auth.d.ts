import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import { DefaultSession } from "next-auth"
declare module "next-auth" {
    interface User {
        id: string
        role: string
        accessToken: string
    }

    interface Session {
        user: {
            id: string
            role: string
        } & DefaultSession["user"]

        accessToken: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        accessToken: string
    }
}