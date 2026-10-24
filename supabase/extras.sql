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
