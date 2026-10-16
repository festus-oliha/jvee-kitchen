import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "../lib/types";
import { naira } from "../lib/money";
import { useCart } from "../lib/cart";
import { CATEGORY_TILE, CategoryArt } from "./Icons";
import QuantityStepper from "./QuantityStepper";

interface Props {
  product: Product;
  onClose: () => void;
  onAdded: (message: string) => void;
}

/**
 * Bottom sheet on phones, centred dialog on larger screens (design screen 3).
 * Products with both a size and a type (chin chin) get a type switch plus a size list;
 * other products with several options get a single list.
 */
export default function OptionPicker({ product, onClose, onAdded }: Props) {
  const { add } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const twoAxis = product.options.every((o) => o.size && o.type);

  const types = useMemo(() => [...new Set(product.options.map((o) => o.type).filter((t): t is string => !!t))], [product]);
  const [type, setType] = useState<string | null>(twoAxis ? types[types.length - 1] ?? null : null);
  const visible = twoAxis ? product.options.filter((o) => o.type === type) : product.options;

  const [optionId, setOptionId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Keep the same size selected when switching Standard / Premium
  useEffect(() => {
    if (!twoAxis) return;
    setOptionId((current) => {
      const size = product.options.find((o) => o.id === current)?.size;
      return visible.find((o) => o.size === size)?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const selected = product.options.find((o) => o.id === optionId) ?? null;

  // Close on Escape, keep focus inside, lock page scroll
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);

  function confirm() {
    if (!selected) return;
    add(selected.id, quantity);
    onAdded(`Added ${quantity} × ${product.name}${product.options.length > 1 ? `, ${selected.label}` : ""}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-deep/45 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-surface px-4 pb-5 pt-2.5 sm:max-w-md sm:rounded-[28px] sm:pt-5"
      >
        <div className="mx-auto h-[5px] w-11 flex-none rounded bg-line sm:hidden" aria-hidden="true" />

        <div className="flex items-center gap-3.5">
          <div className={`flex h-[84px] w-[84px] flex-none items-center justify-center rounded-2xl ${CATEGORY_TILE[product.category_id] ?? "bg-mint"}`}>
            {product.photo_url ? <img src={product.photo_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : <CategoryArt category={product.category_id} size={60} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="picker-title" className="text-[22px] font-bold leading-tight tracking-[-0.5px]">{product.name}</h2>
            <p className="mt-1 text-[13px] leading-snug text-muted">{product.description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 flex-none items-center justify-center self-start rounded-xl bg-mint-light">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {twoAxis && types.length > 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="label-caps mb-2">Type</legend>
            <div className="grid grid-cols-2 gap-1.5 rounded-[14px] bg-mint-light p-1">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={`h-11 rounded-[11px] text-sm font-semibold ${type === t ? "bg-deep text-white" : "text-muted hover:text-deep"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="label-caps mb-2">{twoAxis ? "Size" : "Choose one"}</legend>
          {visible.map((o) => {
            const on = o.id === optionId;
            return (
              <label
                key={o.id}
                className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] px-4 text-[15px] ${on ? "border-2 border-emerald bg-mint" : "border-[1.5px] border-line hover:bg-mint-light"}`}
              >
                <input type="radio" name="option" checked={on} onChange={() => setOptionId(o.id)} className="h-5 w-5 accent-emerald" />
                <span className={`flex-1 ${on ? "font-bold" : "font-semibold"}`}>{twoAxis ? o.size : o.label}</span>
                <span className={`tabular-nums ${on ? "font-bold text-emerald" : ""}`}>{naira(o.price)}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-1 flex items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} label={product.name} size="lg" min={1} />
          <button type="button" onClick={confirm} disabled={!selected} className="btn-primary h-14 flex-1 rounded-2xl">
            {selected ? `Add to cart · ${naira(selected.price * quantity)}` : twoAxis ? "Choose a size" : "Choose an option"}
          </button>
        </div>
      </div>
    </div>
  );
}
