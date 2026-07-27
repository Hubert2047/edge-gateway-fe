import { GatewayList } from '@/components/gateways/gateway-list'
import { serverApiFetch } from '@/lib/api/server'
import { Hub } from '@/types/hub'

export default async function GatewaysPage() {
    const hubs = await serverApiFetch<Hub[]>('/api/hubs')

    return (
        <div className="flex h-full flex-col gap-4">
            <h1 className="shrink-0 text-2xl font-bold">本地閘道</h1>
            <div className="flex-1 min-h-0">
                <GatewayList initialHubs={hubs} />
            </div>
        </div>
    )
}