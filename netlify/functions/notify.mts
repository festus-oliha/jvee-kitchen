// JVee Crunch Kitchen · email alert for new orders and basket enquiries
// Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
//
// The website calls POST /.netlify/functions/notify right after an order or
// enquiry is saved. This function reads the record with the service key, sends
// one email through Resend, and stamps emailed_at so it is never sent twice.
//
// Netlify environment variables (Site configuration > Environment variables):
//   SUPABASE_URL               same as VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  Supabase > Project Settings > API > service_role (secret)
//   RESEND_API_KEY             resend.com > API Keys
//   ORDER_EMAIL_TO             where alerts go, e.g. the owner's email (comma-separate several)
//   ORDER_EMAIL_FROM           optional; defaults to "JVee orders <onboarding@resend.dev>"
//   SITE_URL                   optional; defaults to the Netlify site address

const env = (k: string) => (process.env[k] ?? "").trim();

const naira = (n: number) => "₦" + new Intl.NumberFormat("en-NG").format(n);
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
      authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`database ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Marks the row as emailed, only if nobody has done so yet. Returns the row, or null if already sent. */
async function claim(table: string, filter: string) {
  const rows = await db(`${table}?${filter}&emailed_at=is.null&created_at=gte.${encodeURIComponent(new Date(Date.now() - 6 * 3600_000).toISOString())}`, {
    method: "PATCH",
    body: JSON.stringify({ emailed_at: new Date().toISOString() }),
  });
  return rows[0] ?? null;
}

async function send(subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env("RESEND_API_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env("ORDER_EMAIL_FROM") || "JVee orders <onboarding@resend.dev>",
      to: env("ORDER_EMAIL_TO").split(",").map((s) => s.trim()).filter(Boolean),
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

/** If the email fails, clear emailed_at again so a later call can retry. */
async function sendOrRelease(table: string, id: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    await db(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ emailed_at: null }) }).catch(() => {});
    throw err;
  }
}

const shell = (title: string, body: string, button: { href: string; label: string }) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#EEF2EA;padding:24px;color:#053B2A">
  <div style="max-width:520px;margin:0 auto;background:#F8FAF5;border-radius:16px;overflow:hidden;border:1px solid #D6E2D3">
    <div style="background:#053B2A;color:#fff;padding:18px 22px;font-size:18px;font-weight:bold">${title}</div>
    <div style="padding:20px 22px;font-size:15px;line-height:1.5">${body}
      <p style="margin:22px 0 4px"><a href="${button.href}" style="background:#0B8F5A;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:bold;display:inline-block">${button.label}</a></p>
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#4D7563">JVee Crunch Kitchen · alerts sent by the website (JVeesoft-IT)</p>
</div>`;

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "ORDER_EMAIL_TO"].filter((k) => !env(k));
  if (missing.length) return json(200, { sent: false, reason: `not set up: ${missing.join(", ")}` });

  let body: { kind?: string; token?: string; id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad request" }); }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const site = (env("SITE_URL") || env("URL") || "").replace(/\/$/, "");

  try {
    if (body.kind === "order" && uuid.test(body.token ?? "")) {
      const claimed = await claim("orders", `tracking_token=eq.${body.token}`);
      if (!claimed) return json(200, { sent: false, reason: "already sent" });
      const [o] = await db(`orders?id=eq.${claimed.id}&select=*,order_items(item_name,unit_price,quantity),locations(name)`, { method: "GET" });
      const items = o.order_items as { item_name: string; unit_price: number; quantity: number }[];
      const payNow = o.fulfilment === "delivery" ? o.subtotal : o.total;
      const rows = items.map((i) => `<tr><td style="padding:3px 0">${i.quantity} × ${esc(i.item_name)}</td><td style="text-align:right">${naira(i.unit_price * i.quantity)}</td></tr>`).join("");
      const html = shell(`New order ${esc(o.code)} · ${esc(o.locations.name)}`, `
        <p style="margin:0 0 10px"><b>${o.fulfilment === "delivery" ? "Delivery" : "Pickup"}</b> · placed ${when(o.created_at)}${o.needed_for ? ` · <b>needed ${when(o.needed_for)}</b>` : ""}</p>
        <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
          ${o.delivery_fee ? `<tr><td style="color:#4D7563">Delivery (paid on arrival)</td><td style="text-align:right;color:#4D7563">${naira(o.delivery_fee)}</td></tr>` : ""}
          <tr><td style="padding-top:6px;border-top:1px solid #D6E2D3"><b>Total</b></td><td style="text-align:right;padding-top:6px;border-top:1px solid #D6E2D3"><b>${naira(o.total)}</b></td></tr>
        </table>
        <p style="background:#FFF1D6;color:#5C3800;padding:10px 12px;border-radius:10px">Wait for a transfer of <b>${naira(payNow)}</b> with reference <b>${esc(o.code)}</b>, then mark it paid on the board.</p>
        <p style="margin:0"><b>${esc(o.customer_name)}</b> · <a href="tel:${esc(o.phone.replace(/\s/g, ""))}">${esc(o.phone)}</a></p>
        ${o.address ? `<p style="margin:4px 0 0;color:#4D7563">${esc(o.address)}${o.landmark ? ` · near ${esc(o.landmark)}` : ""}</p>` : ""}
        ${o.note ? `<p style="margin:8px 0 0"><b>Note:</b> ${esc(o.note)}</p>` : ""}`,
        { href: `${site}/admin`, label: "Open the orders board" });
      const text = `New order ${o.code} (${o.locations.name}, ${o.fulfilment})\n${items.map((i) => `${i.quantity} x ${i.item_name}`).join("\n")}\nTotal ${naira(o.total)}. Pay now: ${naira(payNow)}\n${o.customer_name} ${o.phone}\n${site}/admin`;
      await sendOrRelease("orders", o.id, () => send(`New order ${o.code} · ${naira(o.total)} · ${o.locations.name}`, html, text));
      return json(200, { sent: true });
    }

    if (body.kind === "enquiry" && uuid.test(body.id ?? "")) {
      const claimed = await claim("basket_enquiries", `id=eq.${body.id}`);
      if (!claimed) return json(200, { sent: false, reason: "already sent" });
      const [e] = await db(`basket_enquiries?id=eq.${claimed.id}&select=*,locations(name)`, { method: "GET" });
      const html = shell(`Basket enquiry · ${esc(e.occasion)}`, `
        <p style="margin:0 0 8px"><b>${esc(e.name)}</b> · <a href="tel:${esc(e.phone.replace(/\s/g, ""))}">${esc(e.phone)}</a> · ${esc(e.locations.name)}</p>
        <p style="margin:0">Budget: <b>${e.budget ? naira(e.budget) : "not given"}</b> · Needed: <b>${e.date_needed ?? "not given"}</b></p>
        ${e.details ? `<p style="margin:10px 0 0;white-space:pre-wrap">${esc(e.details)}</p>` : ""}`,
        { href: `${site}/admin/enquiries`, label: "Open enquiries" });
      await sendOrRelease("basket_enquiries", e.id, () => send(`Basket enquiry: ${e.occasion} · ${e.name}`, html, `Basket enquiry from ${e.name} ${e.phone} (${e.locations.name})\nOccasion: ${e.occasion}\nBudget: ${e.budget ?? "-"}\nNeeded: ${e.date_needed ?? "-"}\n${e.details ?? ""}`));
      return json(200, { sent: true });
    }

    return json(400, { error: "bad request" });
  } catch (err) {
    console.error("notify failed", err);
    return json(500, { sent: false, error: "could not send" });
  }
};
