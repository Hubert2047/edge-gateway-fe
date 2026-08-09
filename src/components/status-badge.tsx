import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'

export type StatusBadgeState = 'online' | 'offline' | 'disabled'

const STATUS_BADGE_STYLE: Record<StatusBadgeState, string> = {
    online: 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
    offline: 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-100',
    disabled: 'bg-[#EDEEEC] text-[#7B8580] border border-[#D8DDD9] hover:bg-[#EDEEEC]',
}

export function StatusBadge({ status }: { status: StatusBadgeState }) {
    const { t } = useI18n()
    return (
        <Badge className={STATUS_BADGE_STYLE[status]}>
            {status === 'online'
                ? t('overview.online')
                : status === 'offline'
                    ? t('common.offline')
                    : t('common.disabled')}
        </Badge>
    )
}