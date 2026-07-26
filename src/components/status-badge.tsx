import { Badge } from '@/components/ui/badge'

export function StatusBadge({ enabled, activeLabel }: { enabled: boolean; activeLabel: string }) {
    return (
        <Badge
            className={
                enabled
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-100'
            }
        >
            {enabled ? activeLabel : '停用'}
        </Badge>
    )
}