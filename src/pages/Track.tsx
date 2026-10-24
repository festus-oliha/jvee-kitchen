import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { findOrder, recentOrders } from "../lib/orders";

/** "Track my order": order code + phone number → the order's status page. */
const field = "h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] outline-none focus:border-emerald";
const label = "text-[11px] font-semibold uppercase tracking-[0.8px] text-muted";

export default function Track() {
  const navigate = useNavigate();
  const saved = (() => { try { return JSON.parse(localStorage.getItem("jvee.details") ?? "{}"); } catch { return {}; } })();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState<string>(saved.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recent = recentOrders();

  useEffect(() => { document.title = "Track your order · JVee Crunch Kitchen"; return () => { document.title = "JVee Crunch Kitchen"; }; }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (c.replace(/^jv-?/i, "").length !== 4) return setError("Enter your order code. It looks like JV-7K2P.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter the phone number you ordered with.");
    setBusy(true); setError(null);
    const r = await findOrder(c, phone);
    setBusy(false);
    if (r.ok) navigate(`/order/${r.token}`);
    else setError(r.message);
  }

  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

  return (
    <div className="page-x max-w-lg py-10 sm:py-14">
      <h1 className="text-[30px] font-extrabold tracking-[-1px]">Track your order</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">Enter the order code from your order page or our WhatsApp message, and the phone number you ordered with.</p>

      {recent.length > 0 && (
        <section aria-labelledby="recent-h" className="mt-6 rounded-2xl bg-surface p-4">
          <h2 id="recent-h" className="label-caps mb-2">Ordered on this phone</h2>
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((o) => (
              <li key={o.token}>
                <Link to={`/order/${o.token}`} className="flex items-center justify-between gap-3 py-2.5 font-semibold hover:text-emerald-dark">
                  <span className="tracking-[0.5px]">{o.code}</span>
                  <span className="text-sm font-normal text-muted">{when(o.at)} ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className={label}>Order code</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="JV-7K2P" autoCapitalize="characters" autoComplete="off" maxLength={8}
            className={`${field} text-lg font-bold tracking-[2px]`} />
        </label>
        <label className="flex flex-col gap-1.5"><span className={label}>Phone number</span>
          <input type="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#FCE4E2] px-3.5 py-2.5 text-sm font-semibold text-[#7A1F17]">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary h-14 rounded-2xl text-base">{busy ? "Finding your order…" : "Track order"}</button>
      </form>
    </div>
  );
}
