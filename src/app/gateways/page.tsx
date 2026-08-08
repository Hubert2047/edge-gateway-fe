import { GatewayList } from '@/components/gateways/gateway-list'
import { serverApiFetch } from '@/lib/api/server'
import { Gateway } from '@/types/gateway'
import { LocalizedText } from '@/components/i18n/localized-text'
import { requireAdmin } from '@/lib/auth-guard'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export default async function GatewaysPage() {
    await requireAdmin()
    const gateways = await serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)

    return (
        <div className='flex h-full min-h-0 flex-col gap-4'>
            <h1 className='sticky top-0 z-10 shrink-0 bg-[#F7F5F0] text-xl font-bold sm:text-3xl'>
                <LocalizedText messageKey='page.gateways' />
            </h1>
            <div className='flex-1 min-h-0'>
                <GatewayList initialGateways={gateways} />
            </div>
        </div>
    )
}
