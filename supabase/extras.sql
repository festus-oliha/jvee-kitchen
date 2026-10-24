-- =====================================================================
-- JVee Crunch Kitchen · milestone 4: basket enquiries, email alerts, photos
-- Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
--
-- Run after admin.sql: SQL Editor > New query > paste > Run.
-- Safe to run again: no data is lost.
-- =====================================================================

-- Remember which orders and enquiries have had their email alert, so each
-- one is emailed once only, however often the website asks.
alter table public.orders           add column if not exists emailed_at timestamptz;
alter table public.basket_enquiries add column if not exists emailed_at timestamptz;

-- ---------------------------------------------------------------------
-- submit_enquiry: the custom basket form. Customers can't write to the
-- table directly; this checks the details and limits repeat sending.
-- ---------------------------------------------------------------------
create or replace function public.submit_enquiry(p jsonb)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_phone   text := regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g');
  v_name    text := btrim(coalesce(p->>'name', ''));
  v_occ     text := btrim(coalesce(p->>'occasion', ''));
  v_loc     text := p->>'location_id';
  v_budget  integer;
  v_date    date;
  v_id      uuid;
begin
  if not exists (select 1 from public.locations where id = v_loc) then
    raise exception 'Please choose Benin City or Abuja.';
  end if;
  if length(v_occ) < 2 then
    raise exception 'Please tell us the occasion.';
  end if;
  if length(v_name) < 2 then
    raise exception 'Please enter your name.';
  end if;
  if length(v_phone) not between 10 and 15 then
    raise exception 'Please enter a phone number we can call, for example 0803 123 4567.';
  end if;
  begin
    v_budget := nullif(p->>'budget', '')::integer;
  exception when others then
    raise exception 'Please enter the budget as a number of naira, for example 30000.';
  end;
  if v_budget is not null and v_budget not between 1000 and 10000000 then
    raise exception 'Please enter a budget between 1,000 and 10,000,000 naira.';
  end if;
  begin
    v_date := nullif(p->>'date_needed', '')::date;
  exception when others then
    raise exception 'Please choose the date you need it.';
  end;
  if v_date is not null and v_date < (now() at time zone 'Africa/Lagos')::date then
    raise exception 'The date needed is in the past. Please choose another date.';
  end if;
  if (select count(*) from public.basket_enquiries
       where regexp_replace(phone, '\D', '', 'g') = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'We already have your enquiry. We''ll call you soon, or WhatsApp 0805 892 3302.';
  end if;

  insert into public.basket_enquiries (occasion, budget, date_needed, location_id, name, phone, details)
  values (left(v_occ, 80), v_budget, v_date, v_loc, left(v_name, 80), left(btrim(p->>'phone'), 20),
          nullif(left(btrim(coalesce(p->>'details', '')), 1000), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_enquiry(jsonb) from public;
grant execute on function public.submit_enquiry(jsonb) to anon, authenticated;

-- Live updates for the staff enquiries list
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'basket_enquiries'
  ) then
    alter publication supabase_realtime add table public.basket_enquiries;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Product photos: a public storage bucket. Anyone can view the photos;
-- only the founder can upload, replace or delete them.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "founder uploads product photos" on storage.objects;
drop policy if exists "founder updates product photos" on storage.objects;
drop policy if exists "founder deletes product photos" on storage.objects;
drop policy if exists "founder lists product photos" on storage.objects;
create policy "founder lists product photos" on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and public.is_founder());
create policy "founder uploads product photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_founder());
create policy "founder updates product photos" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and public.is_founder());
create policy "founder deletes product photos" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_founder());

-- ---------------------------------------------------------------------
-- find_order: "Track my order" page. Returns the tracking link token only
-- when BOTH the order code and the phone number match, so nobody can look
-- up someone else's order with a code alone. (v0.5.0)
-- ---------------------------------------------------------------------
create or replace function public.find_order(p_code text, p_phone text)
returns uuid
language sql stable security definer set search_path = public as $$
  select tracking_token
    from public.orders
   where code = upper(regexp_replace(btrim(coalesce(p_code, '')), '^(JV)?-?', 'JV-', 'i'))
     and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10
     and right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
   limit 1;
$$;

revoke all on function public.find_order(text, text) from public;
grant execute on function public.find_order(text, text) to anon, authenticated;

-- =====================================================================
-- v0.6.0
-- =====================================================================

-- Delivery is now priced by the rider and paid to the rider on arrival.
-- (ordering.sql no longer adds a fee; this clears the old placeholder fees.)
update public.locations set delivery_fee = 0 where delivery_fee <> 0;

-- First real product photo, shipped with the website (/photos/...).
-- Only fills it in if no photo has been uploaded yet.
update public.products set photo_url = '/photos/veggie-tray-party.webp'
 where slug = 'mixed-veggie-tray' and photo_url is null;

-- ---------------------------------------------------------------------
-- Customer reviews. Only someone holding a completed order's tracking
-- link can review the products in that order (one review per product per
-- order; sending again updates it). Everyone can read reviews that are not
-- hidden; the founder can hide or delete any review.
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text check (length(comment) <= 600),
  name        text not null,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);
alter table public.reviews enable row level security;

drop policy if exists "read visible reviews" on public.reviews;
drop policy if exists "founder moderates reviews" on public.reviews;
drop policy if exists "founder deletes reviews" on public.reviews;
create policy "read visible reviews" on public.reviews for select
  using (not hidden or public.is_staff());
create policy "founder moderates reviews" on public.reviews for update
  using (public.is_founder()) with check (public.is_founder());
create policy "founder deletes reviews" on public.reviews for delete
  using (public.is_founder());

-- Average rating and count per product (visible reviews only)
create or replace view public.product_ratings with (security_invoker = true) as
  select product_id, round(avg(rating)::numeric, 1) as average, count(*)::int as count
    from public.reviews
   where not hidden
   group by product_id;
grant select on public.product_ratings to anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- What the customer can review on their order page
create or replace function public.review_targets(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(t order by t->>'name'), '[]'::jsonb)
    from (
      select distinct on (p.id) jsonb_build_object(
               'product_id', p.id, 'slug', p.slug, 'name', p.name, 'photo_url', p.photo_url, 'category_id', p.category_id,
               'review', (select jsonb_build_object('rating', r.rating, 'comment', r.comment, 'name', r.name, 'hidden', r.hidden)
                            from public.reviews r where r.order_id = o.id and r.product_id = p.id)) as t
        from public.orders o
        join public.order_items i on i.order_id = o.id
        join public.product_options po on po.id = i.product_option_id
        join public.products p on p.id = po.product_id
       where o.tracking_token = p_token and o.status = 'completed'
       order by p.id
    ) x;
$$;

create or replace function public.submit_review(p_token uuid, p_product_id uuid, p_rating integer, p_comment text, p_name text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  v_name text;
begin
  select * into o from public.orders where tracking_token = p_token;
  if not found then
    raise exception 'We couldn''t find that order.';
  end if;
  if o.status <> 'completed' then
    raise exception 'You can review your order once it has been delivered or collected.';
  end if;
  if not exists (select 1 from public.order_items i join public.product_options po on po.id = i.product_option_id
                  where i.order_id = o.id and po.product_id = p_product_id) then
    raise exception 'That item isn''t part of this order.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Please choose from 1 to 5 stars.';
  end if;
  if length(coalesce(p_comment, '')) > 600 then
    raise exception 'Please keep your review under 600 characters.';
  end if;
  v_name := left(coalesce(nullif(btrim(p_name), ''), split_part(o.customer_name, ' ', 1)), 40);

  insert into public.reviews (product_id, order_id, rating, comment, name)
  values (p_product_id, o.id, p_rating, nullif(btrim(coalesce(p_comment, '')), ''), v_name)
  on conflict (order_id, product_id) do update
    set rating = excluded.rating, comment = excluded.comment, name = excluded.name, created_at = now();
end;
$$;

revoke all on function public.review_targets(uuid) from public;
revoke all on function public.submit_review(uuid, uuid, integer, text, text) from public;
grant execute on function public.review_targets(uuid) to anon, authenticated;
grant execute on function public.submit_review(uuid, uuid, integer, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Proteins (v0.6.1): peppered chicken and peppered meat, with photos.
-- They start HIDDEN with no price. To sell them: Admin > Products >
-- Proteins > Edit, enter the real price(s), Save, then switch "On the menu" on.
-- ---------------------------------------------------------------------
update public.categories set sort_order = 6 where id = 'cakes'  and sort_order = 5;
update public.categories set sort_order = 7 where id = 'drinks' and sort_order = 6;
insert into public.categories (id, name, sort_order) values ('proteins', 'Proteins', 5)
on conflict (id) do nothing;

insert into public.products (slug, category_id, name, description, photo_url, active, sort_order) values
  ('peppered-chicken', 'proteins', 'Peppered chicken',
   'Tender chicken, well seasoned and fried, tossed with sweet peppers and onions.',
   '/photos/peppered-chicken.webp', false, 10),
  ('peppered-meat', 'proteins', 'Peppered meat',
   'Spicy peppered meat with red and yellow peppers and fresh onion rings.',
   '/photos/peppered-meat-tray.webp', false, 11)
on conflict (slug) do nothing;

insert into public.product_options (product_id, label, price, sort_order)
select p.id, 'Tray', 0, 1                                       -- PLACEHOLDER price: set it before showing
  from public.products p
 where p.slug in ('peppered-chicken', 'peppered-meat')
   and not exists (select 1 from public.product_options o where o.product_id = p.id);
