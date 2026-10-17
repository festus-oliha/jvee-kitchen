# JVee Crunch Kitchen website

Ordering website for **JVee Crunch Kitchen**: homemade chin chin and cakes, fresh veggie trays, small chops and chilled drinks, with kitchens in Benin City and Abuja.

**Developer:** JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
**Version:** 0.4.1 · Milestone 4 (Email alerts, custom baskets, photos, link previews)

Planning documents are in [`docs/`](docs/): requirements, design and tech stack.

---

## What works in this version

| Part | Status |
| --- | --- |
| Home page: brand, categories, location choice, popular items | Done |
| Menu page: every product and price from the owner's list, category chips, sold-out and "order 24 hours ahead" labels | Done |
| Location switch (Benin City or Abuja), remembered on the phone | Done |
| "Closed for orders" banner and out-of-hours note | Done |
| Database: tables, access rules, launch menu (`supabase/`) | Done |
| Size and type picker, cart (kept on the phone), cart bar and badge | Done |
| Checkout: delivery or pickup, details, date for veggie trays, totals | Done |
| Orders saved with prices checked by the database (`place_order`) | Done |
| Order status page that updates by itself every 15 seconds | Done |
| Empty cart, closed-for-orders and order-failed screens, WhatsApp backup | Done |
| Staff sign-in at `/admin` (founder and staff accounts) | Done |
| Live orders board: New, Preparing, Ready / Out, Done today; chime and count in the browser tab | Done |
| Order actions: next step, paid by cash or transfer, WhatsApp the customer, cancel with a reason | Done |
| Products (founder): prices, sizes, sold out per location, hide, add, delete | Done |
| Settings (founder): taking orders switch, delivery fee, cut-off, hours, phone, bank details, staff | Done |
| Pay before preparing: customer transfers for the items after ordering; kitchen starts once payment is confirmed; delivery fee paid on arrival | Done (0.3.1) |
| Email to the owner for every new order and basket enquiry (Netlify Function + Resend) | Done |
| Custom basket enquiry form at `/basket`, and a **Baskets** page in the admin | Done |
| Product photos: upload in **Admin > Products > Edit**, shrunk automatically | Done |
| Link previews for WhatsApp, Facebook, LinkedIn and X; phone home-screen icon | Done |
| Speed and accessibility checks (Lighthouse on phone: 98–99 speed, 95–100 accessibility, 100 SEO) | Done |
| Final testing with the owner's real details, then launch | Milestone 5 |

**How payment works:** after placing an order the customer sees the account details and the amount to pay now (the items; for delivery, the delivery fee is paid on arrival). They can send the receipt on WhatsApp. Staff check the bank app for the order code, tap **Transfer received**, and only then can they tap **Start preparing**. The database enforces this, so an unpaid order can't be started by mistake. Unpaid orders can be cancelled with the reason "No payment received".

---

## Updating to 0.4.0 (milestone 4)

1. In Supabase **SQL Editor**, run `supabase/admin.sql` again (adds the pay-before-preparing rule if you skipped 0.3.1), then run `supabase/extras.sql`. Both are safe; nothing is deleted.
2. Set up the email alerts (next section).
3. Extract the zip over your project folder, run `npm install`, then commit and push. Netlify now also builds the `notify` function.

---

## Email alerts for new orders (Resend)

Every new order and basket enquiry sends one email to the owner, with the items, total, amount to wait for, customer phone, and a button to the board.

1. Sign up at [resend.com](https://resend.com) (free: 100 emails a day, 3,000 a month) **with the email address that should receive the alerts**.
2. **API Keys > Create API key** (permission: Sending access). Copy it, it starts with `re_`.
3. In Supabase, **Project Settings > API Keys**, copy the **secret** key (`sb_secret_...`), or on older projects the legacy **service_role** key (`eyJ...`). Either works. It never goes in `.env` or the code.
4. In Netlify, **Site configuration > Environment variables**, add:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | same as `VITE_SUPABASE_URL` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
   | `RESEND_API_KEY` | the `re_...` key |
   | `ORDER_EMAIL_TO` | the address you signed up to Resend with (several: separate with commas) |

5. **Deploys > Trigger deploy > Deploy site** so the function picks up the settings. Place a test order on the live site: the email arrives within a minute (check spam the first time and mark it "not spam").

Until you own a domain, Resend sends from `onboarding@resend.dev` and **only to your own Resend address**. After buying a domain (for example jveecrunchkitchen.com), add it in Resend > Domains, then set `ORDER_EMAIL_FROM` to `JVee orders <orders@your-domain>` to send to any address.

Emails are only sent from the live site, not from `npm run dev`. If the settings are missing, ordering still works; you just don't get the email.

---

## Updating from 0.3.0 (pay before preparing)

Run `supabase/admin.sql` again in the SQL Editor (safe, nothing is deleted), then extract the zip over your project and push.

## Updating from milestone 2

Your database already has the tables, menu and ordering functions. Add the admin functions only:

1. In Supabase, open **SQL Editor > New query**.
2. Paste all of `supabase/admin.sql` and click **Run**. Nothing is deleted. (Coming from milestone 1? Run `ordering.sql` first, then `admin.sql`.)
3. Extract the new zip over your project folder (replace files when asked), run `npm install`, then `npm run dev`.
4. Create the founder's sign-in (next section).

Don't run `schema.sql` or `seed.sql` again on a database you're using: `schema.sql` deletes all tables and starts over.

---

## Staff admin: first-time setup

The admin is at **/admin** (for example `http://localhost:5173/admin`, and `https://jvee-kitchen.netlify.app/admin` once live).

**1. Turn off public sign-ups** (only people you add can have accounts): in Supabase, **Authentication > Sign In / Providers > Email**, switch off **Allow new users to sign up**. Email sign-in itself stays on.

**2. Create the founder's account:** **Authentication > Users > Add user > Create new user**. Enter her email and a strong password and tick **Auto Confirm User**.

**3. Make that account the founder:** in **SQL Editor > New query**, run (with her real email):

```sql
select public.make_founder('owner@example.com', 'Ms. O. Osazemen');
```

It answers "Ms. O. Osazemen is now the founder and can sign in at /admin". She can now sign in and sees Orders, Products and Settings.

**4. Add staff:** create each person's sign-in the same way (step 2), then the founder opens **Settings > Staff**, enters their email and name, picks Benin City, Abuja or both, and clicks **Give access**. Staff see the orders board only, and only for their location. **Remove** takes the access away at once.

**Forgotten password:** in Supabase, **Authentication > Users**, open the person's menu (⋯) and choose **Send password recovery**, or delete the user and add them again.

**On the orders board:** tap **Turn on sound** once on the phone or laptop that stays open at the counter; it chimes for each new order. New orders appear by themselves; if the live link drops, the board still checks every 30 seconds. Keep the screen on while the shop is open.

---

## 1. Run it on your computer

You need **Node.js 20 or newer** (`node -v` to check) and VS Code.

1. Extract the zip into your GitHub repository folder (the one you cloned). If it asks, replace the existing `README.md`.
2. Open the folder in VS Code, then open the terminal (**Terminal > New Terminal**).
3. Install the packages (first time only, takes a minute):

   ```bash
   npm install
   ```

4. Start the site:

   ```bash
   npm run dev
   ```

5. Open **http://localhost:5173** in your browser. On your phone, use the "Network" address it prints, on the same Wi-Fi.

Without a database the site runs on a **built-in copy of the menu** and shows a yellow "Preview data" bar. That's expected until step 2.

Stop the site with **Ctrl + C** in the terminal.

---

## 2. Connect the database (Supabase)

1. Go to [supabase.com](https://supabase.com), sign up (ideally with an email the business owns) and click **New project**.
   - Name: `jvee-crunch-kitchen`
   - Region: **West EU (London)** or **EU Central**. Both are close to Nigeria.
   - Set a strong database password and keep it somewhere safe.
2. When the project is ready, open **SQL Editor > New query**.
3. Open `supabase/schema.sql` in VS Code, copy all of it, paste it into the editor and click **Run**. You should see "Success. No rows returned".
4. Do the same with `supabase/ordering.sql`. This adds the functions that take and track orders.
5. Do the same with `supabase/admin.sql`. This adds the staff functions used by the admin.
6. Do the same with `supabase/extras.sql`. This adds the basket form, email tracking and the photo storage.
7. Do the same with `supabase/seed.sql`. This loads both locations and the full menu. Run it only once.
8. Go to **Project Settings > API** (or the **Connect** button). Copy the **Project URL** and the **anon public** key.
9. In VS Code, copy `.env.example` to a new file called `.env` and paste the two values in:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

10. Stop the site (Ctrl + C) and run `npm run dev` again. The yellow bar disappears, and the menu now comes from your database.

> Never put the **service_role** key in `.env` or anywhere in the website. It's only used later in Netlify's settings for the email function.

To check the access rules: in Supabase, open **Table Editor > products** and change a price. Refresh the site and the new price shows.

---

## 3. Push to GitHub

From the VS Code terminal, in the project folder:

```bash
git add .
git commit -m "Milestone 4: email alerts, baskets, photos"
git push
```

`.env` is listed in `.gitignore`, so your keys stay on your computer.

---

## 4. Publish on Netlify

1. Go to [netlify.com](https://www.netlify.com), sign up with your GitHub account.
2. **Add new site > Import an existing project > GitHub**, then pick the `jvee-crunch-kitchen` repository.
3. Netlify reads `netlify.toml`, so the build settings fill in themselves (build command `npm run build`, publish folder `dist`).
4. Before deploying, open **Environment variables** and add the same two values from your `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. After about a minute you get a link like `https://jvee-crunch-kitchen.netlify.app`.

The free plan allows about 20 live publishes a month (each uses 15 of 300 credits). Batch your changes and push once a day at most.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site on your computer and reloads when you save a file |
| `npm run build` | Checks the code for errors and builds the live version into `dist/` |
| `npm run preview` | Serves the built version locally, to check it before pushing |
| `npm run typecheck` | Checks the code for errors without building |

---

## Project structure

```
src/
  main.tsx              page routes
  pages/                Home, Menu, Checkout, OrderStatus, and placeholders for later milestones
  pages/Basket.tsx      custom basket enquiry form
  pages/admin/          SignIn, AdminApp (frame and access check), Orders, Enquiries, Products, Settings
  components/           Layout, ProductCard, OptionPicker, CartBar, QuantityStepper, LocationNotice, Icons
  lib/
    menu.tsx            loads locations, categories, products and prices
    cart.tsx            the cart, saved on the phone
    orders.ts           places orders and reads order status
    auth.tsx            staff sign-in and role
    admin.ts            admin reads and saves (orders, products, locations, staff)
    demo-data.ts        built-in copy of the menu used when .env is empty
    hours.ts            opening hours in Nigerian time
    money.ts            naira formatting
    supabase.ts         database connection
  styles/index.css      brand colours, type and buttons
supabase/
  schema.sql            tables and access rules (fresh database only)
  ordering.sql          place_order and order_status functions
  admin.sql             next_status, set_paid and staff functions
  extras.sql            basket enquiries, email tracking, product photo storage
netlify/functions/
  notify.mts            emails the owner about new orders and basket enquiries
  seed.sql              both locations and the launch menu (run once)
public/                 logo, app icons, og-image.png (link preview picture), robots.txt
docs/                   requirements, design, tech stack
netlify.toml            Netlify build and page routing
```

---

## Placeholders to replace before launch

These values are made up. Change them in Supabase (**Table Editor > locations / products / product_options**), or from the admin (**/admin > Products** and **Settings**):

- Delivery fee: ₦1,500 Benin City, ₦2,500 Abuja
- Same-day cut-off: 2:00pm
- Bank details: "JVee Crunch Kitchen · 0123456789 · Sample Bank"
- Drinks: sports drink ₦1,000, bottled water ₦300
- Samosa pack: piece count and filling
- Basic Unique Package with 2 L chin chin: currently the same ₦23,000 as the 1.5 L option
- Product photos: drawn illustrations are shown until a photo is added in **Admin > Products > Edit**
- Website address in link previews: `https://jvee-kitchen.netlify.app` in `index.html`. Change it there if you move to your own domain

If you change prices in `seed.sql` before launch, change them in `src/lib/demo-data.ts` too, so the preview copy matches.

---

## Troubleshooting

- **"Could not find the function public.place_order" when placing an order:** run `supabase/ordering.sql` in the Supabase SQL Editor.
- **Ordering says "This phone number has placed several orders in the last hour":** that's the abuse limit (5 orders an hour per number). When testing, use different numbers or wait an hour.
- **"Could not find the function public.next_status" on the orders board:** run `supabase/admin.sql` in the SQL Editor.
- **Admin sign-in says the email and password don't match:** check the account exists in **Authentication > Users**. If it says "isn't confirmed", open the user and confirm them.
- **"This account isn't on the staff list":** the sign-in works but hasn't been given access. The founder adds them in **Settings > Staff** (for the very first founder, run `make_founder` as above).
- **Board shows "Checking every 30 seconds" instead of "Live":** that still works. For live updates, check **Database > Publications > supabase_realtime** includes the `orders` table.
- **No email after an order:** first open `https://jvee-kitchen.netlify.app/.netlify/functions/notify` in your browser. It lists each email setting as "ok", "missing" or what looks wrong, and whether the database answers (it never shows the keys). Fix anything not "ok", redeploy, and place a new test order. For more detail, open **Logs > Functions > notify** in Netlify. "not set up" means a setting from the email section is missing; a Resend 403 means `ORDER_EMAIL_TO` isn't your own Resend address (until a domain is verified). Redeploy after changing settings.
- **"Photo storage isn't set up yet" when adding a photo:** run `supabase/extras.sql`.
- **"Could not find the function public.submit_enquiry" on the basket form:** run `supabase/extras.sql`.
- **A link shared on WhatsApp shows an old preview:** WhatsApp keeps previews for a while. Add `?v=2` to the end of the link to see the new one.
- **`npm` is not recognised:** install Node.js 20+ from nodejs.org, then close and reopen VS Code.
- **"Failed to fetch" right after adding `.env`:** check the URL is exactly `https://xxxx.supabase.co`. Pasting `https://` twice is an easy slip (`https://https://...`). Fix it, save, then stop and restart `npm run dev`.
- **The red "menu could not load" bar:** check the internet connection and the two values in `.env`. If the Supabase project shows **Paused** (free projects pause after a week without use), click **Restore** in the Supabase dashboard.
- **Port 5173 is already in use:** another copy is running. Close the other terminal, or run `npm run dev -- --port 5174`.

---

© JVee Crunch Kitchen. Website developed by JVeesoft-IT Solutions and Services Ltd.
