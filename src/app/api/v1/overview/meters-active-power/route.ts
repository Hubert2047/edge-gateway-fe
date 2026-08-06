import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { OVERVIEW_ENDPOINT } from '@/constances/url'
import type { OverviewActivePower } from '@/types/overview'

export async function GET() {
    return handleRoute(() => serverApiFetch<OverviewActivePower>(OVERVIEW_ENDPOINT.metersActivePower))
}
