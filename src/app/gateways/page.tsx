import { GatewayList } from '@/components/gateways/gateway-list'
import { serverApiFetch } from '@/lib/api/server'
import { Hub } from '@/types/hub'
import { LocalizedText } from '@/components/i18n/localized-text'

export default async function GatewaysPage() {
    const hubs = await serverApiFetch<Hub[]>('/api/hubs')

    return (
        <div className="flex h-full flex-col gap-4">
            <h1 className="shrink-0 text-xl font-bold sm:text-2xl"><LocalizedText messageKey="page.gateways" /></h1>
            <div className="flex-1 min-h-0">
                <GatewayList initialHubs={hubs} />
            </div>
        </div>
    )
}
