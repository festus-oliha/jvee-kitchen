/** Read-only star row, e.g. ★★★★☆ for 4.2. */
export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#E0A23A" />
                <stop offset={`${fill * 100}%`} stopColor="#D6E2D3" />
              </linearGradient>
            </defs>
            <path d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill={`url(#s${i}-${Math.round(fill * 100)})`} />
          </svg>
        );
      })}
    </span>
  );
}

/** Tap-to-choose stars for writing a review. */
export function StarPicker({ value, onChange, name }: { value: number; onChange: (n: number) => void; name: string }) {
  const words = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" aria-label={`Your rating for ${name}`} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => onChange(i)}
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-amber-soft">
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill={i <= value ? "#E0A23A" : "#D6E2D3"} />
            </svg>
          </button>
        ))}
      </div>
      {value > 0 && <span className="text-sm font-semibold text-amber-ink">{words[value]}</span>}
    </div>
  );
}
