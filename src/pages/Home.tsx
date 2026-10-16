import { Link } from "react-router";
import { priceLabel, useMenu } from "../lib/menu";
import { hoursSummary, isOpenNow } from "../lib/hours";
import { naira } from "../lib/money";
import { CATEGORY_TILE, CategoryArt, CheckCircle, Leaf } from "../components/Icons";

export default function Home() {
  const { menu, location, setLocationId, source } = useMenu();
  const featured = menu.products.find((p) => p.slug === "basic-unique-package");
  const popular = ["homemade-chin-chin", "basic-unique-package", "naked-fruit-cake"]
    .map((s) => menu.products.find((p) => p.slug === s))
    .filter((p) => !!p);
  const open = location ? isOpenNow(location) : false;

  return (
    <div className="page-x flex flex-col gap-7 pt-2 sm:gap-9 sm:pt-9">
      <section className="flex flex-col gap-5 lg:flex-row lg:gap-8">
        {/* Hero */}
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-emerald px-[22px] py-6 text-white sm:p-11 lg:flex-[1_1_55%]">
          <Leaf className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 opacity-20 sm:-bottom-36 sm:-right-28 sm:top-auto sm:h-[360px] sm:w-[360px]" />
          <p className="text-xs font-semibold uppercase tracking-[1px] text-[#CFF0A0] sm:text-[13px]">
            Benin City · Abuja
            {location && <span className="hidden sm:inline"> · {hoursSummary(location)}</span>}
          </p>
          <h1 className="max-w-[460px] text-[32px] font-extrabold leading-[1.02] tracking-[-1.2px] text-balance sm:text-[52px] sm:tracking-[-2px]">
            Homemade treats, fresh greens.
          </h1>
          <p className="max-w-[420px] text-[15px] leading-relaxed text-mint sm:text-[17px]">
            Chin chin, cakes, veggie trays and chilled drinks, made to order for delivery or pickup.
          </p>
          <div className="relative mt-1 flex flex-wrap items-center gap-3.5">
            <Link to="/menu" className="inline-flex h-12 items-center rounded-btn bg-zest px-[22px] text-[15px] font-bold text-deep hover:brightness-95 sm:h-[52px] sm:text-base">
              Order now
            </Link>
            <Link to="/basket" className="hidden h-[52px] items-center rounded-btn border-[1.5px] border-[#CFF0A0] px-[22px] font-semibold hover:bg-white/10 sm:inline-flex">
              Plan a gift basket
            </Link>
            <span className="text-[13px] text-mint sm:hidden">{open ? "Open now" : "Order now, made from 8am"}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-3 lg:flex-[1_1_45%]">
          <h2 className="text-xl font-bold tracking-[-0.5px] lg:sr-only">What we make</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 lg:h-full">
            {menu.categories.map((c) => (
              <Link
                key={c.id}
                to={`/menu#${c.id}`}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center hover:brightness-[0.97] sm:gap-2.5 sm:rounded-[20px] sm:py-5 ${CATEGORY_TILE[c.id] ?? "bg-mint"}`}
              >
                <CategoryArt category={c.id} />
                <span className="text-[13px] font-semibold sm:text-[15px]">{c.name}</span>
              </Link>
            ))}
            {source === "loading" && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint-light" />)}
          </div>
        </div>
      </section>

      {/* Location choice */}
      {menu.locations.length > 1 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="label-caps">Order from</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:max-w-xl">
            {menu.locations.map((l) => {
              const selected = l.id === location?.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLocationId(l.id)}
                  className={`flex flex-col gap-0.5 rounded-2xl px-3.5 py-3 text-left ${selected ? "border-2 border-emerald bg-mint" : "border-[1.5px] border-line bg-white hover:bg-mint-light"}`}
                >
                  <span className="flex w-full items-center justify-between text-base font-bold">
                    {l.name}
                    {selected && <CheckCircle />}
                  </span>
                  <span className="text-xs text-muted">{l.address.replace(`, ${l.name}`, "")}</span>
                  {!l.taking_orders && <span className="text-xs font-semibold text-amber">Not taking orders today</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Popular on desktop, featured package on phones */}
      {popular.length > 0 && (
        <section className="hidden flex-col gap-4 sm:flex">
          <h2 className="text-[26px] font-bold tracking-[-0.5px]">Popular this week</h2>
          <div className="grid grid-cols-3 gap-4">
            {popular.map((p) => (
              <Link key={p.id} to={`/menu#${p.category_id}`} className="flex items-center gap-4 rounded-[20px] border-[1.5px] border-line p-[18px] hover:bg-mint-light">
                <div className={`flex h-[72px] w-[72px] flex-none items-center justify-center rounded-2xl ${CATEGORY_TILE[p.category_id]}`}>
                  <CategoryArt category={p.category_id} size={48} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold">{p.name}</div>
                  <div className="mt-1 text-sm font-bold text-emerald">
                    {priceLabel(p)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {featured && featured.options[0] && (
        <Link to="/menu#gift-packages" className="flex items-center justify-between gap-3 rounded-[20px] bg-zest px-[18px] py-4 sm:hidden">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#2F4A08]">Gift-ready</span>
            <span className="text-[17px] font-bold">{featured.name}</span>
            <span className="text-[15px] font-semibold">{naira(featured.options[0].price)}</span>
          </span>
          <span className="flex h-11 flex-none items-center rounded-btn bg-deep px-[18px] text-sm font-bold text-white">View</span>
        </Link>
      )}
    </div>
  );
}
