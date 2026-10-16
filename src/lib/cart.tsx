import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMenu } from "./menu";
import type { Product, ProductOption } from "./types";

/** What is saved on the phone: just option ids and quantities. Prices always come from the menu. */
interface StoredLine {
  optionId: string;
  quantity: number;
}

export interface CartLine {
  option: ProductOption;
  product: Product;
  quantity: number;
  lineTotal: number;
  soldOut: boolean;
}

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Largest notice any item needs, in hours (24 for veggie trays). */
  noticeHours: number;
  add: (optionId: string, quantity?: number) => void;
  setQuantity: (optionId: string, quantity: number) => void;
  remove: (optionId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "jvee.cart";
export const MAX_QTY = 50;

function load(): StoredLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((l) => typeof l?.optionId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { menu, location, source } = useMenu();
  const [stored, setStored] = useState<StoredLine[]>(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch { /* storage full or private mode */ }
  }, [stored]);

  const optionIndex = useMemo(() => {
    const map = new Map<string, { option: ProductOption; product: Product }>();
    for (const product of menu.products) for (const option of product.options) map.set(option.id, { option, product });
    return map;
  }, [menu.products]);

  // Drop items that left the menu (only once the real menu has loaded)
  useEffect(() => {
    if (source !== "live" && source !== "demo") return;
    setStored((s) => (s.some((l) => !optionIndex.has(l.optionId)) ? s.filter((l) => optionIndex.has(l.optionId)) : s));
  }, [optionIndex, source]);

  const lines = useMemo<CartLine[]>(
    () =>
      stored.flatMap((l) => {
        const hit = optionIndex.get(l.optionId);
        if (!hit) return [];
        return [{
          ...hit,
          quantity: l.quantity,
          lineTotal: hit.option.price * l.quantity,
          soldOut: !!location && hit.product.sold_out_at.includes(location.id),
        }];
      }),
    [stored, optionIndex, location],
  );

  const add = useCallback((optionId: string, quantity = 1) => {
    setStored((s) => {
      const existing = s.find((l) => l.optionId === optionId);
      if (existing) return s.map((l) => (l.optionId === optionId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l));
      return [...s, { optionId, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, []);
  const setQuantity = useCallback((optionId: string, quantity: number) => {
    setStored((s) =>
      quantity <= 0 ? s.filter((l) => l.optionId !== optionId) : s.map((l) => (l.optionId === optionId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
    );
  }, []);
  const remove = useCallback((optionId: string) => setStored((s) => s.filter((l) => l.optionId !== optionId)), []);
  const clear = useCallback(() => setStored([]), []);

  const value = useMemo<CartState>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    noticeHours: lines.reduce((n, l) => Math.max(n, l.product.notice_hours), 0),
    add, setQuantity, remove, clear,
  }), [lines, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/** The cart line label: "2.0 L · Premium (milky)", or nothing for single-option products. */
export function optionLabel(product: Product, option: ProductOption): string | null {
  return product.options.length > 1 && option.label !== product.name ? option.label : null;
}
