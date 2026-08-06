import { metricColors, MetricKey, SelectedMetrics } from './history-data-view'

export function MetricCheckbox({
    option,
    selected,
    onChange,
}: {
    option: { key: MetricKey; label: string }
    selected: SelectedMetrics
    onChange: (key: MetricKey, checked: boolean) => void
}) {
    return (
        <label className='flex items-center gap-2 text-sm text-[#5F6964]'>
            <input
                type='checkbox'
                checked={selected[option.key]}
                onChange={(event) => onChange(option.key, event.target.checked)}
                className='h-4 w-4'
                style={{ accentColor: metricColors[option.key] }}
            />
            <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: metricColors[option.key] }} />
            {option.label}
        </label>
    )
}
