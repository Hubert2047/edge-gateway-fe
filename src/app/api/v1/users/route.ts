import { USER_ENDPOINT } from "@/constances/url"
import { handleRoute } from "@/lib/api/route-handler"
import { serverApiFetch } from "@/lib/api/server"
import { User } from "next-auth"
import { NextRequest } from "next/server"

export async function GET() {
    return handleRoute(() => serverApiFetch<User[]>(USER_ENDPOINT.base, undefined, { skipAuthRedirect: true }))
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    return handleRoute(
        () =>
            serverApiFetch<User>(
                USER_ENDPOINT.base,
                { method: 'POST', body: JSON.stringify(body) },
                { skipAuthRedirect: true },
            ),
        201,
    )
}
