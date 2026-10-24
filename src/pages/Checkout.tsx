import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMenu } from "../lib/menu";
import { optionLabel, useCart } from "../lib/cart";
import { naira } from "../lib/money";
import { prettyTime } from "../lib/hours";
import { placeOrder, recentOrders, whatsappLink, type NewOrder } from "../lib/orders";
import type { DayKey, Location } from "../lib/types";
import QuantityStepper from "../components/QuantityStepper";
import LocationNotice from "../components/LocationNotice";
import { BagIcon, CATEGORY_TILE, CategoryArt, ChatIcon } from "../components/Icons";

const DETAILS_KEY = "jvee.details";
type Fulfilment = "delivery" | "pickup";
interface Details { name: string; phone: string; address: string; landmark: string }

function loadDetails(): Details {
  try {
    return { name: "", phone: "", address: "", landmark: "", ...JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "{}") };
  } catch {
    return { name: "", phone: "", address: "", landmark: "" };
  }
}

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Today's date in Nigeria as YYYY-MM-DD. */
function lagosDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d);
}

/** Whole-hour times a kitchen can hand over on a given date, e.g. ["09:00", ..., "17:00"]. */
function slotsFor(loc: Location, date: string): string[] {
  if (!date) return [];
  const day = DAY_KEYS[new Date(`${date}T12:00:00+01:00`).getUTCDay()];
  const hours = loc.opening_hours[day];
  if (!hours) return [];
  const start = Number(hours[0].slice(0, 2)) + 1; // give the kitchen the first hour to prepare
  const end = Number(hours[1].slice(0, 2)) - 1;
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => `${String(start + i).padStart(2, "0")}:00`);
}

const field =
  "h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] text-deep outline-none focus:border-emerald";
const labelText = "text-[11px] font-semibold uppercase tracking-[0.8px] text-muted";

export default function Checkout() {
  const navigate = useNavigate();
  const { location, source } = useMenu();
  const cart = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [details, setDetails] = useState<Details>(loadDetails);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  // Delivery is priced by the rider for each trip and paid to the rider on arrival
  const total = cart.subtotal;
  const needsDate = cart.noticeHours > 0;
  const minDate = lagosDate(Math.ceil(cart.noticeHours / 24));
  const slots = useMemo(() => (location && date ? slotsFor(location, date) : []), [location, date]);
  const closed = !!location && !location.taking_orders;
  const soldOutLines = cart.lines.filter((l) => l.soldOut);

  useEffect(() => { if (time && !slots.includes(time)) setTime(""); }, [slots, time]);

  const set = (k: keyof Details) => (e: { target: { value: string } }) => setDetails((d) => ({ ...d, [k]: e.target.value }));

  function validate(): string | null {
    if (!location) return "Please choose Benin City or Abuja.";
    if (closed) return `${location.name} is not taking orders today.`;
    if (soldOutLines.length) return `Please remove ${soldOutLines.map((l) => l.product.name).join(", ")}: sold out today.`;
    if (details.name.trim().length < 2) return "Please enter your name.";
    if (details.phone.replace(/\D/g, "").length < 10) return "Please enter a phone number with at least 10 digits, for example 0803 123 4567.";
    if (fulfilment === "delivery" && details.address.trim().length < 5) return "Please enter a delivery address.";
    if (needsDate) {
      if (!date || !time) return `Please choose when you need your order. Some items need ${cart.noticeHours} hours notice.`;
      if (new Date(`${date}T${time}:00+01:00`).getTime() < Date.now() + cart.noticeHours * 3600e3)
        return `Some items need ${cart.noticeHours} hours notice. Please choose a later date or time.`;
    }
    return null;
  }

  function orderPayload(): NewOrder {
    return {
      location_id: location!.id,
      fulfilment,
      customer_name: details.name.trim(),
      phone: details.phone.trim(),
      address: fulfilment === "delivery" ? details.address.trim() : undefined,
      landmark: fulfilment === "delivery" ? details.landmark.trim() : undefined,
      note: note.trim() || undefined,
      needed_for: needsDate ? `${date}T${time}:00+01:00` : null,
      items: cart.lines.map((l) => ({ option_id: l.option.id, quantity: l.quantity })),
    };
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) {
      document.getElementById("checkout-error")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setFailed(false);
    const result = await placeOrder(orderPayload());
    setSubmitting(false);
    if (result.ok) {
      try { localStorage.setItem(DETAILS_KEY, JSON.stringify(details)); } catch { /* ignore */ }
      cart.clear();
      navigate(`/order/${result.token}`, { replace: true });
    } else if (result.kind === "invalid") {
      setError(result.message);
    } else {
      setFailed(true);
    }
  }

  const whatsappText = useMemo(() => {
    const lines = cart.lines.map((l) => `${l.quantity} × ${l.product.name}${optionLabel(l.product, l.option) ? ` (${l.option.label})` : ""}: ${naira(l.lineTotal)}`);
    return [
      `Hello JVee Crunch Kitchen, I'd like to order (${location?.name ?? ""}, ${fulfilment}):`,
      ...lines,
      `Total: ${naira(total)}`,
      `Name: ${details.name}`,
      `Phone: ${details.phone}`,
      fulfilment === "delivery" ? `Address: ${details.address}${details.landmark ? `, ${details.landmark}` : ""}` : "",
      note ? `Note: ${note}` : "",
    ].filter(Boolean).join("\n");
  }, [cart.lines, location, fulfilment, total, details, note]);

  // Empty cart (design screen 11)
  if (source !== "loading" && cart.count === 0) {
    const last = recentOrders()[0];
    return (
      <div className="page-x flex flex-col items-center gap-4 px-9 pb-16 pt-16 text-center">
        <div className="flex h-40 w-40 items-center justify-center rounded-full bg-mint text-emerald"><BagIcon size={88} /></div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.5px]">Your cart is empty</h1>
        <p className="max-w-xs text-[15px] leading-relaxed text-muted">Add chin chin, a gift package or a veggie tray to get started.</p>
        <Link to="/menu" className="btn-primary mt-2 h-[52px] px-7">Browse the menu</Link>
        {last && <Link to={`/order/${last.token}`} className="text-sm font-semibold text-emerald underline">Track your last order, {last.code}</Link>}
      </div>
    );
  }

  return (
    <div className="page-x pb-32 pt-4 sm:pb-16 sm:pt-8">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/menu" aria-label="Back to the menu" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <h1 className="text-[22px] font-bold sm:text-[28px]">Checkout</h1>
        {location && <span className="ml-auto text-[13px] text-muted">{location.name}</span>}
      </div>

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <LocationNotice />

          {/* Items */}
          <section aria-label="Your order" className="flex flex-col divide-y divide-line rounded-2xl bg-surface px-3.5">
            {cart.lines.map((l) => (
              <div key={l.option.id} className="flex items-center gap-3 py-3">
                <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${CATEGORY_TILE[l.product.category_id] ?? "bg-mint"}`}>
                  <CategoryArt category={l.product.category_id} size={34} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold leading-snug">{l.product.name}</div>
                  {optionLabel(l.product, l.option) && <div className="text-xs text-muted">{l.option.label}</div>}
                  {l.soldOut && <div className="text-xs font-semibold text-alert">Sold out today</div>}
                  <div className="text-xs text-muted">{naira(l.option.price)} each</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-sm font-bold tabular-nums">{naira(l.lineTotal)}</span>
                  <QuantityStepper value={l.quantity} onChange={(n) => cart.setQuantity(l.option.id, n)} label={l.product.name} />
                </div>
              </div>
            ))}
            <Link to="/menu" className="py-3 text-sm font-semibold text-emerald">+ Add more items</Link>
          </section>

          {/* Delivery or pickup */}
          <fieldset>
            <legend className="sr-only">Delivery or pickup</legend>
            <div className="grid grid-cols-2 gap-1.5 rounded-[14px] bg-surface p-1">
              {(["delivery", "pickup"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={fulfilment === f} onClick={() => setFulfilment(f)}
                  className={`h-11 rounded-[11px] text-sm font-semibold ${fulfilment === f ? "bg-deep text-white" : "text-muted hover:text-deep"}`}>
                  {f === "delivery" ? "Delivery" : "Pickup · free"}
                </button>
              ))}
            </div>
            {fulfilment === "delivery" && (
              <p className="mt-2 rounded-xl bg-amber-soft px-3 py-2 text-[13px] text-amber-ink">The delivery fee depends on distance. The rider tells you the price and you pay the rider when your order arrives.</p>
            )}
            {fulfilment === "pickup" && location && (
              <p className="mt-2 text-[13px] text-muted">Collect from {location.address}.</p>
            )}
          </fieldset>

          {/* Details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={labelText}>Your name</span>
              <input className={field} autoComplete="name" value={details.name} onChange={set("name")} placeholder="Adaeze Okafor" maxLength={80} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelText}>Phone or WhatsApp</span>
              <input className={field} type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={set("phone")} placeholder="0803 123 4567" maxLength={20} required />
            </label>
            {fulfilment === "delivery" && (
              <>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className={labelText}>Delivery address</span>
                  <input className={field} autoComplete="street-address" value={details.address} onChange={set("address")} placeholder="House number and street" maxLength={200} required />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className={labelText}>Landmark <span className="normal-case tracking-normal">(optional)</span></span>
                  <input className={field} value={details.landmark} onChange={set("landmark")} placeholder="Opposite the filling station" maxLength={120} />
                </label>
              </>
            )}
          </div>

          {/* When (only when an item needs notice) */}
          {needsDate && location && (
            <fieldset className="flex flex-col gap-2 rounded-2xl bg-amber-soft p-3.5">
              <legend className="sr-only">When do you need it?</legend>
              <p className="text-sm font-semibold text-amber-ink">
                Your order includes items that need {cart.noticeHours} hours notice. When do you need it?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className={labelText}>Date</span>
                  <input className={field} type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelText}>Time</span>
                  <select className={field} value={time} onChange={(e) => setTime(e.target.value)} disabled={!slots.length}>
                    <option value="">{date && !slots.length ? "Closed that day" : "Choose"}</option>
                    {slots.map((s) => <option key={s} value={s}>{prettyTime(s)}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>
          )}

          <label className="flex flex-col gap-1">
            <span className={labelText}>Note for the kitchen <span className="normal-case tracking-normal">(optional)</span></span>
            <textarea className={`${field} h-20 resize-none py-2.5`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
              placeholder="Gift tag message, allergies, delivery instructions" />
          </label>
        </div>

        {/* Summary */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
          <section className="flex flex-col gap-1.5 rounded-2xl bg-surface p-4 text-sm tabular-nums">
            <div className="flex justify-between"><span className="text-muted">Subtotal · {cart.count} item{cart.count === 1 ? "" : "s"}</span><span>{naira(cart.subtotal)}</span></div>
            <div className="flex justify-between">
              <span className="text-muted">{fulfilment === "delivery" ? `Delivery, ${location?.name ?? ""}` : "Pickup"}</span>
              <span>{fulfilment === "delivery" ? "Paid to rider" : "Free"}</span>
            </div>
            <div className="mt-1 flex justify-between border-t-[1.5px] border-dashed border-line pt-2 text-lg font-bold"><span>Total</span><span>{naira(total)}</span></div>
          </section>

          {error && (
            <p id="checkout-error" role="alert" className="rounded-xl bg-[#FCE4E2] px-3.5 py-2.5 text-sm font-semibold text-[#7A1F17]">{error}</p>
          )}

          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-1.5 border-t border-line bg-page/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
            <button type="submit" disabled={submitting || closed} className="btn-primary h-14 w-full rounded-2xl text-base">
              {submitting ? "Placing your order…" : `Place order · ${naira(total)}`}
            </button>
            <span className="text-center text-xs text-muted">
              {fulfilment === "delivery"
                ? `Next you'll get our account details to pay ${naira(total)}. We start once it's paid. Delivery is paid to the rider on arrival.`
                : `Next you'll get our account details to pay ${naira(total)}. We start once it's paid.`}
            </span>
          </div>
        </aside>
      </form>

      {/* Order failed to send (design screen 13) */}
      {failed && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-deep/45 sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-labelledby="failed-title">
          <div className="flex w-full flex-col gap-3 rounded-t-[28px] bg-surface px-5 pb-6 pt-6 sm:max-w-md sm:rounded-[28px]">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#FCE4E2] text-alert">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 8v5" /><path d="M12 16.5v.5" /><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <h2 id="failed-title" className="text-[22px] font-extrabold tracking-[-0.5px]">Your order didn't go through</h2>
            <p className="text-sm leading-relaxed text-muted">The connection dropped before we received it. Nothing was charged and your cart is saved. Check your internet and try again.</p>
            <button type="button" onClick={() => submit()} disabled={submitting} className="btn-primary mt-1 h-14 rounded-2xl text-base">
              {submitting ? "Trying again…" : "Try again"}
            </button>
            <a href={whatsappLink(whatsappText)} target="_blank" rel="noreferrer" className="btn-secondary h-[52px] rounded-2xl">
              <ChatIcon /> Send this order on WhatsApp
            </a>
            <button type="button" onClick={() => setFailed(false)} className="h-10 text-sm font-semibold text-muted">Back to checkout</button>
          </div>
        </div>
      )}
    </div>
  );
}
