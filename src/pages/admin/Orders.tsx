import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useMenu } from "../../lib/menu";
import { supabase } from "../../lib/supabase";
import { naira } from "../../lib/money";
import { payNow } from "../../lib/orders";
import { fetchBoardOrders, internationalPhone, moveOrder, setPaid, startOfTodayLagos, type AdminOrder, type OrderStatusName } from "../../lib/admin";

/** Live orders board (design screen 10). */

type Tab = "new" | "preparing" | "ready" | "done";
const TABS: { id: Tab; label: string; statuses: OrderStatusName[] }[] = [
  { id: "new", label: "New", statuses: ["received"] },
  { id: "preparing", label: "Preparing", statuses: ["preparing"] },
  { id: "ready", label: "Ready / Out", statuses: ["ready", "out_for_delivery"] },
  { id: "done", label: "Done today", statuses: ["completed", "cancelled"] },
];
const POLL_MS = 30_000;
const SOUND_KEY = "jvee.admin.sound";
const FILTER_KEY = "jvee.admin.location";

const lagosTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).replace(" ", "");
const lagosDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

function minutesAgo(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min ago` : lagosDay(iso);
}

/** Short two-tone chime made in the browser, so there is no sound file to download. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* no audio on this device */ }
}

export default function Orders() {
  const { staff, isFounder } = useAuth();
  const { menu } = useMenu();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [unseen, setUnseen] = useState(0);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem(SOUND_KEY) === "on"; } catch { return false; } });
  const [filter, setFilter] = useState<string>(() => { try { return localStorage.getItem(FILTER_KEY) ?? "all"; } catch { return "all"; } });
  const known = useRef<Set<string> | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const seesBoth = isFounder || staff?.location_id == null;
  const locationName = useCallback((id: string) => menu.locations.find((l) => l.id === id)?.name ?? id, [menu.locations]);

  const load = useCallback(async () => {
    try {
      const list = await fetchBoardOrders();
      const fresh = list.filter((o) => o.status === "received" && known.current && !known.current.has(o.id));
      if (fresh.length) {
        setUnseen((n) => n + fresh.length);
        if (soundRef.current) chime();
      }
      known.current = new Set(list.map((o) => o.id));
      setOrders(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // First load, live updates, and a slower check every 30 seconds in case the live link drops
  useEffect(() => {
    load();
    const poll = window.setInterval(load, POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      ?.channel("orders-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase?.removeChannel(channel);
    };
  }, [load]);

  // New-order count in the browser tab title
  useEffect(() => {
    document.title = unseen ? `(${unseen}) New order${unseen > 1 ? "s" : ""} · JVee admin` : "Orders · JVee admin";
  }, [unseen]);
  useEffect(() => {
    const clear = () => { if (document.visibilityState === "visible" && tab === "new") setUnseen(0); };
    clear();
    window.addEventListener("focus", clear);
    return () => window.removeEventListener("focus", clear);
  }, [tab, orders]);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* ignore */ }
    if (next) chime(); // also unlocks audio on phones, which need a tap first
  }
  function chooseFilter(id: string) {
    setFilter(id);
    try { localStorage.setItem(FILTER_KEY, id); } catch { /* ignore */ }
  }

  const today = Date.parse(startOfTodayLagos(new Date(now)));
  const isToday = (iso: string) => Date.parse(iso) >= today;
  const visible = useMemo(
    () => (orders ?? []).filter((o) => filter === "all" || o.location_id === filter),
    [orders, filter],
  );
  const byTab = useMemo(() => {
    const out: Record<Tab, AdminOrder[]> = { new: [], preparing: [], ready: [], done: [] };
    for (const o of visible) {
      const t = TABS.find((x) => x.statuses.includes(o.status))!.id;
      if (t === "done" && !isToday(o.updated_at) && !isToday(o.created_at)) continue;
      out[t].push(o);
    }
    out.done.reverse(); // latest finished first
    // New: paid orders (ready to start) first, then those still waiting for payment
    out.new.sort((a, b) => Number(b.paid) - Number(a.paid));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, today]);

  const placedToday = visible.filter((o) => isToday(o.created_at) && o.status !== "cancelled");
  const salesByLocation = menu.locations
    .filter((l) => filter === "all" || l.id === filter)
    .filter((l) => seesBoth || l.id === staff?.location_id)
    .map((l) => ({
      name: l.name,
      total: visible.filter((o) => o.location_id === l.id && o.status === "completed" && isToday(o.updated_at)).reduce((s, o) => s + o.total, 0),
    }));

  const update = (id: string, patch: Partial<AdminOrder>) =>
    setOrders((list) => list?.map((o) => (o.id === id ? { ...o, ...patch } : o)) ?? null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Orders</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-emerald" : "bg-amber"}`} aria-hidden />
            {live ? "Live: new orders appear by themselves" : "Checking for new orders every 30 seconds"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {seesBoth && menu.locations.length > 1 && (
            <select aria-label="Location" value={filter} onChange={(e) => chooseFilter(e.target.value)}
              className="h-11 rounded-xl border-[1.5px] border-line bg-surface px-3 text-sm font-semibold">
              <option value="all">Both locations</option>
              {menu.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <button type="button" onClick={toggleSound} aria-pressed={sound}
            className={`h-11 rounded-xl px-4 text-sm font-semibold ${sound ? "bg-deep text-white" : "border-[1.5px] border-deep bg-surface text-deep"}`}>
            {sound ? "🔔 Sound on" : "🔕 Turn on sound"}
          </button>
          <button type="button" onClick={load} className="h-11 rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold">Refresh</button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-[#FCE4E2] px-4 py-3 text-sm font-semibold text-[#7A1F17]">
          {error} The board will try again in 30 seconds.
        </p>
      )}

      <section aria-label="Today" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Paid, ready to start" value={String(byTab.new.filter((o) => o.paid).length)} highlight={byTab.new.some((o) => o.paid)} />
        <Stat label="Awaiting payment" value={String(byTab.new.filter((o) => !o.paid).length)} />
        <Stat label="Orders today" value={String(placedToday.length)} />
        {salesByLocation.map((s) => <Stat key={s.name} label={`Completed sales · ${s.name}`} value={naira(s.total)} />)}
      </section>

      <div role="tablist" aria-label="Order stage" className="flex gap-1 overflow-x-auto rounded-2xl bg-mint p-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold ${tab === t.id ? "bg-deep text-white" : "text-muted hover:text-deep"}`}>
            {t.label}
            <span className={`min-w-6 rounded-full px-1.5 text-xs leading-6 ${tab === t.id ? "bg-zest text-deep" : t.id === "new" && byTab.new.length ? "bg-alert text-white" : "bg-surface"}`}>{byTab[t.id].length}</span>
          </button>
        ))}
      </div>

      {orders === null && !error ? (
        <p className="py-10 text-center text-muted">Loading orders…</p>
      ) : byTab[tab].length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-lg font-bold">{tab === "new" ? "No new orders right now" : tab === "done" ? "Nothing finished yet today" : "Nothing here"}</p>
          <p className="mt-1 text-sm text-muted">{tab === "new" ? (sound ? "You'll hear a chime when one comes in." : "Turn on sound to hear a chime when one comes in.") : "Orders move here as you update them."}</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byTab[tab].map((o) => (
            <OrderCard key={o.id} order={o} now={now} showLocation={seesBoth && filter === "all"} locationName={locationName(o.location_id)}
              onChanged={(patch) => { update(o.id, patch); load(); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${highlight ? "border-alert bg-[#FCE4E2]" : "border-line bg-surface"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.6px] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

const NEXT: Partial<Record<OrderStatusName, (o: AdminOrder) => { status: OrderStatusName; label: string }>> = {
  received: () => ({ status: "preparing", label: "Start preparing" }),
  preparing: (o) => (o.fulfilment === "delivery" ? { status: "out_for_delivery", label: "Out for delivery" } : { status: "ready", label: "Ready for pickup" }),
  ready: () => ({ status: "completed", label: "Picked up · complete" }),
  out_for_delivery: () => ({ status: "completed", label: "Delivered · complete" }),
};

const STATUS_TEXT: Record<OrderStatusName, string> = {
  received: "New", preparing: "Preparing", ready: "Ready for pickup", out_for_delivery: "Out for delivery", completed: "Completed", cancelled: "Cancelled",
};

function OrderCard({ order: o, now, showLocation, locationName, onChanged }: {
  order: AdminOrder; now: number; showLocation: boolean; locationName: string; onChanged: (patch: Partial<AdminOrder>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const next = NEXT[o.status]?.(o);
  const due = payNow(o);
  const needsPayment = o.status === "received" && !o.paid;
  const open = o.status !== "completed" && o.status !== "cancelled";

  async function run(fn: () => Promise<void>, patch: Partial<AdminOrder>) {
    setBusy(true); setError(null);
    try { await fn(); onChanged(patch); setCancelling(false); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  // The message includes the customer's tracking link, so they can always find their order again
  const track = `${window.location.origin}/order/${o.tracking_token}`;
  const waText = needsPayment
    ? `Hello ${o.customer_name.split(" ")[0]}, this is JVee Crunch Kitchen about your order ${o.code}. Please pay ${naira(due)} by transfer with ${o.code} as the reference, and we'll start right away. Account details and live status: ${track}`
    : o.paid && o.status === "received"
      ? `Hello ${o.customer_name.split(" ")[0]}, we've received your payment for order ${o.code}. Thank you! Follow your order here: ${track}`
      : `Hello ${o.customer_name.split(" ")[0]}, this is JVee Crunch Kitchen about your order ${o.code}. Track it here: ${track}`;
  const wa = `https://wa.me/${internationalPhone(o.phone)}?text=${encodeURIComponent(waText)}`;
  const neededSoon = o.needed_for && new Date(o.needed_for).getTime() - now < 3 * 3600_000;

  return (
    <article aria-label={`Order ${o.code}`} className={`flex flex-col gap-3 rounded-[20px] border bg-surface p-4 shadow-sm ${o.status === "received" && o.paid ? "border-emerald ring-2 ring-emerald/20" : "border-line"}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold tracking-[0.5px]">{o.code}</p>
          <p className="text-xs text-muted">{lagosTime(o.created_at)} · {minutesAgo(o.created_at, now)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {showLocation && <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold">{locationName}</span>}
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${o.fulfilment === "delivery" ? "bg-amber-soft text-amber-ink" : "bg-[#E3F3F8] text-[#0B4A5C]"}`}>
            {o.fulfilment === "delivery" ? "Delivery" : "Pickup"}
          </span>
          {!open && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${o.status === "cancelled" ? "bg-[#FCE4E2] text-[#7A1F17]" : "bg-mint text-emerald-dark"}`}>{STATUS_TEXT[o.status]}</span>}
        </div>
      </header>

      {o.needed_for && (
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${neededSoon && open ? "bg-amber-soft text-amber-ink" : "bg-mint-light"}`}>
          Needed {lagosDay(o.needed_for)}, {lagosTime(o.needed_for)}
        </p>
      )}

      <ul className="flex flex-col gap-1 border-y border-line py-2.5 text-[15px]">
        {o.order_items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span><b>{i.quantity} ×</b> {i.item_name}</span>
            <span className="whitespace-nowrap text-muted">{naira(i.unit_price * i.quantity)}</span>
          </li>
        ))}
        {o.delivery_fee > 0 && (
          <li className="flex justify-between gap-3 text-sm text-muted"><span>Delivery</span><span>{naira(o.delivery_fee)}</span></li>
        )}
        <li className="mt-1 flex justify-between gap-3 font-extrabold"><span>Total</span><span>{naira(o.total)}</span></li>
      </ul>

      {o.note && <p className="rounded-xl bg-amber-soft px-3 py-2 text-sm text-amber-ink"><b>Note:</b> {o.note}</p>}

      <div className="text-sm leading-relaxed">
        <p className="font-bold">{o.customer_name}</p>
        <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="font-semibold text-emerald-dark underline">{o.phone}</a>
        {o.fulfilment === "delivery" && o.address && (
          <p className="mt-0.5 text-muted">{o.address}{o.landmark ? ` · near ${o.landmark}` : ""}</p>
        )}
      </div>

      {o.status === "cancelled" && o.cancel_reason && <p className="text-sm text-[#7A1F17]"><b>Cancelled:</b> {o.cancel_reason}</p>}

      <div className={`flex flex-col gap-2 rounded-xl p-3 text-sm ${o.paid ? "bg-mint" : o.status === "cancelled" ? "bg-mint-light" : "bg-amber-soft"}`}>
        {o.paid ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-emerald-dark">✓ Paid {naira(due)} · {o.payment_method === "transfer" ? "transfer" : "cash"}</span>
            {o.status === "received" && <button type="button" disabled={busy} onClick={() => run(() => setPaid(o.id, false, null), { paid: false, payment_method: null })} className="text-xs font-semibold text-muted underline">Undo</button>}
          </div>
        ) : o.status !== "cancelled" ? (
          <>
            <span className="font-bold text-amber-ink">Awaiting payment of {naira(due)}. Check your bank app for reference {o.code}.</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => run(() => setPaid(o.id, true, "transfer"), { paid: true, payment_method: "transfer" })} className="h-10 rounded-lg bg-deep px-3.5 font-semibold text-white">Transfer received</button>
              <button type="button" disabled={busy} onClick={() => run(() => setPaid(o.id, true, "cash"), { paid: true, payment_method: "cash" })} className="h-10 rounded-lg border-[1.5px] border-deep bg-surface px-3.5 font-semibold">Paid cash</button>
            </div>
          </>
        ) : <span className="text-muted">Not paid</span>}
        {o.fulfilment === "delivery" && o.delivery_fee > 0 && o.status !== "cancelled" && (
          <span className={o.status === "out_for_delivery" ? "font-bold text-deep" : "text-muted"}>Collect {naira(o.delivery_fee)} delivery fee on arrival</span>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17]">{error}</p>}

      {cancelling ? (
        <form className="flex flex-col gap-2 rounded-xl bg-[#FCE4E2]/60 p-3" onSubmit={(e) => { e.preventDefault(); run(() => moveOrder(o.id, "cancelled", reason), { status: "cancelled", cancel_reason: reason }); }}>
          <label className="text-sm font-semibold" htmlFor={`reason-${o.id}`}>Reason (the customer will see this)</label>
          <div className="flex flex-wrap gap-1.5">
            {["No payment received", "Sold out today", "We can't deliver to this address"].map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold">{r}</button>
            ))}
          </div>
          <input id={`reason-${o.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus placeholder="e.g. No payment received"
            className="h-11 rounded-lg border-[1.5px] border-line bg-surface px-3 text-[15px] outline-none focus:border-alert" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || reason.trim().length < 3} className="h-11 flex-1 rounded-xl bg-alert font-bold text-white disabled:opacity-50">Cancel order</button>
            <button type="button" onClick={() => setCancelling(false)} className="h-11 flex-1 rounded-xl border-[1.5px] border-line bg-surface font-semibold">Keep it</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {next && (
            <button type="button" disabled={busy || needsPayment} onClick={() => run(() => moveOrder(o.id, next.status), { status: next.status })} className="btn-primary h-12 flex-[2_1_160px]">
              {busy ? "Saving…" : needsPayment ? "Start after payment" : next.label}
            </button>
          )}
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-12 flex-[1_1_110px] items-center justify-center rounded-btn border-[1.5px] border-deep bg-surface px-3 text-sm font-semibold">WhatsApp</a>
          {(o.status === "received" || o.status === "preparing") && (
            <button type="button" onClick={() => setCancelling(true)} className="h-12 flex-[1_1_90px] rounded-btn px-3 text-sm font-semibold text-alert hover:bg-[#FCE4E2]">Cancel…</button>
          )}
        </div>
      )}
    </article>
  );
}
