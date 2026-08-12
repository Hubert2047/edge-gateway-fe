import type { Gateway } from '@/types/gateway'

export function getGatewayDisplayName(
    gateway: Pick<Gateway, 'name' | 'isVirtual'>,
    t: (key: string) => string,
) {
    return gateway.isVirtual ? t('gateway.virtual') : gateway.name
}
