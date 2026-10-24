import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { fetchOrder, payNow, trackingUrl, whatsappLink, type OrderStatus as Status, type TrackedOrder } from "../lib/orders";
import { naira } from "../lib/money";
import { ChatIcon } from "../components/Icons";
import RateOrder from "../components/RateOrder";

const POLL_MS = 15_000;

function steps(o: TrackedOrder): { key: Status; label: string; hint: string }[] {
  const out = o.fulfilment === "delivery"
    ? { key: "out_for_delivery" as const, label: "Out for delivery", hint: "On its way to you" }
    : { key: "ready" as const, label: "Ready for pickup", hint: `Collect from ${o.location.address}` };
  return [
    { key: "received", label: "Order received", hint: "The kitchen has your order" },
    { key: "received", label: o.paid ? "Payment confirmed" : "Waiting for payment", hint: `Waiting for your transfer of ${naira(payNow(o))}` },
    { key: "preparing", label: "Preparing", hint: o.status === "received" ? "Payment received. The kitchen starts shortly" : "The kitchen is making your order" },
    out,
    { key: "completed", label: "Completed", hint: "Enjoy, and thank you" },
  ];
}

/** Which step is current: 1 = waiting for payment, 2 = paid and preparing, and so on. */
function rank(o: TrackedOrder): number {
  switch (o.status) {
    case "received": return o.paid ? 2 : 1;
    case "preparing": return 2;
    case "ready": return o.fulfilment === "delivery" ? 2 : 3;
    case "out_for_delivery": return 3;
    case "completed": return 4;
    default: return 0;
  }
}

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export default function OrderStatus() {
  const { token = "" } = useParams();
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined); // undefined = loading
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(token));
      setProblem(null);
    } catch (e) {
      setProblem((e as Error).message);
    }
  }, [token]);

  // First load, then every 15 seconds while the page is on screen
  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
  }, [load]);

  if (order === undefined && !problem)
    return <div className="page-x py-24 text-center text-muted" aria-busy="true">Loading your order…</div>;

  if (order === null || (order === undefined && problem))
    return (
      <div className="page-x flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-[24px] font-extrabold">{order === null ? "We can't find that order" : "We couldn't load your order"}</h1>
        <p className="max-w-sm text-muted">
          {order === null
            ? "The tracking link may be incomplete. Find your order on the Track order page with your code and phone number, or WhatsApp us on 0805 892 3302."
            : "Check your internet connection and try again."}
        </p>
        {order === undefined && <button onClick={load} className="btn-primary">Try again</button>}
        <Link to="/track" className="btn-primary">Track order</Link>
        <Link to="/menu" className="font-semibold text-emerald-dark underline">Back to the menu</Link>
      </div>
    );

  const o = order!;
  const cancelled = o.status === "cancelled";
  const current = rank(o);
  const due = payNow(o);
  const proofText = `Hello JVee Crunch Kitchen, I have paid ${naira(due)} for order ${o.code} (${o.customer_name}). Here is my transfer receipt:`;
  const bank = o.location.bank_details;
  const bankNumber = bank?.match(/\d{10}/)?.[0] ?? null;

  async function copyBank() {
    if (!bankNumber) return;
    try {
      await navigator.clipboard.writeText(bankNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the number is still visible to copy by hand */ }
  }

  return (
    <div className="pb-16">
      <section className="bg-emerald text-white">
        <div className="page-x flex flex-col items-start gap-2 py-7 sm:py-10">
          <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill={cancelled ? "#FCE4E2" : "#A6E22E"} />
            {cancelled
              ? <path d="M8 8l8 8M16 8l-8 8" stroke="#C2362B" strokeWidth="2.4" strokeLinecap="round" />
              : <path d="M7 12.5l3 3 7-7" stroke="#053B2A" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-[-1px] sm:text-[36px]">{cancelled ? "Order cancelled" : o.status === "completed" ? "Order completed" : "Order placed"}</h1>
          <p className="text-sm text-mint">Thank you, {o.customer_name}. Your order code is</p>
          <div className="rounded-xl bg-deep px-3.5 py-1.5 text-[30px] font-extrabold tracking-[2px]">{o.code}</div>
          <p className="text-xs text-mint">Placed {dateTime(o.created_at)} · {o.location.name}</p>
          {!cancelled && !o.paid && o.status === "received" && (
            <a href="#pay-h" className="mt-2 rounded-xl bg-zest px-4 py-2.5 text-sm font-bold text-deep">Next step: pay {naira(due)} by transfer. See the account details ↓</a>
          )}
        </div>
      </section>

      <div className="page-x mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-5">
          {cancelled ? (
            <section className="rounded-2xl bg-[#FCE4E2] p-4 text-[#7A1F17]">
              <p className="font-bold">The kitchen cancelled this order.</p>
              {o.cancel_reason && <p className="mt-1 text-sm">Reason: {o.cancel_reason}</p>}
              <p className="mt-1 text-sm">Questions? Call or WhatsApp {o.location.phone}.</p>
            </section>
          ) : (
            <section aria-live="polite">
              <h2 className="label-caps mb-3">Status · updates by itself</h2>
              <ol className="grid grid-cols-[28px_1fr] gap-x-3">
                {steps(o).map((s, i) => {
                  const done = i < current || o.status === "completed";
                  const now = i === current && o.status !== "completed";
                  const last = i === 4;
                  return (
                    <li key={s.label} className="contents">
                      <div className="flex flex-col items-center">
                        {done ? (
                          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald">
                            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4 4 10-10" stroke="#FFFFFF" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        ) : now ? (
                          <span className="h-[22px] w-[22px] rounded-full border-4 border-mint bg-zest outline-2 outline-emerald" />
                        ) : (
                          <span className="h-[22px] w-[22px] rounded-full border-2 border-line" />
                        )}
                        {!last && <span className={`min-h-6 w-0.5 flex-1 ${done ? "bg-emerald" : "bg-line"}`} />}
                      </div>
                      <div className="pb-4">
                        <div className={`text-[15px] ${done || now ? "font-bold" : "font-semibold text-muted"}`}>
                          {s.label}{now && <span className="sr-only"> (current step)</span>}
                        </div>
                        {(now || (done && i === 0)) && (
                          <div className="text-xs text-muted">{i === 0 && done ? time(o.created_at) : s.hint}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {problem && <p className="text-xs text-muted">Couldn't refresh just now. Retrying automatically.</p>}
            </section>
          )}

          {o.status === "completed" && <RateOrder token={token} firstName={o.customer_name.split(" ")[0]} />}

          {o.needed_for && (
            <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">Needed for <strong>{dateTime(o.needed_for)}</strong></p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <section className="flex flex-col gap-1.5 rounded-2xl bg-surface p-4 text-sm tabular-nums">
            {o.items.map((it) => (
              <div key={it.name} className="flex justify-between gap-3">
                <span>{it.quantity} × {it.name}</span><span>{naira(it.unit_price * it.quantity)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-line pt-2 text-muted">
              <span>{o.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span>
              <span>{o.delivery_fee ? naira(o.delivery_fee) : o.fulfilment === "delivery" ? "Paid to rider" : "Free"}</span>
            </div>
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{naira(o.total)}</span></div>
            <p className="mt-1 text-[13px] text-muted">
              {o.fulfilment === "delivery"
                ? `To ${o.address}${o.landmark ? `, ${o.landmark}` : ""}, ${o.location.name}`
                : `Pickup at ${o.location.address}`}
            </p>
          </section>

          {!cancelled && !o.paid && (
            <section aria-labelledby="pay-h" className="flex flex-col gap-2.5 rounded-2xl border-2 border-emerald bg-surface p-4">
              <h2 id="pay-h" className="text-[17px] font-extrabold">Pay {naira(due)} to confirm your order</h2>
              <p className="text-[13px] leading-relaxed text-muted">
                Transfer to the account below and use <strong className="text-deep">{o.code}</strong> as the reference. We start preparing as soon as your payment is confirmed.
              </p>
              {bank ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-mint-light px-3 py-2.5">
                  <div className="min-w-0 text-[13px] leading-snug">
                    {bankNumber && <div className="select-all text-lg font-bold tracking-[1px]">{bankNumber}</div>}
                    <div className="text-muted">{bank.replace(bankNumber ?? "", "").replace(/\s*·\s*·\s*/, " · ").replace(/^\s*·\s*|\s*·\s*$/g, "")}</div>
                  </div>
                  {bankNumber && (
                    <button type="button" onClick={copyBank} className="h-9 flex-none rounded-[10px] border-[1.5px] border-deep bg-surface px-3 text-[13px] font-semibold">
                      {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-amber-soft px-3 py-2.5 text-[13px] text-amber-ink">Call or WhatsApp {o.location.phone} for the account details.</p>
              )}
              {o.fulfilment === "delivery" && (
                <p className="text-[13px] text-muted">{o.delivery_fee > 0 ? `The ${naira(o.delivery_fee)} delivery fee is paid on arrival.` : "The delivery fee is set by the rider and paid to the rider when your order arrives."}</p>
              )}
              <a href={whatsappLink(proofText)} target="_blank" rel="noreferrer" className="btn-primary h-12 rounded-xl text-[15px]">
                <ChatIcon /> I've paid: send the receipt
              </a>
            </section>
          )}
          {!cancelled && o.paid && (
            <section className="flex flex-col gap-1 rounded-2xl bg-mint p-4">
              <h2 className="text-[15px] font-bold">Payment received, thank you</h2>
              {o.fulfilment === "delivery" && o.status !== "completed" && (
                <p className="text-[13px] text-muted">The rider will tell you the delivery fee. Please pay the rider when your order arrives.</p>
              )}
            </section>
          )}

          <a href={whatsappLink(`Hello JVee Crunch Kitchen, this is about my order ${o.code}.`)} target="_blank" rel="noreferrer"
            className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-deep text-[15px] font-bold text-white hover:bg-[#0a4a35]">
            <span className="text-zest"><ChatIcon size={20} /></span> Message us about {o.code}
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(`My JVee Crunch Kitchen order ${o.code}. Track it here: ${trackingUrl(token)}`)}`} target="_blank" rel="noreferrer"
            className="btn-secondary h-12 rounded-2xl text-[15px]">
            <ChatIcon /> Save this link to WhatsApp
          </a>
          <p className="text-center text-xs leading-relaxed text-muted">
            Send it to yourself ("Message yourself") or to whoever is collecting. You can also find this order any time on <Link to="/track" className="font-semibold text-emerald-dark underline">Track order</Link> with code {o.code} and your phone number.
          </p>
        </div>
      </div>
    </div>
  );
}
