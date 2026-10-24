import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useMenu, priceLabel } from "../lib/menu";
import { useCart } from "../lib/cart";
import { naira } from "../lib/money";
import { fetchReviews, reviewDate, type Review } from "../lib/reviews";
import { CATEGORY_TILE, CategoryArt, ChatIcon } from "../components/Icons";
import { Stars } from "../components/Stars";
import OptionPicker from "../components/OptionPicker";
import CartBar from "../components/CartBar";
import LocationNotice from "../components/LocationNotice";

/** One product: photo, description, prices, reviews and a share button. Address: /menu/<slug> */
export default function Product() {
  const { slug = "" } = useParams();
  const { menu, location, source } = useMenu();
  const cart = useCart();
  const product = menu.products.find((p) => p.slug === slug);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} · JVee Crunch Kitchen`;
    fetchReviews(product.id).then((r) => {
      setReviews(r);
      if (window.location.hash === "#reviews") window.setTimeout(() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => { document.title = "JVee Crunch Kitchen"; };
  }, [product]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!product) {
    if (source === "loading") return <div className="page-x py-24 text-center text-muted" aria-busy="true">Loading…</div>;
    return (
      <div className="page-x flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-[24px] font-extrabold">This item isn't on the menu right now</h1>
        <Link to="/menu" className="btn-primary">See the menu</Link>
      </div>
    );
  }

  const p = product;
  const closed = !!location && !location.taking_orders;
  const soldOut = !!location && p.sold_out_at.includes(location.id);
  const url = `${window.location.origin}/menu/${p.slug}`;
  const shareText = `${p.name} from JVee Crunch Kitchen${p.rating ? ` (rated ${p.rating.average}★ by ${p.rating.count} customer${p.rating.count > 1 ? "s" : ""})` : ""}`;

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text: shareText, url }); return; } catch { /* cancelled */ return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}: ${url}`)}`, "_blank", "noopener");
    setShared(true);
  }

  function add() {
    if (p.options.length === 1) {
      cart.add(p.options[0].id);
      setToast(`${p.name} added to your cart`);
    } else setPicking(true);
  }

  return (
    <div className={`pb-16 ${cart.count ? "pb-32" : ""}`}>
      <LocationNotice />
      <div className="page-x pt-4">
        <Link to="/menu" className="text-sm font-semibold text-emerald-dark">‹ Back to the menu</Link>
      </div>

      <div className="page-x mt-3 grid gap-6 md:grid-cols-[minmax(0,440px)_1fr] md:gap-10">
        <div className={`aspect-square w-full overflow-hidden rounded-[24px] ${CATEGORY_TILE[p.category_id] ?? "bg-mint"} flex items-center justify-center`}>
          {p.photo_url ? <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" /> : <CategoryArt category={p.category_id} size={160} />}
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-1px] sm:text-[38px]">{p.name}</h1>
          {p.rating ? (
            <a href="#reviews" className="flex w-fit items-center gap-2 text-sm font-semibold">
              <Stars value={p.rating.average} size={18} /> {p.rating.average.toFixed(1)} · {p.rating.count} review{p.rating.count > 1 ? "s" : ""}
            </a>
          ) : <p className="text-sm text-muted">No reviews yet</p>}
          {p.notice_hours > 0 && <span className="w-fit rounded-md bg-amber-soft px-2 py-0.5 text-xs font-bold text-[#8A5300]">Order {p.notice_hours} hours ahead</span>}
          {p.description && <p className="whitespace-pre-line text-[16px] leading-relaxed text-muted">{p.description}</p>}

          {!p.enquiry_only && p.options.length > 1 && (
            <ul className="mt-1 flex flex-col divide-y divide-line rounded-2xl bg-surface px-4">
              {p.options.map((o) => (
                <li key={o.id} className="flex justify-between gap-3 py-2.5 text-[15px]"><span>{o.label}</span><span className="font-bold tabular-nums">{naira(o.price)}</span></li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {p.enquiry_only ? (
              <Link to="/basket" className="btn-primary h-14 flex-1 rounded-2xl text-base">Ask us for a basket</Link>
            ) : (
              <>
                <span className="text-xl font-extrabold text-emerald-dark">{priceLabel(p)}</span>
                <button type="button" onClick={add} disabled={soldOut || closed} className="btn-primary h-14 flex-1 rounded-2xl text-base">
                  {soldOut ? "Sold out today" : closed ? "Closed for orders" : p.options.length > 1 ? "Choose and add" : "Add to cart"}
                </button>
              </>
            )}
          </div>
          <button type="button" onClick={share} className="btn-secondary h-12 rounded-2xl">
            <ChatIcon /> {shared ? "Shared, thank you!" : "Share with a friend"}
          </button>
        </div>
      </div>

      <section id="reviews" aria-labelledby="reviews-h" className="page-x mt-10 max-w-3xl">
        <h2 id="reviews-h" className="text-[22px] font-extrabold tracking-[-0.5px]">What customers say</h2>
        {reviews === null ? <p className="mt-3 text-muted">Loading reviews…</p> : reviews.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface p-4 text-[15px] text-muted">No reviews yet. Customers can review this after their order is delivered or collected.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted">{reviewDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{r.comment}</p>}
                <p className="mt-2 text-sm font-semibold">{r.name} <span className="font-normal text-emerald-dark">· Verified order</span></p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {picking && <OptionPicker product={p} onClose={() => setPicking(false)} onAdded={(m) => setToast(m)} />}
      <CartBar />
      <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 z-40 ${cart.count ? "bottom-24" : "bottom-5"} flex justify-center px-4`}>
        {toast && <div className="rounded-xl bg-deep px-4 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div>}
      </div>
    </div>
  );
}
