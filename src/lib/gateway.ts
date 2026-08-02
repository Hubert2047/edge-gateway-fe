import type { Gateway } from '@/types/gateway'

export const VIRTUAL_GATEWAY_UID = 'virtual-gateway'

export function getGatewayDisplayName(
    gateway: Pick<Gateway, 'uid' | 'name'>,
    t: (key: string) => string,
) {
    return gateway.uid === VIRTUAL_GATEWAY_UID ? t('gateway.virtual') : gateway.name
}
