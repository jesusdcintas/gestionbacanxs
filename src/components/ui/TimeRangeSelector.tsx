import { TIME_RANGE_OPTIONS, type TimeRange } from '../../lib/timeRange';

interface Props {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
}

export default function TimeRangeSelector({ value, onChange, className = '' }: Props) {
  return (
    <div className={`inline-flex flex-wrap gap-1 border border-border bg-[#0a0a0a] p-1 ${className}`.trim()}>
      {TIME_RANGE_OPTIONS.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 px-3 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              active
                ? 'bg-accent text-[#0a0a0a] font-semibold'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
