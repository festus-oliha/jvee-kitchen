import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useMenu } from "../lib/menu";
import type { Product } from "../lib/types";
import ProductCard from "../components/ProductCard";
import LocationNotice from "../components/LocationNotice";
import OptionPicker from "../components/OptionPicker";
import CartBar from "../components/CartBar";
import { useCart } from "../lib/cart";

export default function Menu() {
  const { menu, location, source } = useMenu();
  const { hash } = useLocation();
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>(undefined);
  const [picking, setPicking] = useState<Product | null>(null);
  const cart = useCart();

  const sections = menu.categories
    .map((c) => ({ ...c, products: menu.products.filter((p) => p.category_id === c.id) }))
    .filter((c) => c.products.length > 0);

  // Jump to a category when arriving from a Home tile (/menu#cakes)
  useEffect(() => {
    if (!hash || source === "loading") return;
    const id = decodeURIComponent(hash.slice(1));
    document.getElementById(id)?.scrollIntoView({ block: "start" });
    setActive(id);
  }, [hash, source]);

  // Highlight the chip of the section on screen
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections.length]);

  // Keep the highlighted chip visible in the scrolling chip row
  useEffect(() => {
    if (!active) return;
    const chip = document.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    const row = chip?.parentElement;
    if (chip && row) row.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  const closed = !!location && !location.taking_orders;

  function showToast(message: string) {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  function onAdd(p: Product) {
    if (p.options.length > 1) return setPicking(p);
    if (p.options[0]) {
      cart.add(p.options[0].id);
      showToast(`Added ${p.name}`);
    }
  }

  const inCart = (p: Product) =>
    cart.lines.filter((l) => l.product.id === p.id).reduce((n, l) => n + l.quantity, 0);

  return (
    <div className="page-x pt-4 sm:pt-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[32px]">Menu</h1>
        <LocationNotice />
      </div>

      <nav aria-label="Menu sections" className="sticky top-16 z-20 -mx-4 mt-3 bg-page/95 px-4 py-2.5 backdrop-blur sm:top-[76px] sm:-mx-8 sm:px-8">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {sections.map((s) => (
            <a
              key={s.id}
              data-chip={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              aria-current={active === s.id ? "true" : undefined}
              className={`flex h-9 flex-none items-center rounded-full px-3.5 text-[13px] font-semibold ${
                active === s.id ? "bg-deep text-white" : "border-[1.5px] border-line bg-surface text-deep hover:bg-mint-light"
              }`}
            >
              {s.name}
            </a>
          ))}
        </div>
      </nav>

      {source === "loading" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[122px] animate-pulse rounded-[18px] bg-mint-light" />)}
        </div>
      )}

      <div className={`flex flex-col gap-7 pt-3 ${cart.count ? "pb-28" : "pb-6"}`}>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-[132px] sm:scroll-mt-[150px]">
            <h2 className="label-caps mb-3">{s.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  closed={closed}
                  soldOut={!!location && p.sold_out_at.includes(location.id)}
                  onAdd={onAdd}
                  inCart={inCart(p)}
                  onSetQuantity={(n) => p.options[0] && cart.setQuantity(p.options[0].id, n)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {picking && <OptionPicker product={picking} onClose={() => setPicking(null)} onAdded={showToast} />}
      <CartBar />

      <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 z-40 ${cart.count ? "bottom-24" : "bottom-5"} flex justify-center px-4`}>
        {toast && <div className="rounded-xl bg-deep px-4 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div>}
      </div>
    </div>
  );
}
