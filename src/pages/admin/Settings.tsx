import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { useMenu } from "../../lib/menu";
import { fetchCatalogue, fetchStaff, linkStaff, removeStaff, updateLocation, type StaffRow } from "../../lib/admin";
import type { DayKey, Location } from "../../lib/types";

/** Location settings and staff (design screen 12). Founder only. */
export default function Settings() {
  const { retry: refreshPublicMenu } = useMenu();
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLocations((await fetchCatalogue()).locations); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); document.title = "Settings · JVee admin"; }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const saved = async (m: string) => { setToast(m); await load(); refreshPublicMenu(); };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Each kitchen has its own switch, fees, hours and bank details.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#FCE4E2] px-4 py-3 font-semibold text-[#7A1F17]">{error} <button type="button" className="underline" onClick={load}>Try again</button></p>}
      {!locations && !error && <p className="py-10 text-center text-muted">Loading settings…</p>}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {locations?.map((l) => <LocationCard key={`${l.id}-${JSON.stringify(l)}`} loc={l} onSaved={saved} />)}
      </div>
      {locations && <StaffSection locations={locations} onToast={setToast} />}
      {toast && <div role="status" className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-sm rounded-2xl bg-deep px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}

const field = "h-11 rounded-lg border-[1.5px] border-line bg-surface px-3 text-[15px] outline-none focus:border-emerald";
const DAYS: { key: DayKey; name: string }[] = [
  { key: "mon", name: "Monday" }, { key: "tue", name: "Tuesday" }, { key: "wed", name: "Wednesday" }, { key: "thu", name: "Thursday" },
  { key: "fri", name: "Friday" }, { key: "sat", name: "Saturday" }, { key: "sun", name: "Sunday" },
];

function LocationCard({ loc, onSaved }: { loc: Location; onSaved: (m: string) => Promise<void> }) {
  const [phone, setPhone] = useState(loc.phone);
  const [fee, setFee] = useState(String(loc.delivery_fee));
  const [cutoff, setCutoff] = useState(loc.same_day_cutoff.slice(0, 5));
  const [bank, setBank] = useState(loc.bank_details ?? "");
  const [hours, setHours] = useState(loc.opening_hours);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>, message: string) {
    setBusy(true); setError(null);
    try { await fn(); await onSaved(message); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const deliveryFee = Number(fee.replace(/[,\s₦]/g, ""));
    if (!Number.isInteger(deliveryFee) || deliveryFee < 0) return setError("Enter the delivery fee in whole naira, for example 1500.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter a phone number customers can call.");
    for (const d of DAYS) {
      const h = hours[d.key];
      if (h && h[0] >= h[1]) return setError(`${d.name}: closing time must be after opening time.`);
    }
    run(() => updateLocation(loc.id, { phone: phone.trim(), delivery_fee: deliveryFee, same_day_cutoff: cutoff, bank_details: bank.trim() || null, opening_hours: hours }), `${loc.name} settings saved`);
  }

  return (
    <section aria-label={loc.name} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
      <div>
        <h2 className="text-xl font-extrabold">{loc.name}</h2>
        <p className="text-sm text-muted">{loc.address}</p>
      </div>

      <div className={`flex items-center gap-3 rounded-2xl p-4 ${loc.taking_orders ? "bg-mint" : "bg-[#FCE4E2]"}`}>
        <div className="flex-1">
          <p className="font-bold">{loc.taking_orders ? "Taking orders" : "Not taking orders"}</p>
          <p className="text-sm text-muted">{loc.taking_orders ? "Customers can order for this location." : "Customers see a 'closed for orders' notice and can't check out."}</p>
        </div>
        <button type="button" role="switch" aria-checked={loc.taking_orders} aria-label={`Taking orders at ${loc.name}`} disabled={busy}
          onClick={() => run(() => updateLocation(loc.id, { taking_orders: !loc.taking_orders }), loc.taking_orders ? `${loc.name} paused: no new orders` : `${loc.name} is taking orders again`)}
          className={`relative h-8 w-14 flex-none rounded-full transition-colors ${loc.taking_orders ? "bg-emerald" : "bg-[#C8D3C9]"}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${loc.taking_orders ? "left-7" : "left-1"}`} />
        </button>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Delivery fee (₦)
            <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Same-day cut-off
            <input type="time" value={cutoff} onChange={(e) => setCutoff(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Phone
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Bank details shown to customers
          <textarea value={bank} onChange={(e) => setBank(e.target.value)} rows={2} maxLength={200} placeholder="Account name · number · bank"
            className="rounded-lg border-[1.5px] border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-emerald" />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-semibold">Opening hours</legend>
          {DAYS.map((d) => {
            const h = hours[d.key];
            return (
              <div key={d.key} className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex w-32 items-center gap-2 font-semibold">
                  <input type="checkbox" checked={!!h} className="h-5 w-5 accent-emerald"
                    onChange={(e) => setHours({ ...hours, [d.key]: e.target.checked ? ["08:00", "18:00"] : null })} />
                  {d.name}
                </label>
                {h ? (
                  <>
                    <input type="time" aria-label={`${d.name} opens`} value={h[0]} onChange={(e) => setHours({ ...hours, [d.key]: [e.target.value, h[1]] })} className={`${field} h-10 w-32`} />
                    <span className="text-muted">to</span>
                    <input type="time" aria-label={`${d.name} closes`} value={h[1]} onChange={(e) => setHours({ ...hours, [d.key]: [h[0], e.target.value] })} className={`${field} h-10 w-32`} />
                  </>
                ) : <span className="text-muted">Closed</span>}
              </div>
            );
          })}
        </fieldset>

        {error && <p role="alert" className="rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17]">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-fit">{busy ? "Saving…" : `Save ${loc.name}`}</button>
      </form>
    </section>
  );
}

function StaffSection({ locations, onToast }: { locations: Location[]; onToast: (m: string) => void }) {
  const { staff: me } = useAuth();
  const [list, setList] = useState<StaffRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"staff" | "founder">("staff");
  const [where, setWhere] = useState<string>(locations[0]?.id ?? "both");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setList(await fetchStaff()); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter the email they sign in with.");
    if (name.trim().length < 2) return setError("Enter their name.");
    setBusy(true); setError(null);
    try {
      await linkStaff(email, name, role, where === "both" ? null : where);
      setEmail(""); setName("");
      onToast(`${name.trim()} can now sign in`);
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(row: StaffRow) {
    setBusy(true); setError(null);
    try { await removeStaff(row.user_id); setRemoving(null); onToast(`${row.name} no longer has access`); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  const where2 = (id: string | null) => (id ? locations.find((l) => l.id === id)?.name ?? id : "Both locations");

  return (
    <section aria-labelledby="staff-h" className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
      <div>
        <h2 id="staff-h" className="text-xl font-extrabold">Staff</h2>
        <p className="text-sm leading-relaxed text-muted">
          Staff see and update orders for their location only. To add someone: first create their sign-in in Supabase (Authentication &gt; Users &gt; Add user, with "Auto confirm" ticked), then add their email here.
        </p>
      </div>

      {list === null ? <p className="text-muted">Loading staff…</p> : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          {list.map((s) => (
            <li key={s.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{s.name} {s.user_id === me?.user_id && <span className="text-sm font-normal text-muted">(you)</span>}</p>
                <p className="truncate text-sm text-muted">{s.email} · {s.role === "founder" ? "Founder" : `Staff · ${where2(s.location_id)}`}</p>
              </div>
              {s.user_id !== me?.user_id && (removing === s.user_id ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-[#7A1F17]">Remove access?</span>
                  <button type="button" disabled={busy} onClick={() => remove(s)} className="h-9 rounded-lg bg-alert px-3 font-bold text-white">Remove</button>
                  <button type="button" onClick={() => setRemoving(null)} className="h-9 rounded-lg border-[1.5px] border-line px-3 font-semibold">Keep</button>
                </span>
              ) : (
                <button type="button" onClick={() => setRemoving(s.user_id)} className="text-sm font-semibold text-alert underline">Remove</button>
              ))}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} noValidate className="grid gap-3 rounded-2xl bg-mint-light p-4 sm:grid-cols-2">
        <h3 className="font-bold sm:col-span-2">Add a person</h3>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Email they sign in with
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Role
          <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "founder")} className={field}>
            <option value="staff">Staff (orders only)</option>
            <option value="founder">Founder (everything)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Location
          <select value={role === "founder" ? "both" : where} disabled={role === "founder"} onChange={(e) => setWhere(e.target.value)} className={field}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="both">Both locations</option>
          </select>
        </label>
        {error && <p role="alert" className="rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17] sm:col-span-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary sm:col-span-2 sm:w-fit">{busy ? "Adding…" : "Give access"}</button>
      </form>
    </section>
  );
}
