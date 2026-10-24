// Built-in copy of supabase/seed.sql, shown only while .env has no Supabase
// settings, so the site can be previewed before the database is connected.
// Keep in step with seed.sql when prices change before launch.
import type { Location, Menu, Product, ProductOption } from "./types";

const hours: Location["opening_hours"] = {
  mon: ["08:00", "18:00"], tue: ["08:00", "18:00"], wed: ["08:00", "18:00"], thu: ["08:00", "18:00"],
  fri: ["08:00", "18:00"], sat: ["08:00", "18:00"], sun: null,
};

const locations: Location[] = [
  { id: "benin-city", name: "Benin City", address: "2 Asemota Street, Ekehuan Road, Benin City", phone: "0805 892 3302",
    taking_orders: true, delivery_fee: 0, same_day_cutoff: "14:00:00", opening_hours: hours,
    bank_details: "JVee Crunch Kitchen · 0123456789 · Sample Bank", sort_order: 1 },
  { id: "abuja", name: "Abuja", address: "99N Success Street, FHA, Lugbe, Abuja", phone: "0805 892 3302",
    taking_orders: true, delivery_fee: 0, same_day_cutoff: "14:00:00", opening_hours: hours,
    bank_details: "JVee Crunch Kitchen · 0123456789 · Sample Bank", sort_order: 2 },
];

const categories = [
  { id: "chin-chin", name: "Chin chin", sort_order: 1 },
  { id: "gift-packages", name: "Gift packages", sort_order: 2 },
  { id: "veggie-trays", name: "Veggie trays", sort_order: 3 },
  { id: "small-chops", name: "Small chops", sort_order: 4 },
  { id: "cakes", name: "Cakes", sort_order: 5 },
  { id: "drinks", name: "Drinks", sort_order: 6 },
];

let n = 0;
const opt = (product_id: string, label: string, price: number, size: string | null = null, type: string | null = null): ProductOption =>
  ({ id: `${product_id}-${++n}`, product_id, label, size, type, price, sort_order: n });

const product = (
  slug: string, category_id: string, name: string, description: string, sort_order: number,
  options: ProductOption[], extra: Partial<Product> = {},
): Product => ({
  id: slug, slug, category_id, name, description, photo_url: null, notice_hours: 0, enquiry_only: false,
  sort_order, options, sold_out_at: [], ...extra,
});

const chinChinPrices: [string, number, number][] = [
  ["1.0 L", 4500, 6000], ["1.5 L", 6000, 8000], ["2.0 L", 8500, 10000], ["2.5 L", 12000, 18000], ["5.0 L", 16500, 25000],
];

const products: Product[] = [
  product("homemade-chin-chin", "chin-chin", "Homemade chin chin",
    "Crunchy and golden, fried fresh in small batches. Standard or premium milky.", 1,
    chinChinPrices.flatMap(([size, std, prem]) => [
      opt("homemade-chin-chin", `${size} · Standard`, std, size, "Standard"),
      opt("homemade-chin-chin", `${size} · Premium (milky)`, prem, size, "Premium (milky)"),
    ])),
  product("basic-unique-package", "gift-packages", "Basic Unique Package",
    "1.5 L or 2 L chin chin, plantain chips, a pack of groundnut or kuli-kuli, and a small treat or chocolate, nicely packaged.", 2,
    [opt("basic-unique-package", "With 1.5 L chin chin", 23000, "1.5 L"), opt("basic-unique-package", "With 2 L chin chin", 23000, "2.0 L")]),
  product("custom-basket", "gift-packages", "Custom occasion basket",
    "Birthdays, weddings and thank-yous. Tell us your budget and we build the basket around it.", 3, [], { enquiry_only: true }),
  product("mixed-veggie-tray", "veggie-trays", "Mixed veggie tray",
    "Freshly made with cabbage, carrots, cucumber, sweet corn and lettuce.", 4,
    [opt("mixed-veggie-tray", "Without eggs", 5000), opt("mixed-veggie-tray", "With eggs", 7000)], { notice_hours: 24, photo_url: "/photos/veggie-tray-party.webp" }),
  product("quick-solo-samosa", "small-chops", "Quick Solo samosa pack", "Samosas, ready to share.", 5,
    [opt("quick-solo-samosa", "Samosa pack", 3000)]),
  product("quick-solo", "small-chops", "Quick Solo", "Samosa, puff-puff and peppered chicken.", 6,
    [opt("quick-solo", "Samosa, puff-puff and peppered chicken", 5000)]),
  product("naked-fruit-cake", "cakes", "Naked fruit cake", "An 8 inch naked cake finished with fresh fruit.", 7,
    [opt("naked-fruit-cake", "8 inch", 15000, "8 inch")]),
  product("sports-drink", "drinks", "Sports drink", "Kept ice-cold with clean solar power.", 8,
    [opt("sports-drink", "50cl", 1000, "50cl")]),
  product("bottled-water", "drinks", "Bottled water", "Kept ice-cold with clean solar power.", 9,
    [opt("bottled-water", "75cl", 300, "75cl")]),
];

export const demoMenu: Menu = { locations, categories, products };
