// Shapes of the data the website reads. They match supabase/schema.sql.

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  taking_orders: boolean;
  delivery_fee: number;
  same_day_cutoff: string; // "14:00:00"
  opening_hours: Record<DayKey, [string, string] | null>;
  bank_details: string | null;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface ProductOption {
  id: string;
  product_id: string;
  label: string;
  size: string | null;
  type: string | null;
  price: number;
  sort_order: number;
}

export interface Product {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  description: string;
  photo_url: string | null;
  notice_hours: number;
  enquiry_only: boolean;
  sort_order: number;
  options: ProductOption[];
  sold_out_at: string[]; // location ids where this product is sold out
}

export interface Menu {
  locations: Location[];
  categories: Category[];
  products: Product[];
}
