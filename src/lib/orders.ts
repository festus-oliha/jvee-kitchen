import { supabase } from "./supabase";
import { notifyKitchen } from "./notify";

export const WHATSAPP_NUMBER = "2348058923302"; // 0805 892 3302 in international form

export interface NewOrder {
  location_id: string;
  fulfilment: "delivery" | "pickup";
  customer_name: string;
  phone: string;
  address?: string;
  landmark?: string;
  note?: string;
  needed_for?: string | null;
  items: { option_id: string; quantity: number }[];
}

export type PlaceResult =
  | { ok: true; code: string; token: string; total: number }
  | { ok: false; kind: "invalid"; message: string } // the customer can fix it
  | { ok: false; kind: "network"; message: string }; // nothing reached the kitchen

export async function placeOrder(order: NewOrder): Promise<PlaceResult> {
  if (!supabase)
    return { ok: false, kind: "invalid", message: "Ordering needs the database. Add your Supabase settings to .env first." };
  try {
    const { data, error } = await supabase.rpc("place_order", { p_order: order });
    if (error) {
      // P0001 = a message written for customers in place_order()
      if (error.code === "P0001") return { ok: false, kind: "invalid", message: error.message };
      return { ok: false, kind: "network", message: error.message };
    }
    const r = data as { code: string; tracking_token: string; total: number };
    rememberOrder(r.tracking_token, r.code);
    notifyKitchen({ kind: "order", token: r.tracking_token });
    return { ok: true, code: r.code, token: r.tracking_token, total: r.total };
  } catch (e) {
    return { ok: false, kind: "network", message: (e as Error).message };
  }
}

export type OrderStatus = "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

export interface TrackedOrder {
  code: string;
  status: OrderStatus;
  fulfilment: "delivery" | "pickup";
  customer_name: string;
  address: string | null;
  landmark: string | null;
  note: string | null;
  needed_for: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  paid: boolean;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  location: { id: string; name: string; address: string; phone: string; bank_details: string | null };
  items: { name: string; unit_price: number; quantity: number }[];
}

/** null = no order behind this link; throws on connection problems. */
export async function fetchOrder(token: string): Promise<TrackedOrder | null> {
  if (!supabase) throw new Error("The database is not connected.");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await supabase.rpc("order_status", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as TrackedOrder | null) ?? null;
}

// Recent orders on this phone, so a customer can find their tracking link again
const RECENT_KEY = "jvee.orders";
export interface RecentOrder { token: string; code: string; at: string }

export function recentOrders(): RecentOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function rememberOrder(token: string, code: string) {
  try {
    const list = [{ token, code, at: new Date().toISOString() }, ...recentOrders().filter((o) => o.token !== token)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* private mode */ }
}

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Payment rule: the customer pays for the items by bank transfer straight after
 * ordering, and the kitchen starts once that payment is confirmed. A delivery fee
 * is paid to the rider on arrival.
 */
export function payNow(o: { fulfilment: "delivery" | "pickup"; subtotal: number; total: number }): number {
  return o.fulfilment === "delivery" ? o.subtotal : o.total;
}

export interface NewEnquiry {
  location_id: string;
  occasion: string;
  budget: string;
  date_needed: string;
  name: string;
  phone: string;
  details: string;
}

/** Saves a custom basket enquiry. Returns null when saved, or a message to show. */
export async function submitEnquiry(e: NewEnquiry): Promise<{ ok: true } | { ok: false; kind: "invalid" | "network"; message: string }> {
  if (!supabase) return { ok: false, kind: "invalid", message: "The form needs the database. Add your Supabase settings to .env first." };
  try {
    const { data, error } = await supabase.rpc("submit_enquiry", { p: e });
    if (error) return { ok: false, kind: error.code === "P0001" ? "invalid" : "network", message: error.message };
    notifyKitchen({ kind: "enquiry", id: data as string });
    return { ok: true };
  } catch (err) {
    return { ok: false, kind: "network", message: (err as Error).message };
  }
}
