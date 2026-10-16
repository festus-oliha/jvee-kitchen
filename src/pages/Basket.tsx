import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useMenu } from "../lib/menu";
import { submitEnquiry, whatsappLink } from "../lib/orders";
import { CategoryArt, ChatIcon, CheckCircle } from "../components/Icons";

/** Custom occasion basket enquiry (design screen 8). */
const OCCASIONS = ["Birthday", "Wedding", "Thank you", "Anniversary", "Corporate gift", "Other"];
const DETAILS_KEY = "jvee.details";

const field = "h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] outline-none focus:border-emerald";
const label = "text-[11px] font-semibold uppercase tracking-[0.8px] text-muted";

export default function Basket() {
  const { menu, location, source } = useMenu();
  const saved = (() => { try { return JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "{}"); } catch { return {}; } })();
  const [occasion, setOccasion] = useState("");
  const [other, setOther] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");
  const [locationId, setLocationId] = useState(location?.id ?? "");
  const [name, setName] = useState<string>(saved.name ?? "");
  const [phone, setPhone] = useState<string>(saved.phone ?? "");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = "Custom baskets · JVee Crunch Kitchen"; return () => { document.title = "JVee Crunch Kitchen"; }; }, []);
  useEffect(() => { if (!locationId && location) setLocationId(location.id); }, [location, locationId]);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  const occasionText = occasion === "Other" ? other.trim() : occasion;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!occasionText) return setError("Choose the occasion.");
    if (name.trim().length < 2) return setError("Enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter a phone number we can call, for example 0803 123 4567.");
    setBusy(true); setError(null);
    const r = await submitEnquiry({ location_id: locationId, occasion: occasionText, budget: budget.replace(/[,\s₦]/g, ""), date_needed: date, name: name.trim(), phone: phone.trim(), details: details.trim() });
    setBusy(false);
    if (r.ok) {
      setDone(true);
      try { localStorage.setItem(DETAILS_KEY, JSON.stringify({ ...saved, name: name.trim(), phone: phone.trim() })); } catch { /* ignore */ }
      window.scrollTo({ top: 0 });
    } else {
      setError(r.kind === "invalid" ? r.message : "We couldn't send that. Check your internet and try again, or send it on WhatsApp.");
    }
  }

  const whatsappText = `Hello JVee Crunch Kitchen, I'd like a custom basket.\nOccasion: ${occasionText || "-"}\nBudget: ${budget || "-"}\nDate needed: ${date || "-"}\n${details}`;

  if (done) {
    return (
      <div className="page-x flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <span className="text-emerald"><CheckCircle size={56} /></span>
        <h1 className="text-[28px] font-extrabold tracking-[-0.5px]">Thank you, {name.split(" ")[0]}</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          We have your {occasionText.toLowerCase()} basket request. We'll call or WhatsApp you on <strong className="text-deep">{phone}</strong> with ideas and a price, usually the same day (Monday to Saturday, 8am to 6pm).
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/menu" className="btn-primary">Browse the menu</Link>
          <a href={whatsappLink(whatsappText)} target="_blank" rel="noreferrer" className="btn-secondary"><ChatIcon /> Chat on WhatsApp</a>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <section className="bg-deep text-white">
        <div className="page-x flex items-center gap-5 py-8 sm:py-12">
          <div className="min-w-0 flex-1">
            <p className="label-caps !text-zest">Custom baskets</p>
            <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-1px] sm:text-[42px]">A basket built around your budget</h1>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-[#BDEBD3]">Birthdays, weddings and thank-yous. Tell us the occasion and budget, and we'll put together chin chin, cakes, small chops and drinks, nicely packaged.</p>
          </div>
          <div className="hidden h-36 w-36 flex-none items-center justify-center rounded-[28px] bg-mint sm:flex"><CategoryArt category="gift-packages" size={96} /></div>
        </div>
      </section>

      <form onSubmit={submit} noValidate className="page-x mt-6 grid max-w-3xl gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className={`${label} mb-2`}>Occasion</legend>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" aria-pressed={occasion === o} onClick={() => setOccasion(o)}
                className={`h-11 rounded-full border-[1.5px] px-4 text-sm font-semibold ${occasion === o ? "border-deep bg-deep text-white" : "border-line bg-surface hover:border-deep"}`}>{o}</button>
            ))}
          </div>
          {occasion === "Other" && <input aria-label="Which occasion?" placeholder="Which occasion?" value={other} onChange={(e) => setOther(e.target.value)} maxLength={80} className={field} />}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5"><span className={label}>Budget (₦)</span>
            <input inputMode="numeric" placeholder="e.g. 30000" value={budget} onChange={(e) => setBudget(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5"><span className={label}>Date needed</span>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5"><span className={label}>Location</span>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={field}>
              {menu.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className={label}>Your name</span>
            <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={field} />
          </label>
          <label className="flex flex-col gap-1.5"><span className={label}>Phone or WhatsApp</span>
            <input type="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5"><span className={label}>Anything else (optional)</span>
          <textarea rows={4} maxLength={1000} placeholder="How many people, favourite items, colours, a message on the card…" value={details} onChange={(e) => setDetails(e.target.value)}
            className="rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-3 text-[15px] outline-none focus:border-emerald" />
        </label>

        {error && <p role="alert" className="rounded-xl bg-[#FCE4E2] px-3.5 py-2.5 text-sm font-semibold text-[#7A1F17]">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy || source === "demo"} className="btn-primary h-14 flex-1 rounded-2xl text-base">{busy ? "Sending…" : "Send my request"}</button>
          <a href={whatsappLink(whatsappText)} target="_blank" rel="noreferrer" className="btn-secondary h-14 flex-1 rounded-2xl"><ChatIcon /> Or send on WhatsApp</a>
        </div>
        <p className="text-center text-xs text-muted">No payment now. We'll agree the basket and price with you first.</p>
      </form>
    </div>
  );
}
