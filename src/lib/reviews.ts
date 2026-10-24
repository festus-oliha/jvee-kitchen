// Customer reviews: reading them on product pages, and sending one from a completed order.
import { supabase } from "./supabase";

export interface Review { id: string; rating: number; comment: string | null; name: string; created_at: string }

export interface ReviewTarget {
  product_id: string;
  slug: string;
  name: string;
  photo_url: string | null;
  category_id: string;
  review: { rating: number; comment: string | null; name: string; hidden: boolean } | null;
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, name, created_at")
    .eq("product_id", productId)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Review[];
}

export async function fetchReviewTargets(token: string): Promise<ReviewTarget[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("review_targets", { p_token: token });
  if (error) return [];
  return (data ?? []) as ReviewTarget[];
}

export async function submitReview(token: string, productId: string, rating: number, comment: string, name: string): Promise<string | null> {
  if (!supabase) return "Reviews need the database.";
  const { error } = await supabase.rpc("submit_review", { p_token: token, p_product_id: productId, p_rating: rating, p_comment: comment, p_name: name });
  if (!error) return null;
  return error.code === "P0001" ? error.message : "We couldn't send that. Check your internet and try again.";
}

export const reviewDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
