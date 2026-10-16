-- =====================================================================
-- JVee Crunch Kitchen · staff admin functions (milestone 3)
-- Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
--
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run again: no data is lost.
--
-- Staff change orders only through these functions, so every change is
-- checked (allowed step, right location) and records who made it.
-- =====================================================================

-- Orders can no longer be edited directly, only through the functions below
drop policy if exists "staff update orders" on public.orders;

-- ---------------------------------------------------------------------
-- next_status: move an order one step on, or cancel it with a reason
--   delivery: received -> preparing -> out_for_delivery -> completed
--   pickup:   received -> preparing -> ready            -> completed
--   cancel:   from received or preparing, reason required
-- ---------------------------------------------------------------------
create or replace function public.next_status(p_order_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  allowed text[];
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not public.can_see_location(o.location_id) then
    raise exception 'That order was not found, or it belongs to the other location.';
  end if;

  allowed := case o.status
    when 'received'         then array['preparing', 'cancelled']
    when 'preparing'        then array[case when o.fulfilment = 'delivery' then 'out_for_delivery' else 'ready' end, 'cancelled']
    when 'ready'            then array['completed']
    when 'out_for_delivery' then array['completed']
    else array[]::text[]
  end;

  if not (p_status = any (allowed)) then
    raise exception 'Order % is "%" and can''t move to "%".', o.code, replace(o.status, '_', ' '), replace(p_status, '_', ' ');
  end if;
  if p_status = 'cancelled' and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Please give a short reason for cancelling. The customer will see it.';
  end if;

  update public.orders
     set status = p_status,
         cancel_reason = case when p_status = 'cancelled' then btrim(p_reason) else cancel_reason end,
         updated_by = auth.uid()
   where id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------
-- set_paid: record that an order was paid, and how
-- ---------------------------------------------------------------------
create or replace function public.set_paid(p_order_id uuid, p_paid boolean, p_method text default null)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not public.can_see_location(o.location_id) then
    raise exception 'That order was not found, or it belongs to the other location.';
  end if;
  if p_paid and coalesce(p_method, '') not in ('cash', 'transfer') then
    raise exception 'Please choose cash or bank transfer.';
  end if;
  update public.orders
     set paid = p_paid,
         payment_method = case when p_paid then p_method end,
         updated_by = auth.uid()
   where id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Staff accounts (founder only)
-- Sign-in accounts are created in Supabase > Authentication > Add user.
-- These functions give an account access to the admin, or take it away.
-- ---------------------------------------------------------------------
create or replace function public.staff_directory()
returns table (user_id uuid, name text, role text, location_id text, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_founder() then
    raise exception 'Only the founder can see the staff list.';
  end if;
  return query
    select s.user_id, s.name, s.role, s.location_id, u.email::text
      from public.staff s join auth.users u on u.id = s.user_id
     order by (s.role = 'founder') desc, s.name;
end;
$$;

create or replace function public.link_staff(p_email text, p_name text, p_role text, p_location text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not public.is_founder() then
    raise exception 'Only the founder can add staff.';
  end if;
  if p_role not in ('founder', 'staff') then
    raise exception 'Role must be founder or staff.';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Please enter the person''s name.';
  end if;
  if p_location is not null and not exists (select 1 from public.locations where id = p_location) then
    raise exception 'Please choose Benin City, Abuja or both.';
  end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then
    raise exception 'No sign-in account uses %. Create it first in Supabase > Authentication > Add user, then add them here.', btrim(p_email);
  end if;
  insert into public.staff (user_id, name, role, location_id)
  values (uid, btrim(p_name), p_role, case when p_role = 'founder' then null else p_location end)
  on conflict (user_id) do update
    set name = excluded.name, role = excluded.role, location_id = excluded.location_id;
end;
$$;

create or replace function public.remove_staff(p_user_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_founder() then
    raise exception 'Only the founder can remove staff.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t remove your own access.';
  end if;
  delete from public.staff where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- make_founder: first-time setup, run by hand in the SQL Editor:
--   select public.make_founder('owner@example.com', 'Ms. O. Osazemen');
-- Not callable from the website.
-- ---------------------------------------------------------------------
create or replace function public.make_founder(p_email text, p_name text)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then
    raise exception 'No sign-in account uses %. Create it first in Authentication > Add user.', p_email;
  end if;
  insert into public.staff (user_id, name, role, location_id) values (uid, btrim(p_name), 'founder', null)
  on conflict (user_id) do update set name = excluded.name, role = 'founder', location_id = null;
  return btrim(p_name) || ' is now the founder and can sign in at /admin';
end;
$$;

-- Who may call what
revoke all on function public.next_status(uuid, text, text) from public, anon;
revoke all on function public.set_paid(uuid, boolean, text) from public, anon;
revoke all on function public.staff_directory() from public, anon;
revoke all on function public.link_staff(text, text, text, text) from public, anon;
revoke all on function public.remove_staff(uuid) from public, anon;
revoke all on function public.make_founder(text, text) from public, anon, authenticated;
grant execute on function public.next_status(uuid, text, text) to authenticated;
grant execute on function public.set_paid(uuid, boolean, text) to authenticated;
grant execute on function public.staff_directory() to authenticated;
grant execute on function public.link_staff(text, text, text, text) to authenticated;
grant execute on function public.remove_staff(uuid) to authenticated;
