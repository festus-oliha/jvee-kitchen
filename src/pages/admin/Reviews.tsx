import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { deleteReview, fetchAllReviews, setReviewHidden, type AdminReview } from "../../lib/admin";
import { Stars } from "../../components/Stars";

/** Customer reviews: hide ones that aren't genuine, or delete them for good. Founder only. */
export default function Reviews() {
  const [list, setList] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<"visible" | "hidden">("visible");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setList(await fetchAllReviews()); setError(null); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { document.title = "Reviews · JVee admin"; load(); }, [load]);

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id); setError(null);
    try { await fn(); setConfirm(null); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  const shown = (list ?? []).filter((r) => (show === "visible" ? !r.hidden : r.hidden));
  const visible = (list ?? []).filter((r) => !r.hidden);
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
  const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
  const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 3 * 86400_000;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Customer reviews</h1>
        <p className="mt-0.5 text-sm text-muted">Only customers with a completed order can review what they ordered. Hide a review that isn't genuine (you can show it again), or delete it for good.</p>
      </div>
      {visible.length > 0 && (
        <p className="flex items-center gap-2 text-sm font-semibold"><Stars value={avg} /> {avg.toFixed(1)} average from {visible.length} visible review{visible.length > 1 ? "s" : ""}</p>
      )}
      {error && <p role="alert" className="rounded-xl bg-[#FCE4E2] px-4 py-3 text-sm font-semibold text-[#7A1F17]">{error}</p>}
      <div role="tablist" className="flex w-fit gap-1 rounded-2xl bg-mint p-1">
        {(["visible", "hidden"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={show === t} onClick={() => setShow(t)}
            className={`h-11 rounded-xl px-5 text-sm font-semibold ${show === t ? "bg-deep text-white" : "text-muted"}`}>
            {t === "visible" ? `On the website (${visible.length})` : `Hidden (${(list ?? []).length - visible.length})`}
          </button>
        ))}
      </div>
      {list === null && !error ? <p className="py-10 text-center text-muted">Loading…</p> : shown.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-lg font-bold">{show === "visible" ? "No reviews yet" : "No hidden reviews"}</p>
          {show === "visible" && <p className="mt-1 text-sm text-muted">After you mark an order completed, the customer can review it from their order page. The WhatsApp button on a completed order asks them for a review.</p>}
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <article key={r.id} aria-label={`Review by ${r.name}`} className={`flex flex-col gap-2.5 rounded-[20px] border bg-surface p-4 ${r.hidden ? "border-dashed border-[#B9C6BA]" : "border-line"}`}>
              <header className="flex items-start justify-between gap-2">
                <div>
                  {r.products ? <Link to={`/menu/${r.products.slug}`} className="font-extrabold hover:underline">{r.products.name}</Link> : <span className="font-extrabold">Removed product</span>}
                  <div className="mt-1"><Stars value={r.rating} /></div>
                </div>
                {isNew(r.created_at) && !r.hidden && <span className="rounded-full bg-zest px-2.5 py-1 text-xs font-bold text-deep">New</span>}
              </header>
              {r.comment ? <p className="whitespace-pre-line text-[15px]">{r.comment}</p> : <p className="text-sm italic text-muted">Stars only, no comment</p>}
              <p className="text-xs text-muted">
                Shown as <b className="text-deep">{r.name}</b> · {when(r.created_at)}
                {r.orders && <> · order {r.orders.code} ({r.orders.customer_name}, {r.orders.phone})</>}
              </p>
              {confirm === r.id ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FCE4E2] p-3 text-sm">
                  <span className="flex-1 font-semibold text-[#7A1F17]">Delete this review for good?</span>
                  <button type="button" disabled={busy === r.id} onClick={() => run(r.id, () => deleteReview(r.id))} className="h-9 rounded-lg bg-alert px-3 font-bold text-white">Delete</button>
                  <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-lg border-[1.5px] border-line bg-surface px-3 font-semibold">Keep</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" disabled={busy === r.id} onClick={() => run(r.id, () => setReviewHidden(r.id, !r.hidden))}
                    className={`h-11 flex-1 rounded-btn text-sm font-bold ${r.hidden ? "bg-emerald-dark text-white" : "border-[1.5px] border-deep bg-surface"}`}>
                    {r.hidden ? "Show on website" : "Hide from website"}
                  </button>
                  <button type="button" onClick={() => setConfirm(r.id)} className="h-11 rounded-btn px-3 text-sm font-semibold text-alert hover:bg-[#FCE4E2]">Delete…</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
