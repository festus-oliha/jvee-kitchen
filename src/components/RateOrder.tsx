import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchReviewTargets, submitReview, type ReviewTarget } from "../lib/reviews";
import { CATEGORY_TILE, CategoryArt } from "./Icons";
import { StarPicker, Stars } from "./Stars";

/** "How was it?" on a completed order: one review per product, shown on the product page. */
export default function RateOrder({ token, firstName }: { token: string; firstName: string }) {
  const [targets, setTargets] = useState<ReviewTarget[] | null>(null);
  useEffect(() => { fetchReviewTargets(token).then(setTargets); }, [token]);
  if (!targets || targets.length === 0) return null;
  const reload = () => fetchReviewTargets(token).then(setTargets);
  return (
    <section aria-labelledby="rate-h" className="flex flex-col gap-3 rounded-2xl border-2 border-zest bg-surface p-4">
      <div>
        <h2 id="rate-h" className="text-[18px] font-extrabold">How was it, {firstName}?</h2>
        <p className="text-[13px] text-muted">Your review appears on the menu with "Verified order", so other customers know what to try.</p>
      </div>
      {targets.map((t) => <RateItem key={t.product_id} target={t} token={token} firstName={firstName} onSaved={reload} />)}
    </section>
  );
}

function RateItem({ target: t, token, firstName, onSaved }: { target: ReviewTarget; token: string; firstName: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(!t.review);
  const [rating, setRating] = useState(t.review?.rating ?? 0);
  const [comment, setComment] = useState(t.review?.comment ?? "");
  const [name, setName] = useState(t.review?.name ?? firstName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!rating) return setError("Tap the stars to rate it.");
    setBusy(true); setError(null);
    const e = await submitReview(token, t.product_id, rating, comment, name);
    setBusy(false);
    if (e) return setError(e);
    setEditing(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl ${CATEGORY_TILE[t.category_id] ?? "bg-mint"}`}>
          {t.photo_url ? <img src={t.photo_url} alt="" className="h-full w-full object-cover" /> : <CategoryArt category={t.category_id} size={34} />}
        </div>
        <p className="flex-1 font-bold">{t.name}</p>
      </div>
      {!editing && t.review ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Stars value={t.review.rating} />
          <span className="font-semibold text-emerald-dark">{t.review.hidden ? "Thanks for your review" : "Thanks! Your review is on the menu."}</span>
          {!t.review.hidden && <Link to={`/menu/${t.slug}#reviews`} className="text-muted underline">See it</Link>}
          <button type="button" onClick={() => setEditing(true)} className="text-muted underline">Edit</button>
        </div>
      ) : (
        <>
          <StarPicker value={rating} onChange={setRating} name={t.name} />
          <textarea aria-label={`Your review of ${t.name}`} rows={2} maxLength={600} placeholder="What did you like? (optional)" value={comment} onChange={(e) => setComment(e.target.value)}
            className="rounded-xl border-[1.5px] border-line bg-page px-3 py-2 text-[15px] outline-none focus:border-emerald" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">Show my name as
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-10 w-36 rounded-lg border-[1.5px] border-line bg-page px-2.5 text-sm text-deep outline-none focus:border-emerald" />
            </label>
            <button type="button" onClick={save} disabled={busy} className="btn-primary ml-auto h-10 rounded-xl px-4 text-sm">{busy ? "Sending…" : "Post review"}</button>
          </div>
          {error && <p role="alert" className="rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17]">{error}</p>}
        </>
      )}
    </div>
  );
}
