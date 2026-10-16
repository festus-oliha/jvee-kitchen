import { useCallback, useEffect, useState } from "react";
import { useMenu } from "../../lib/menu";
import { naira } from "../../lib/money";
import { fetchEnquiries, internationalPhone, setEnquiryHandled, type Enquiry } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

/** Custom basket enquiries from the /basket form. */
export default function Enquiries() {
  const { menu } = useMenu();
  const [list, setList] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<"open" | "handled">("open");

  const load = useCallback(async () => {
    try { setList(await fetchEnquiries()); setError(null); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    document.title = "Basket enquiries · JVee admin";
    load();
    const poll = window.setInterval(load, 60_000);
    const channel = supabase?.channel("enquiries").on("postgres_changes", { event: "*", schema: "public", table: "basket_enquiries" }, () => load()).subscribe();
    return () => { window.clearInterval(poll); if (channel) supabase?.removeChannel(channel); };
  }, [load]);

  const name = (id: string) => menu.locations.find((l) => l.id === id)?.name ?? id;
  const shown = (list ?? []).filter((e) => (show === "open" ? !e.handled : e.handled));
  const openCount = (list ?? []).filter((e) => !e.handled).length;
  const date = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(d + "T12:00:00"));
  const placed = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

  async function toggle(e: Enquiry) {
    try { await setEnquiryHandled(e.id, !e.handled); await load(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Basket enquiries</h1>
        <p className="mt-0.5 text-sm text-muted">Requests from the custom basket form. Call or WhatsApp the customer with ideas and a price, then mark it done.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#FCE4E2] px-4 py-3 text-sm font-semibold text-[#7A1F17]">{error}</p>}
      <div role="tablist" className="flex w-fit gap-1 rounded-2xl bg-mint p-1">
        {(["open", "handled"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={show === t} onClick={() => setShow(t)}
            className={`h-11 rounded-xl px-5 text-sm font-semibold ${show === t ? "bg-deep text-white" : "text-muted"}`}>
            {t === "open" ? `To reply (${openCount})` : "Done"}
          </button>
        ))}
      </div>
      {list === null && !error ? <p className="py-10 text-center text-muted">Loading…</p> : shown.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-lg font-bold">{show === "open" ? "No enquiries waiting" : "Nothing marked done yet"}</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((e) => (
            <article key={e.id} aria-label={`Enquiry from ${e.name}`} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-extrabold">{e.occasion}</p>
                  <p className="text-xs text-muted">{placed(e.created_at)} · {name(e.location_id)}</p>
                </div>
                {e.budget != null && <span className="rounded-full bg-amber-soft px-2.5 py-1 text-sm font-bold text-amber-ink">{naira(e.budget)}</span>}
              </header>
              {e.date_needed && <p className="rounded-xl bg-mint-light px-3 py-2 text-sm font-semibold">Needed {date(e.date_needed)}</p>}
              {e.details && <p className="whitespace-pre-wrap text-[15px]">{e.details}</p>}
              <div className="text-sm">
                <p className="font-bold">{e.name}</p>
                <a href={`tel:${e.phone.replace(/\s/g, "")}`} className="font-semibold text-emerald-dark underline">{e.phone}</a>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`https://wa.me/${internationalPhone(e.phone)}?text=${encodeURIComponent(`Hello ${e.name.split(" ")[0]}, this is JVee Crunch Kitchen about your ${e.occasion.toLowerCase()} basket. `)}`}
                  target="_blank" rel="noreferrer" className="btn-secondary h-11 flex-1 text-sm">WhatsApp</a>
                <button type="button" onClick={() => toggle(e)} className={`h-11 flex-1 rounded-btn text-sm font-bold ${e.handled ? "border-[1.5px] border-line" : "bg-emerald text-white"}`}>
                  {e.handled ? "Move back to reply" : "Mark done"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
