import { getHubs } from '@/lib/api/hubs'
import { GatewayList } from '@/components/gateways/gateway-list'

export default async function GatewaysPage() {
    const hubs = await getHubs()

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">本地閘道</h1>
            <GatewayList initialHubs={hubs} />
        </div>
    )
}