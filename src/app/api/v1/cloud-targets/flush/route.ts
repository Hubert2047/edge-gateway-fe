import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'

export async function POST() {
    return handleRoute(async () => {
        await serverApiFetch<void>(CLOUD_TARGET_ENDPOINT.flushAll, { method: 'POST' })
        return { success: true }
    })
}
