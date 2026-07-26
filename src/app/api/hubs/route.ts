import { handleRoute } from "@/lib/api/route-handler"
import { serverApiFetch } from "@/lib/api/server"
import { Hub } from "@/types/hub"
import { NextRequest } from "next/server"

export async function GET() {
    return handleRoute(() => serverApiFetch<Hub[]>('/api/hubs', undefined, { skipAuthRedirect: true }))
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    return handleRoute(
        () => serverApiFetch<Hub>('/api/hubs', { method: 'POST', body: JSON.stringify(body) }, { skipAuthRedirect: true }),
        201
    )
}