export function Summary({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
    return (
        <div className='border-b border-r border-[#D8DDD9] p-2 lg:px-5 lg:py-3 last:border-r-0 md:border-b-0'>
            <p className='text-sm text-[#7B8580]'>{label}</p>
            <p className='mt-2 text-3xl font-semibold'>
                {value} <span className='text-xl text-[#AAB2AD]'>{suffix}</span>
            </p>
        </div>
    )
}
