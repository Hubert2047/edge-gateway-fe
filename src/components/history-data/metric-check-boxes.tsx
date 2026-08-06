import { MetricKey, SelectedMetrics } from './history-data-view'
import { MetricCheckbox } from './metric-checkbox'

export function MetricCheckboxes({
    options,
    selected,
    onChange,
}: {
    options: { key: MetricKey; label: string }[]
    selected: SelectedMetrics
    onChange: (key: MetricKey, checked: boolean) => void
}) {
    return (
        <>
            {options.map((option) => (
                <MetricCheckbox key={option.key} option={option} selected={selected} onChange={onChange} />
            ))}
        </>
    )
}
