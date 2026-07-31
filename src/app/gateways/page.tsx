import { GatewayList } from '@/components/gateways/gateway-list'
import { serverApiFetch } from '@/lib/api/server'
import { Gateway } from '@/types/gateway'
import { LocalizedText } from '@/components/i18n/localized-text'
import { requireAdmin } from '@/lib/auth-guard'

export default async function GatewaysPage() {
    await requireAdmin()
    const gateways = await serverApiFetch<Gateway[]>(GATEWAY_ENPOINT.base)

    return (
        <div className='flex h-full flex-col gap-4'>
            <h1 className='shrink-0 text-xl font-bold sm:text-2xl'>
                <LocalizedText messageKey='page.gateways' />
            </h1>
            <div className='flex-1 min-h-0'>
                <GatewayList initialGateways={gateways} />
            </div>
        </div>
    )
}
