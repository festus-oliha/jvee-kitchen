import { MAX_QTY } from "../lib/cart";

interface Props {
  value: number;
  onChange: (n: number) => void;
  label: string;
  size?: "sm" | "lg";
  min?: number;
}

export default function QuantityStepper({ value, onChange, label, size = "sm", min = 0 }: Props) {
  const box = size === "lg" ? "h-14 rounded-2xl" : "h-9 rounded-xl";
  const btn = size === "lg" ? "h-14 w-12 text-[22px]" : "h-9 w-9 text-lg";
  return (
    <div className={`flex flex-none items-center border-[1.5px] border-line bg-surface ${box}`} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={`${btn} font-bold text-deep disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`One less ${label}`}>
        −
      </button>
      <span className="min-w-5 text-center text-[15px] font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={`${btn} font-bold text-deep disabled:opacity-40`} onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  );
}
