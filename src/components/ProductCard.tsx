import { Link } from "react-router";
import type { Product } from "../lib/types";
import { priceLabel } from "../lib/menu";
import { CATEGORY_TILE, CategoryArt } from "./Icons";

interface Props {
  product: Product;
  soldOut: boolean;
  closed: boolean;
  onAdd: (p: Product) => void;
}

export default function ProductCard({ product: p, soldOut, closed, onAdd }: Props) {
  const hasChoices = p.options.length > 1;
  const disabled = soldOut || closed;

  let action;
  if (p.enquiry_only) {
    action = <Link to="/basket" className="btn-primary h-9 rounded-xl px-3.5 text-[13px]">Ask us</Link>;
  } else if (soldOut) {
    action = <span className="text-[13px] font-bold uppercase tracking-[0.5px] text-alert">Sold out</span>;
  } else {
    action = (
      <button type="button" disabled={disabled} onClick={() => onAdd(p)} className="btn-primary h-9 rounded-xl px-3.5 text-[13px]">
        {closed ? "Closed" : hasChoices ? "Choose" : "Add"}
      </button>
    );
  }

  return (
    <article className={`flex gap-3.5 rounded-[18px] border-[1.5px] border-line bg-surface p-3 ${soldOut ? "opacity-70" : ""}`}>
      <div className={`flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-[14px] ${CATEGORY_TILE[p.category_id] ?? "bg-mint"}`}>
        {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <CategoryArt category={p.category_id} size={64} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-base font-bold leading-snug">{p.name}</h3>
        {p.notice_hours > 0 && (
          <span className="self-start rounded-md bg-amber-soft px-2 py-0.5 text-[11px] font-bold text-[#8A5300]">
            Order {p.notice_hours} hours ahead
          </span>
        )}
        <p className="line-clamp-2 text-[13px] leading-snug text-muted">{p.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-[15px] font-bold text-emerald">
            {p.enquiry_only ? "Your budget" : priceLabel(p)}
          </span>
          {action}
        </div>
      </div>
    </article>
  );
}
