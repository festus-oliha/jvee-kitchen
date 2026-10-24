import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { configProblem, supabase } from "./supabase";
import { demoMenu } from "./demo-data";
import type { Location, Menu, Product } from "./types";

type Source = "loading" | "live" | "demo" | "error" | "config";

interface MenuState {
  menu: Menu;
  source: Source;
  error: string | null;
  location: Location | null;
  setLocationId: (id: string) => void;
  retry: () => void;
}

const MenuContext = createContext<MenuState | null>(null);
const STORAGE_KEY = "jvee.location";
const empty: Menu = { locations: [], categories: [], products: [] };

async function fetchMenu(): Promise<Menu> {
  if (!supabase) return demoMenu;
  const [locs, cats, prods, avail] = await Promise.all([
    supabase.from("locations").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("products")
      .select("id, slug, category_id, name, description, photo_url, notice_hours, enquiry_only, sort_order, product_options(id, product_id, label, size, type, price, sort_order, active)")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("availability").select("product_id, location_id, sold_out").eq("sold_out", true),
  ]);
  const failed = [locs, cats, prods, avail].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  // Star ratings; the menu still works if reviews aren't set up yet
  const ratings = new Map<string, { average: number; count: number }>();
  const rated = await supabase.from("product_ratings").select("product_id, average, count");
  for (const r of rated.data ?? []) ratings.set(r.product_id, { average: Number(r.average), count: r.count });

  const soldOut = new Map<string, string[]>();
  for (const a of avail.data ?? []) soldOut.set(a.product_id, [...(soldOut.get(a.product_id) ?? []), a.location_id]);

  const products: Product[] = (prods.data ?? []).map((p) => {
    const { product_options, ...rest } = p as typeof p & { product_options: (Product["options"][number] & { active: boolean })[] };
    return {
      ...rest,
      options: (product_options ?? []).filter((o) => o.active).sort((a, b) => a.sort_order - b.sort_order),
      sold_out_at: soldOut.get(p.id) ?? [],
      rating: ratings.get(p.id),
    };
  });
  return { locations: locs.data ?? [], categories: cats.data ?? [], products };
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<Menu>(empty);
  const [source, setSource] = useState<Source>("loading");
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (configProblem) {
      setError(configProblem);
      setSource("config");
      return;
    }
    setSource("loading");
    fetchMenu()
      .then((m) => { if (!cancelled) { setMenu(m); setSource(supabase ? "live" : "demo"); setError(null); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setSource("error"); } });
    return () => { cancelled = true; };
  }, [attempt]);

  const setLocationId = useCallback((id: string) => {
    setLocationIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode: keep in memory only */ }
  }, []);

  const location = useMemo(
    () => menu.locations.find((l) => l.id === locationId) ?? menu.locations[0] ?? null,
    [menu.locations, locationId],
  );

  const value = useMemo<MenuState>(
    () => ({ menu, source, error, location, setLocationId, retry: () => setAttempt((a) => a + 1) }),
    [menu, source, error, location, setLocationId],
  );
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuState {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside <MenuProvider>");
  return ctx;
}

/** Lowest price of a product, for "From ₦4,500" labels. */
export function fromPrice(p: Product): number | null {
  return p.options.length ? Math.min(...p.options.map((o) => o.price)) : null;
}

/** "From ₦4,500" when options differ in price, "₦23,000" when they are all the same. */
export function priceLabel(p: Product): string {
  if (!p.options.length) return "";
  const prices = p.options.map((o) => o.price);
  const min = Math.min(...prices);
  const formatted = "₦" + new Intl.NumberFormat("en-NG").format(min);
  return Math.max(...prices) > min ? `From ${formatted}` : formatted;
}
