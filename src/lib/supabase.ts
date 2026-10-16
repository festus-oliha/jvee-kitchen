import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const isPlaceholder = !url || !key || url.includes("your-project-ref") || key.includes("your-anon");

/**
 * Checks the two .env values for the usual copy-paste mistakes and returns a
 * plain-English problem, or null when they look right.
 */
function findConfigProblem(u: string, k: string): string | null {
  if (/^["']|["']$/.test(u) || /^["']|["']$/.test(k)) return "Remove the quotes around the values in .env.";
  if ((u.match(/https?:\/\//g) ?? []).length > 1) return "VITE_SUPABASE_URL has \"https://\" twice. Keep only one.";
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(u.replace(/\/+$/, "")))
    return "VITE_SUPABASE_URL should look like https://abcd1234.supabase.co, with nothing after .supabase.co. Copy the Project URL from Supabase > Project Settings > API.";
  if (k.includes("service_role")) return "That is the service_role key. Use the anon public key in .env.";
  if (!/^(eyJ|sb_publishable_)/.test(k)) return "VITE_SUPABASE_ANON_KEY doesn't look like the anon public key (it starts with \"eyJ\" or \"sb_publishable_\").";
  return null;
}

/** A problem with the .env values, shown in the error bar; null when they look fine. */
export const configProblem: string | null = isPlaceholder ? null : findConfigProblem(url!, key!);

/** True when .env has real Supabase settings (not the example placeholders). */
export const isSupabaseConfigured = !isPlaceholder;

/**
 * The shared Supabase client, or null when the project is not connected yet.
 * When null, the site shows the built-in demo menu instead.
 */
export const supabase: SupabaseClient | null =
  isSupabaseConfigured && !configProblem
    ? createClient(url!.replace(/\/+$/, ""), key!, { auth: { persistSession: true } })
    : null;
