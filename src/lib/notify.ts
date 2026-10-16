// Asks the Netlify function to email the kitchen about a new order or enquiry.
// Fire and forget: the order is already saved, so a failed email never blocks the customer.
export function notifyKitchen(body: { kind: "order"; token: string } | { kind: "enquiry"; id: string }): void {
  if (import.meta.env.DEV) return; // `npm run dev` has no functions; emails go out from the live site
  try {
    fetch("/.netlify/functions/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}
