import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useMenu } from "../../lib/menu";
import { naira } from "../../lib/money";
import {
  addCategory, addProduct, deleteProduct, fetchCatalogue, removeProductPhoto, saveOptions, setSoldOut, updateProduct, uploadProductPhoto,
  type AdminCatalogue, type AdminProduct, type OptionDraft,
} from "../../lib/admin";
import { CategoryArt } from "../../components/Icons";

/** Products and prices (design screen 11). Founder only. */
export default function Products() {
  const { retry: refreshPublicMenu } = useMenu();
  const [cat, setCat] = useState<AdminCatalogue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try { setCat(await fetchCatalogue()); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); document.title = "Products · JVee admin"; }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** After any save: reload here and refresh the public menu in this browser. */
  const saved = useCallback(async (message: string) => {
    setToast(message);
    await load();
    refreshPublicMenu();
  }, [load, refreshPublicMenu]);

  if (!cat) {
    return error
      ? <p role="alert" className="rounded-xl bg-[#FCE4E2] px-4 py-3 font-semibold text-[#7A1F17]">{error} <button type="button" className="underline" onClick={load}>Try again</button></p>
      : <p className="py-10 text-center text-muted">Loading products…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Products and prices</h1>
          <p className="mt-0.5 text-sm text-muted">Changes show on the website straight away. Prices are in naira.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="btn-primary">+ Add a product</button>
      </div>

      {adding && <AddProduct cat={cat} onClose={() => setAdding(false)} onSaved={(m) => { setAdding(false); saved(m); }} />}

      {cat.categories.map((c) => {
        const items = cat.products.filter((p) => p.category_id === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`} className="flex flex-col gap-3">
            <h2 id={`cat-${c.id}`} className="label-caps">{c.name}</h2>
            {items.map((p) => <ProductRow key={p.id} product={p} cat={cat} onSaved={saved} />)}
          </section>
        );
      })}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-sm rounded-2xl bg-deep px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">{toast}</div>
      )}
    </div>
  );
}

const field = "h-11 rounded-lg border-[1.5px] border-line bg-surface px-3 text-[15px] outline-none focus:border-emerald";

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${on ? "bg-emerald" : "bg-[#C8D3C9]"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function ProductRow({ product: p, cat, onSaved }: { product: AdminProduct; cat: AdminCatalogue; onSaved: (m: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const twoAxis = p.product_options.length > 0 && p.product_options.every((o) => o.size && o.type);

  async function run(fn: () => Promise<void>, message: string) {
    setBusy(true); setError(null);
    try { await fn(); await onSaved(message); return true; }
    catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  }

  const prices = p.product_options.map((o) => o.price);
  const priceText = prices.some((x) => x <= 0) ? "Price not set yet" : prices.length ? (Math.min(...prices) === Math.max(...prices) ? naira(prices[0]) : `${naira(Math.min(...prices))} – ${naira(Math.max(...prices))}`) : "No price";

  return (
    <article aria-label={p.name} className={`rounded-[18px] border bg-surface p-4 ${p.active ? "border-line" : "border-dashed border-[#B9C6BA] opacity-80"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl" style={{ background: "var(--color-mint-light)" }}>
          {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : <CategoryArt category={p.category_id} size={40} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-bold">{p.name} {!p.active && <span className="ml-1 rounded-full bg-[#E3EAE3] px-2 py-0.5 text-xs font-semibold text-muted">Hidden</span>}</h3>
          <p className="text-sm text-muted">{p.enquiry_only ? "Enquiry only: customers send the basket form, no fixed price" : <>{priceText} · {p.product_options.length} option{p.product_options.length === 1 ? "" : "s"}{p.notice_hours ? ` · order ${p.notice_hours} h ahead` : ""}</>}</p>
        </div>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="h-10 rounded-xl border-[1.5px] border-deep px-4 text-sm font-semibold">
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
        <label className="flex items-center gap-2.5 font-semibold">
          <Toggle on={p.active} disabled={busy} label={`Show ${p.name} on the menu`} onChange={(v) => {
            if (v && !p.enquiry_only && p.product_options.some((o) => o.price <= 0)) { setError(`Set the price for ${p.name} first: tap Edit, enter the price, Save, then switch it on.`); return; }
            run(() => updateProduct(p.id, { active: v }), v ? `${p.name} is back on the menu` : `${p.name} is hidden from the menu`);
          }} />
          On the menu
        </label>
        {cat.locations.map((l) => {
          const out = p.sold_out_at.includes(l.id);
          return (
            <label key={l.id} className="flex items-center gap-2.5 font-semibold">
              <Toggle on={!out} disabled={busy} label={`${p.name} in stock at ${l.name}`} onChange={(v) => run(() => setSoldOut(p.id, l.id, !v), v ? `${p.name} back in stock at ${l.name}` : `${p.name} marked sold out at ${l.name}`)} />
              {out ? <span className="text-alert">Sold out · {l.name}</span> : <span>In stock · {l.name}</span>}
            </label>
          );
        })}
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17]">{error}</p>}

      {editing && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-mint-light">
            {p.photo_url ? <img src={p.photo_url} alt={`Photo of ${p.name}`} className="h-full w-full object-cover" /> : <CategoryArt category={p.category_id} size={52} />}
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">Photo</span>
            <div className="flex flex-wrap gap-2">
              <label className={`inline-flex h-10 cursor-pointer items-center rounded-lg bg-deep px-3.5 font-semibold text-white ${busy ? "opacity-50" : ""}`}>
                {busy ? "Working…" : p.photo_url ? "Change photo" : "Add a photo"}
                <input type="file" accept="image/*" className="sr-only" disabled={busy}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run(() => uploadProductPhoto(p, f).then(() => {}), `Photo saved for ${p.name}`); }} />
              </label>
              {p.photo_url && <button type="button" disabled={busy} onClick={() => run(() => removeProductPhoto(p.id), `Photo removed from ${p.name}`)} className="h-10 rounded-lg border-[1.5px] border-line px-3.5 font-semibold">Remove</button>}
            </div>
            <span className="text-xs text-muted">A square, bright photo works best. It's resized automatically.</span>
          </div>
        </div>
      )}

      {editing && (
        <ProductEditor product={p} cat={cat} twoAxis={twoAxis} busy={busy}
          onSave={async (details, options) => {
            const ok = await run(async () => {
              await updateProduct(p.id, details);
              if (!p.enquiry_only) await saveOptions(p.id, p.product_options, options);
            }, `${details.name} saved`);
            if (ok) setEditing(false);
          }}
        />
      )}

      {editing && (
        <div className="mt-4 border-t border-line pt-3">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FCE4E2] p-3 text-sm">
              <span className="flex-1 font-semibold text-[#7A1F17]">Delete {p.name} for good? Past orders keep their item names. To take it off the menu for now, use "On the menu" instead.</span>
              <button type="button" disabled={busy} onClick={() => run(() => deleteProduct(p.id), `${p.name} deleted`)} className="h-10 rounded-lg bg-alert px-4 font-bold text-white">Delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-lg border-[1.5px] border-line bg-surface px-4 font-semibold">Keep</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-alert underline">Delete this product…</button>
          )}
        </div>
      )}
    </article>
  );
}

const NEW_CATEGORY = "__new__";

type Details = { name: string; description: string; category_id: string; notice_hours: number };

function ProductEditor({ product, cat, twoAxis, busy, onSave }: {
  product: AdminProduct | null; cat: AdminCatalogue; twoAxis: boolean; busy: boolean;
  onSave: (details: Details, options: OptionDraft[]) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category_id ?? cat.categories[0]?.id ?? "");
  // Categories can be added right here from the dropdown, without any code
  const [categories, setCategories] = useState(cat.categories);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  async function createCategory() {
    if (newCat.trim().length < 2) return setCatError("Type the category name.");
    setCatBusy(true); setCatError(null);
    try {
      const c = await addCategory(newCat, Math.max(0, ...categories.map((x) => x.sort_order)) + 1);
      setCategories((list) => [...list, c]);
      setCategory(c.id);
      setAddingCat(false); setNewCat("");
    } catch (e) { setCatError((e as Error).message); }
    finally { setCatBusy(false); }
  }
  const [notice, setNotice] = useState(String(product?.notice_hours ?? 0));
  const [rows, setRows] = useState<(OptionDraft & { key: string; priceText: string })[]>(() =>
    (product?.product_options.length ? product.product_options : [{ id: undefined, label: "", size: null, type: null, price: 0 }]).map((o, i) => ({
      id: o.id, label: o.label, size: o.size, type: o.type, price: o.price, key: o.id ?? `new-${i}`, priceText: o.price ? String(o.price) : "",
    })),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const enquiryOnly = !!product?.enquiry_only;

  const setRow = (key: string, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setProblem("Enter a product name.");
    if (!rows.length) return setProblem("Add at least one price.");
    const options: OptionDraft[] = [];
    for (const r of enquiryOnly ? [] : rows) {
      const price = Number(r.priceText.replace(/[,\s₦]/g, ""));
      const size = twoAxis ? (r.size ?? "").trim() || null : null;
      const type = twoAxis ? (r.type ?? "").trim() || null : null;
      const label = twoAxis ? [size, type].filter(Boolean).join(" · ") : r.label.trim();
      if (twoAxis && (!size || !type)) return setProblem("Each row needs a size and a type.");
      if (!label && rows.length > 1) return setProblem("Give each option a name, for example 1.5 L or Small.");
      if (!Number.isInteger(price) || price <= 0) return setProblem(`Enter a price in whole naira for ${label || "each option"}.`);
      options.push({ id: r.id, label: label || "Regular", size, type, price });
    }
    const hours = Number(notice);
    if (!Number.isInteger(hours) || hours < 0 || hours > 168) return setProblem("Notice must be between 0 and 168 hours.");
    setProblem(null);
    onSave({ name: name.trim(), description: description.trim(), category_id: category, notice_hours: hours }, options);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={field} />
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-semibold">
          <label htmlFor={`cat-${product?.id ?? "new"}`}>Category</label>
          <select id={`cat-${product?.id ?? "new"}`} value={category} className={field}
            onChange={(e) => { if (e.target.value === NEW_CATEGORY) { setAddingCat(true); } else { setCategory(e.target.value); setAddingCat(false); } }}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value={NEW_CATEGORY}>+ Add a new category…</option>
          </select>
          {addingCat && (
            <div className="flex flex-col gap-2 rounded-lg bg-mint-light p-2.5">
              <div className="flex gap-2">
                <input aria-label="New category name" autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={40} placeholder="e.g. Proteins, Pastries, Juices"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createCategory(); } }}
                  className={`${field} h-10 min-w-0 flex-1 font-normal`} />
                <button type="button" onClick={createCategory} disabled={catBusy} className="h-10 rounded-lg bg-deep px-3.5 text-white">{catBusy ? "Adding…" : "Add"}</button>
                <button type="button" onClick={() => { setAddingCat(false); setNewCat(""); setCatError(null); }} className="h-10 rounded-lg px-2 font-normal text-muted">Cancel</button>
              </div>
              {catError && <p role="alert" className="text-[13px] text-[#7A1F17]">{catError}</p>}
              <p className="text-xs font-normal text-muted">It shows on the menu and home page as soon as it has a product switched on.</p>
            </div>
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
          <span className="flex justify-between gap-2">Description <span className="font-normal text-muted">Shown on the menu and the product page · {description.length}/400</span></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} rows={3} placeholder="A little about it: what's inside, size, how many it serves, why people love it."
            className="rounded-lg border-[1.5px] border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-emerald" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Order ahead (hours, 0 = same day)
          <input inputMode="numeric" value={notice} onChange={(e) => setNotice(e.target.value)} className={field} />
        </label>
      </div>

      {enquiryOnly ? (
        <p className="rounded-lg bg-mint-light px-3 py-2 text-sm text-muted">This item has no fixed price. Customers fill in the custom basket form and you reply with a quote.</p>
      ) : (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Sizes and prices</legend>
        {rows.map((r) => (
          <div key={r.key} className="flex flex-wrap items-center gap-2">
            {twoAxis ? (
              <>
                <input aria-label="Size" placeholder="Size, e.g. 1.5 L" value={r.size ?? ""} onChange={(e) => setRow(r.key, { size: e.target.value })} className={`${field} w-28`} />
                <input aria-label="Type" placeholder="Type" value={r.type ?? ""} onChange={(e) => setRow(r.key, { type: e.target.value })} className={`${field} min-w-0 flex-1`} />
              </>
            ) : (
              <input aria-label="Option name" placeholder={rows.length > 1 ? "Option, e.g. Small" : "Option (optional)"} value={r.label} onChange={(e) => setRow(r.key, { label: e.target.value })} className={`${field} min-w-0 flex-1`} />
            )}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₦</span>
              <input aria-label={`Price for ${twoAxis ? [r.size, r.type].filter(Boolean).join(" ") : r.label || "this option"}`} inputMode="numeric" value={r.priceText}
                onChange={(e) => setRow(r.key, { priceText: e.target.value })} className={`${field} w-32 pl-7 text-right font-semibold`} />
            </div>
            <button type="button" aria-label="Remove this option" disabled={rows.length === 1} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}
              className="h-11 w-11 rounded-lg text-lg text-muted hover:bg-[#FCE4E2] hover:text-alert disabled:opacity-30">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((x) => [...x, { label: "", size: null, type: null, price: 0, priceText: "", key: `new-${Date.now()}` }])}
          className="w-fit text-sm font-semibold text-emerald-dark underline">+ Add another size or option</button>
      </fieldset>
      )}

      {problem && <p role="alert" className="rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17]">{problem}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full sm:w-fit">{busy ? "Saving…" : product ? "Save changes" : "Add product"}</button>
    </form>
  );
}

function AddProduct({ cat, onClose, onSaved }: { cat: AdminCatalogue; onClose: () => void; onSaved: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section aria-label="New product" className="rounded-[18px] border-2 border-emerald bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">New product</h2>
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-3 text-sm font-semibold text-muted">Cancel</button>
      </div>
      <p className="text-sm text-muted">It goes on the menu as soon as you add it. To add a photo, tap Edit on it after saving.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#FCE4E2] px-3 py-2 text-sm font-semibold text-[#7A1F17]">{error}</p>}
      <ProductEditor product={null} cat={cat} twoAxis={false} busy={busy}
        onSave={async (d, options) => {
          setBusy(true); setError(null);
          try {
            const last = Math.max(0, ...cat.products.filter((p) => p.category_id === d.category_id).map((p) => p.sort_order));
            await addProduct({ ...d, sort_order: last + 1 }, options);
            onSaved(`${d.name} added to the menu`);
          } catch (e) { setError((e as Error).message); }
          finally { setBusy(false); }
        }}
      />
    </section>
  );
}
