# JVee Crunch Kitchen website

Ordering website for **JVee Crunch Kitchen**: homemade chin chin and cakes, fresh veggie trays, small chops and chilled drinks, with kitchens in Benin City and Abuja.

**Developer:** JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
**Version:** 0.2.0 · Milestone 2 (Ordering)

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
| Staff sign-in, orders board, products, settings | Milestone 3 |
| New-order email, basket form, link previews | Milestone 4 |

Until the staff orders board arrives in milestone 3, you can move a test order along by hand: in Supabase open **Table Editor > orders**, change `status` to `preparing`, `out_for_delivery` (or `ready` for pickup), then `completed`. The customer's status page follows within 15 seconds.

---

## Updating from milestone 1

Your database already has the tables and menu. Add the ordering functions only:

1. In Supabase, open **SQL Editor > New query**.
2. Paste all of `supabase/ordering.sql` and click **Run**. Nothing is deleted; it only adds two functions.
3. Extract the new zip over your project folder (replace files when asked), run `npm install`, then `npm run dev`.

Don't run `schema.sql` or `seed.sql` again on a database you're using: `schema.sql` deletes all tables and starts over.

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
5. Do the same with `supabase/seed.sql`. This loads both locations and the full menu. Run it only once.
6. Go to **Project Settings > API** (or the **Connect** button). Copy the **Project URL** and the **anon public** key.
7. In VS Code, copy `.env.example` to a new file called `.env` and paste the two values in:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

8. Stop the site (Ctrl + C) and run `npm run dev` again. The yellow bar disappears, and the menu now comes from your database.

> Never put the **service_role** key in `.env` or anywhere in the website. It's only used later in Netlify's settings for the email function.

To check the access rules: in Supabase, open **Table Editor > products** and change a price. Refresh the site and the new price shows.

---

## 3. Push to GitHub

From the VS Code terminal, in the project folder:

```bash
git add .
git commit -m "Milestone 2: ordering"
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
  components/           Layout, ProductCard, OptionPicker, CartBar, QuantityStepper, LocationNotice, Icons
  lib/
    menu.tsx            loads locations, categories, products and prices
    cart.tsx            the cart, saved on the phone
    orders.ts           places orders and reads order status
    demo-data.ts        built-in copy of the menu used when .env is empty
    hours.ts            opening hours in Nigerian time
    money.ts            naira formatting
    supabase.ts         database connection
  styles/index.css      brand colours, type and buttons
supabase/
  schema.sql            tables and access rules (fresh database only)
  ordering.sql          place_order and order_status functions
  seed.sql              both locations and the launch menu (run once)
public/                 logo
docs/                   requirements, design, tech stack
netlify.toml            Netlify build and page routing
```

---

## Placeholders to replace before launch

These values are made up. Change them in Supabase (**Table Editor > locations / products / product_options**), or from the admin Settings page once milestone 3 is in:

- Delivery fee: ₦1,500 Benin City, ₦2,500 Abuja
- Same-day cut-off: 2:00pm
- Bank details: "JVee Crunch Kitchen · 0123456789 · Sample Bank"
- Drinks: sports drink ₦1,000, bottled water ₦300
- Samosa pack: piece count and filling
- Basic Unique Package with 2 L chin chin: currently the same ₦23,000 as the 1.5 L option
- Product photos: drawn illustrations are shown until `photo_url` is set

If you change prices in `seed.sql` before launch, change them in `src/lib/demo-data.ts` too, so the preview copy matches.

---

## Troubleshooting

- **"Could not find the function public.place_order" when placing an order:** run `supabase/ordering.sql` in the Supabase SQL Editor.
- **Ordering says "This phone number has placed several orders in the last hour":** that's the abuse limit (5 orders an hour per number). When testing, use different numbers or wait an hour.
- **`npm` is not recognised:** install Node.js 20+ from nodejs.org, then close and reopen VS Code.
- **"Failed to fetch" right after adding `.env`:** check the URL is exactly `https://xxxx.supabase.co`. Pasting `https://` twice is an easy slip (`https://https://...`). Fix it, save, then stop and restart `npm run dev`.
- **The red "menu could not load" bar:** check the internet connection and the two values in `.env`. If the Supabase project shows **Paused** (free projects pause after a week without use), click **Restore** in the Supabase dashboard.
- **Port 5173 is already in use:** another copy is running. Close the other terminal, or run `npm run dev -- --port 5174`.

---

© JVee Crunch Kitchen. Website developed by JVeesoft-IT Solutions and Services Ltd.
