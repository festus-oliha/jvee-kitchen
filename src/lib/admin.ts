// Data used by the staff admin. Every write goes through Supabase with the
// signed-in person's session, so the database access rules decide what is allowed.
// Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
import { supabase } from "./supabase";
import type { Category, Location } from "./types";
import type { OrderStatus as OrderStatusName } from "./orders";

export type { OrderStatusName };

function db() {
  if (!supabase) throw new Error("The database is not connected. Add your Supabase settings to .env first.");
  return supabase;
}

/** Supabase errors come back as objects; turn them into a sentence staff can read. */
function fail(error: { message: string } | null): void {
  if (!error) return;
  if (/fetch/i.test(error.message)) throw new Error("Couldn't reach the server. Check your internet connection and try again.");
  if (/JWT|token/i.test(error.message)) throw new Error("Your sign-in has expired. Sign out and sign in again.");
  throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface AdminOrderItem { id: string; item_name: string; unit_price: number; quantity: number }

export interface AdminOrder {
  id: string;
  code: string;
  location_id: string;
  fulfilment: "delivery" | "pickup";
  status: OrderStatusName;
  customer_name: string;
  phone: string;
  address: string | null;
  landmark: string | null;
  note: string | null;
  needed_for: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  paid: boolean;
  payment_method: "cash" | "transfer" | null;
  cancel_reason: string | null;
  tracking_token: string;
  created_at: string;
  updated_at: string;
  order_items: AdminOrderItem[];
}

/** Midnight today in Nigeria, as an ISO timestamp. */
export function startOfTodayLagos(now = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return `${ymd}T00:00:00+01:00`;
}

/** Orders still open (any day) plus everything placed today. */
export async function fetchBoardOrders(): Promise<AdminOrder[]> {
  const today = startOfTodayLagos();
  const { data, error } = await db()
    .from("orders")
    .select("id, code, location_id, fulfilment, status, customer_name, phone, address, landmark, note, needed_for, subtotal, delivery_fee, total, paid, payment_method, cancel_reason, tracking_token, created_at, updated_at, order_items(id, item_name, unit_price, quantity)")
    .or(`status.in.(received,preparing,ready,out_for_delivery),created_at.gte.${today},updated_at.gte.${today}`)
    .order("created_at", { ascending: true })
    .limit(300);
  fail(error);
  return (data ?? []) as AdminOrder[];
}

export async function moveOrder(orderId: string, status: OrderStatusName, reason?: string): Promise<void> {
  const { error } = await db().rpc("next_status", { p_order_id: orderId, p_status: status, p_reason: reason ?? null });
  fail(error);
}

export async function setPaid(orderId: string, paid: boolean, method: "cash" | "transfer" | null): Promise<void> {
  const { error } = await db().rpc("set_paid", { p_order_id: orderId, p_paid: paid, p_method: method });
  fail(error);
}

/** "0803 123 4567" -> "2348031234567" for wa.me links. */
export function internationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

// ---------------------------------------------------------------------------
// Products (founder)
// ---------------------------------------------------------------------------

export interface AdminOption {
  id: string;
  product_id: string;
  label: string;
  size: string | null;
  type: string | null;
  price: number;
  active: boolean;
  sort_order: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  description: string;
  notice_hours: number;
  enquiry_only: boolean;
  active: boolean;
  sort_order: number;
  product_options: AdminOption[];
  sold_out_at: string[];
}

export interface AdminCatalogue {
  locations: Location[];
  categories: Category[];
  products: AdminProduct[];
}

export async function fetchCatalogue(): Promise<AdminCatalogue> {
  const c = db();
  const [locs, cats, prods, avail] = await Promise.all([
    c.from("locations").select("*").order("sort_order"),
    c.from("categories").select("*").order("sort_order"),
    c.from("products")
      .select("id, slug, category_id, name, description, notice_hours, enquiry_only, active, sort_order, product_options(id, product_id, label, size, type, price, active, sort_order)")
      .order("sort_order"),
    c.from("availability").select("product_id, location_id, sold_out").eq("sold_out", true),
  ]);
  for (const r of [locs, cats, prods, avail]) fail(r.error);
  const soldOut = new Map<string, string[]>();
  for (const a of avail.data ?? []) soldOut.set(a.product_id, [...(soldOut.get(a.product_id) ?? []), a.location_id]);
  const products = ((prods.data ?? []) as Omit<AdminProduct, "sold_out_at">[]).map((p) => ({
    ...p,
    product_options: [...p.product_options].sort((a, b) => a.sort_order - b.sort_order),
    sold_out_at: soldOut.get(p.id) ?? [],
  }));
  return { locations: (locs.data ?? []) as Location[], categories: (cats.data ?? []) as Category[], products };
}

export async function updateProduct(id: string, patch: Partial<Pick<AdminProduct, "name" | "description" | "category_id" | "notice_hours" | "active">>): Promise<void> {
  const { error, count } = await db().from("products").update(patch, { count: "exact" }).eq("id", id);
  fail(error);
  if (count === 0) throw new Error("Nothing was saved. Only the founder can change products.");
}

export async function setSoldOut(productId: string, locationId: string, soldOut: boolean): Promise<void> {
  const { error } = await db().from("availability").upsert({ product_id: productId, location_id: locationId, sold_out: soldOut });
  fail(error);
}

export interface OptionDraft { id?: string; label: string; size: string | null; type: string | null; price: number }

/** Saves a product's options: updates changed ones, adds new ones, removes the ones left out. */
export async function saveOptions(productId: string, before: AdminOption[], after: OptionDraft[]): Promise<void> {
  const c = db();
  const keep = new Set(after.filter((o) => o.id).map((o) => o.id));
  const removed = before.filter((o) => !keep.has(o.id)).map((o) => o.id);
  if (removed.length) {
    const { error } = await c.from("product_options").delete().in("id", removed);
    fail(error);
  }
  for (const [i, o] of after.entries()) {
    const row = { label: o.label, size: o.size, type: o.type, price: o.price, sort_order: i + 1 };
    if (o.id) {
      const prev = before.find((b) => b.id === o.id);
      if (prev && prev.label === row.label && prev.size === row.size && prev.type === row.type && prev.price === row.price && prev.sort_order === row.sort_order) continue;
      const { error, count } = await c.from("product_options").update(row, { count: "exact" }).eq("id", o.id);
      fail(error);
      if (count === 0) throw new Error("Nothing was saved. Only the founder can change prices.");
    } else {
      const { error } = await c.from("product_options").insert({ ...row, product_id: productId });
      fail(error);
    }
  }
}

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "item";
}

export async function addProduct(p: { name: string; description: string; category_id: string; notice_hours: number; sort_order: number }, options: OptionDraft[]): Promise<void> {
  const c = db();
  const slug = `${slugify(p.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await c.from("products").insert({ ...p, slug }).select("id").single();
  fail(error);
  const id = (data as { id: string }).id;
  const { error: optError } = await c.from("product_options").insert(
    options.map((o, i) => ({ product_id: id, label: o.label, size: o.size, type: o.type, price: o.price, sort_order: i + 1 })),
  );
  if (optError) {
    await c.from("products").delete().eq("id", id); // don't leave a product with no prices
    fail(optError);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error, count } = await db().from("products").delete({ count: "exact" }).eq("id", id);
  fail(error);
  if (count === 0) throw new Error("Nothing was deleted. Only the founder can delete products.");
}

// ---------------------------------------------------------------------------
// Locations and staff (founder)
// ---------------------------------------------------------------------------

export async function updateLocation(id: string, patch: Partial<Omit<Location, "id" | "sort_order">>): Promise<void> {
  const { error, count } = await db().from("locations").update(patch, { count: "exact" }).eq("id", id);
  fail(error);
  if (count === 0) throw new Error("Nothing was saved. Only the founder can change location settings.");
}

export interface StaffRow { user_id: string; name: string; role: "founder" | "staff"; location_id: string | null; email: string }

export async function fetchStaff(): Promise<StaffRow[]> {
  const { data, error } = await db().rpc("staff_directory");
  fail(error);
  return (data ?? []) as StaffRow[];
}

export async function linkStaff(email: string, name: string, role: "founder" | "staff", location: string | null): Promise<void> {
  const { error } = await db().rpc("link_staff", { p_email: email, p_name: name, p_role: role, p_location: location });
  fail(error);
}

export async function removeStaff(userId: string): Promise<void> {
  const { error } = await db().rpc("remove_staff", { p_user_id: userId });
  fail(error);
}
