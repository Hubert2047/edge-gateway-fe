import { NextRequest } from 'next/server'
import { TIMESERIES_ENDPOINT } from '@/constances/url'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.toString()
    return handleRoute(() => serverApiFetch(TIMESERIES_ENDPOINT.base + (query ? `?${query}` : ''), undefined, { skipAuthRedirect: true }))
}
