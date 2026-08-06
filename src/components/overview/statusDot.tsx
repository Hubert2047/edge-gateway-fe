export function StatusDot({ active }: { active: boolean }) {
    return (
        <span
            className={`h-3 w-3 shrink-0 rounded-full ${active ? 'bg-[#64BD91] shadow-[0_0_0_6px_#EAF5EF]' : 'bg-[#D8665C] shadow-[0_0_0_6px_#FAEAE8]'}`}
        />
    )
}
