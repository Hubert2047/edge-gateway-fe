export function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className='text-xs text-[#8A938E]'>{label}</p>
            <p className='mt-2 font-mono font-semibold'>{value}</p>
        </div>
    )
}
