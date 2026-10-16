-- =====================================================================
-- JVee Crunch Kitchen · database schema
-- Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
--
-- Run this whole file once in Supabase: SQL Editor > New query > Run.
-- Then run seed.sql. Safe to re-run: it drops and recreates the tables
-- (all data is lost), so only re-run before launch.
--
-- Milestone 1: tables, access rules, helper functions.
-- Milestone 2 adds place_order() and order_status(); milestone 3 adds
-- next_status(). Customers never write to tables directly.
-- Prices are whole naira (integer). 4500 means N4,500.
-- =====================================================================

create extension if not exists pgcrypto;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.basket_enquiries cascade;
drop table if exists public.availability cascade;
drop table if exists public.product_options cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.staff cascade;
drop table if exists public.locations cascade;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.locations (
  id               text primary key,                 -- 'benin-city', 'abuja'
  name             text not null,
  address          text not null,
  phone            text not null,
  taking_orders    boolean not null default true,     -- founder's "Taking orders" switch
  delivery_fee     integer not null default 0 check (delivery_fee >= 0),
  same_day_cutoff  time not null default '14:00',
  opening_hours    jsonb not null,                    -- {"mon":["08:00","18:00"], ..., "sun":null}
  bank_details     text,
  sort_order       integer not null default 0
);

create table public.categories (
  id          text primary key,                       -- 'chin-chin'
  name        text not null,
  sort_order  integer not null default 0
);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  category_id   text not null references public.categories(id),
  name          text not null,
  description   text not null default '',
  photo_url     text,
  notice_hours  integer not null default 0 check (notice_hours >= 0),  -- 24 = order a day ahead
  enquiry_only  boolean not null default false,                        -- custom baskets: no price, go to form
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.product_options (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  label       text not null,                          -- '2.0 L · Premium'
  size        text,                                   -- '2.0 L'
  type        text,                                   -- 'Standard' | 'Premium (milky)'
  price       integer not null check (price >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0
);
create index on public.product_options (product_id);

create table public.availability (
  product_id   uuid not null references public.products(id) on delete cascade,
  location_id  text not null references public.locations(id) on delete cascade,
  sold_out     boolean not null default false,
  primary key (product_id, location_id)
);

create table public.staff (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  role         text not null check (role in ('founder', 'staff')),
  location_id  text references public.locations(id)  -- null = both locations
);

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,               -- 'JV-7K2P', shown to the customer
  tracking_token  uuid not null unique default gen_random_uuid(),  -- private status link
  location_id     text not null references public.locations(id),
  fulfilment      text not null check (fulfilment in ('delivery', 'pickup')),
  status          text not null default 'received'
                  check (status in ('received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  customer_name   text not null,
  phone           text not null,
  address         text,
  landmark        text,
  note            text,
  needed_for      timestamptz,
  subtotal        integer not null check (subtotal >= 0),
  delivery_fee    integer not null default 0 check (delivery_fee >= 0),
  total           integer not null check (total >= 0),
  paid            boolean not null default false,
  payment_method  text check (payment_method in ('cash', 'transfer')),
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id)
);
create index on public.orders (location_id, created_at desc);
create index on public.orders (status);

create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  product_option_id  uuid references public.product_options(id) on delete set null,
  item_name          text not null,                   -- copied at order time
  unit_price         integer not null check (unit_price >= 0),
  quantity           integer not null check (quantity between 1 and 50)
);
create index on public.order_items (order_id);

create table public.basket_enquiries (
  id           uuid primary key default gen_random_uuid(),
  occasion     text not null,
  budget       integer check (budget >= 0),
  date_needed  date,
  location_id  text not null references public.locations(id),
  name         text not null,
  phone        text not null,
  details      text,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helper functions used by the access rules
-- ---------------------------------------------------------------------

create or replace function public.is_founder() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'founder');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- True when the signed-in person may see orders for this location:
-- the founder, staff assigned to both (null), or staff of that location.
create or replace function public.can_see_location(loc text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid()
      and (role = 'founder' or location_id is null or location_id = loc)
  );
$$;

-- Keep updated_at current on every order change
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Access rules (row-level security). Every table is locked by default;
-- these policies open exactly what each person needs.
-- ---------------------------------------------------------------------

alter table public.locations        enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_options  enable row level security;
alter table public.availability     enable row level security;
alter table public.staff            enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.basket_enquiries enable row level security;

-- Menu and locations: everyone can read; only the founder can change.
create policy "read locations" on public.locations for select using (true);
create policy "founder edits locations" on public.locations for all
  using (public.is_founder()) with check (public.is_founder());

create policy "read categories" on public.categories for select using (true);
create policy "founder edits categories" on public.categories for all
  using (public.is_founder()) with check (public.is_founder());

create policy "read active products" on public.products for select
  using (active or public.is_staff());
create policy "founder edits products" on public.products for all
  using (public.is_founder()) with check (public.is_founder());

create policy "read active options" on public.product_options for select
  using (active or public.is_staff());
create policy "founder edits options" on public.product_options for all
  using (public.is_founder()) with check (public.is_founder());

create policy "read availability" on public.availability for select using (true);
create policy "founder edits availability" on public.availability for all
  using (public.is_founder()) with check (public.is_founder());

-- Staff list: each person sees their own row; the founder sees and edits all.
create policy "see own staff row" on public.staff for select
  using (user_id = auth.uid() or public.is_founder());
create policy "founder edits staff" on public.staff for all
  using (public.is_founder()) with check (public.is_founder());

-- Orders: staff see and update their location's orders. Nobody inserts
-- directly; place_order() (milestone 2) does that with checked prices.
create policy "staff read orders" on public.orders for select
  using (public.can_see_location(location_id));
create policy "staff update orders" on public.orders for update
  using (public.can_see_location(location_id))
  with check (public.can_see_location(location_id));
create policy "founder deletes orders" on public.orders for delete
  using (public.is_founder());

create policy "staff read order items" on public.order_items for select
  using (exists (select 1 from public.orders o
                 where o.id = order_id and public.can_see_location(o.location_id)));

create policy "staff read enquiries" on public.basket_enquiries for select
  using (public.can_see_location(location_id));
create policy "staff update enquiries" on public.basket_enquiries for update
  using (public.can_see_location(location_id))
  with check (public.can_see_location(location_id));

-- ---------------------------------------------------------------------
-- Live updates for the staff order board (milestone 3 uses this)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
