export type StatusDotState = 'online' | 'offline' | 'disabled'

const STATUS_DOT_STYLE: Record<StatusDotState, string> = {
    online: 'bg-[#64BD91] shadow-[0_0_0_6px_#EAF5EF]',
    offline: 'bg-[#D8665C] shadow-[0_0_0_6px_#FAEAE8]',
    disabled: 'bg-[#BFC8C2] shadow-[0_0_0_6px_#EDEEEC]',
}
export function StatusDot({ status }: { status: StatusDotState }) {
    return <span className={`h-3 w-3 shrink-0 rounded-full ${STATUS_DOT_STYLE[status]}`} />
}