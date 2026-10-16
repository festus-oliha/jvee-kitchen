import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when .env has real Supabase settings (not the example placeholders). */
export const isSupabaseConfigured =
  !!url && !!key && !url.includes("your-project-ref") && !key.includes("your-anon");

/**
 * The shared Supabase client, or null when the project is not connected yet.
 * When null, the site shows the built-in demo menu instead.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, { auth: { persistSession: true } })
  : null;
