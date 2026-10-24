-- =====================================================================
-- JVee Crunch Kitchen · ordering functions (milestone 2)
-- Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
--
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run again: it only replaces these two functions, no data is lost.
--
-- place_order()  - the ONLY way a customer can create an order. It looks up
--                  every price itself, so a changed price in the browser
--                  can never reach the kitchen.
-- order_status() - returns one order to whoever holds its tracking link.
-- =====================================================================

-- Short code shown to customers, e.g. JV-7K2P (no 0/O or 1/I to avoid mix-ups)
create or replace function public.new_order_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'JV-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.orders where code = candidate);
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------
-- place_order(p_order jsonb) -> { code, tracking_token, total }
--
-- p_order = {
--   "location_id": "benin-city",
--   "fulfilment": "delivery" | "pickup",
--   "customer_name": "Adaeze Okafor",
--   "phone": "0803 555 0142",
--   "address": "14 Airport Road, GRA",      -- delivery only
--   "landmark": "Opposite the filling station",
--   "note": "Gift tag: Happy birthday, Mum",
--   "needed_for": "2026-10-20T12:00:00+01:00", -- required when an item needs notice
--   "items": [ { "option_id": "<uuid>", "quantity": 1 }, ... ]
-- }
--
-- Problems the customer can fix are raised with a plain-English message
-- (error code P0001) that the website shows as it is.
-- ---------------------------------------------------------------------
create or replace function public.place_order(p_order jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  loc            public.locations;
  v_fulfilment   text := lower(coalesce(p_order->>'fulfilment', ''));
  v_name         text := btrim(coalesce(p_order->>'customer_name', ''));
  v_phone        text := btrim(coalesce(p_order->>'phone', ''));
  v_digits       text := regexp_replace(coalesce(p_order->>'phone', ''), '\D', '', 'g');
  v_address      text := nullif(btrim(coalesce(p_order->>'address', '')), '');
  v_landmark     text := nullif(btrim(coalesce(p_order->>'landmark', '')), '');
  v_note         text := nullif(btrim(coalesce(p_order->>'note', '')), '');
  v_needed_for   timestamptz;
  v_items        jsonb := coalesce(p_order->'items', '[]'::jsonb);
  item           jsonb;
  v_qty          int;
  opt            record;
  v_notice       int := 0;
  v_subtotal     int := 0;
  v_fee          int := 0;
  v_order_id     uuid;
  v_code         text;
  v_token        uuid;
begin
  -- Location
  select * into loc from public.locations where id = p_order->>'location_id';
  if not found then
    raise exception 'Please choose Benin City or Abuja before ordering.';
  end if;
  if not loc.taking_orders then
    raise exception '% is not taking orders today. Please choose the other location or try again later.', loc.name;
  end if;

  -- Customer details
  if v_fulfilment not in ('delivery', 'pickup') then
    raise exception 'Please choose delivery or pickup.';
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Please enter your name.';
  end if;
  if length(v_digits) < 10 or length(v_digits) > 15 then
    raise exception 'Please enter a phone number with at least 10 digits, for example 0803 123 4567.';
  end if;
  if v_fulfilment = 'delivery' and (v_address is null or length(v_address) < 5) then
    raise exception 'Please enter a delivery address.';
  end if;
  if length(coalesce(v_address, '')) > 200 or length(coalesce(v_landmark, '')) > 120 or length(coalesce(v_note, '')) > 300 then
    raise exception 'Some details are too long. Please shorten the address, landmark or note.';
  end if;

  -- Abuse limit: at most 5 orders per phone number per hour
  if (select count(*) from public.orders
      where regexp_replace(phone, '\D', '', 'g') = v_digits
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'This phone number has placed several orders in the last hour. Please call or WhatsApp us on %.', loc.phone;
  end if;

  -- Items
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;
  if jsonb_array_length(v_items) > 30 then
    raise exception 'That is a very large order. Please call or WhatsApp us on % to arrange it.', loc.phone;
  end if;

  for item in select * from jsonb_array_elements(v_items) loop
    v_qty := coalesce((item->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 50 then
      raise exception 'Quantities must be between 1 and 50.';
    end if;

    select o.id, o.price, o.label, o.active as option_active,
           p.name, p.active as product_active, p.enquiry_only, p.notice_hours,
           coalesce(a.sold_out, false) as sold_out
      into opt
      from public.product_options o
      join public.products p on p.id = o.product_id
      left join public.availability a on a.product_id = p.id and a.location_id = loc.id
     where o.id = (item->>'option_id')::uuid;

    if not found or not opt.option_active or not opt.product_active or opt.enquiry_only then
      raise exception 'One of the items in your cart is no longer on the menu. Please remove it and try again.';
    end if;
    if opt.sold_out then
      raise exception '% is sold out in % today. Please remove it and try again.', opt.name, loc.name;
    end if;

    v_subtotal := v_subtotal + opt.price * v_qty;
    v_notice := greatest(v_notice, opt.notice_hours);
  end loop;

  -- Advance notice (veggie trays need 24 hours). 15 minutes of slack for slow phones.
  if v_notice > 0 then
    begin
      v_needed_for := (p_order->>'needed_for')::timestamptz;
    exception when others then
      v_needed_for := null;
    end;
    if v_needed_for is null then
      raise exception 'Please choose when you need your order. Some items need % hours notice.', v_notice;
    end if;
    if v_needed_for < now() + make_interval(hours => v_notice) - interval '15 minutes' then
      raise exception 'Some items need % hours notice. Please choose a later date.', v_notice;
    end if;
  elsif p_order ? 'needed_for' and nullif(p_order->>'needed_for', '') is not null then
    begin
      v_needed_for := (p_order->>'needed_for')::timestamptz;
    exception when others then
      v_needed_for := null;
    end;
  end if;

  -- Delivery fee: set by the rider for each trip and paid to the rider on
  -- arrival, so it is not part of the website total (v0.6.0).
  v_fee := 0;

  -- Save
  v_code := public.new_order_code();
  insert into public.orders (code, location_id, fulfilment, customer_name, phone, address, landmark, note,
                             needed_for, subtotal, delivery_fee, total)
  values (v_code, loc.id, v_fulfilment, v_name, v_phone,
          case when v_fulfilment = 'delivery' then v_address end,
          case when v_fulfilment = 'delivery' then v_landmark end,
          v_note, v_needed_for, v_subtotal, v_fee, v_subtotal + v_fee)
  returning id, tracking_token into v_order_id, v_token;

  insert into public.order_items (order_id, product_option_id, item_name, unit_price, quantity)
  select v_order_id, o.id,
         case when o.label = p.name or (select count(*) from public.product_options x where x.product_id = p.id) = 1
              then p.name else p.name || ', ' || o.label end,
         o.price, (i->>'quantity')::int
    from jsonb_array_elements(v_items) i
    join public.product_options o on o.id = (i->>'option_id')::uuid
    join public.products p on p.id = o.product_id;

  return jsonb_build_object('code', v_code, 'tracking_token', v_token, 'total', v_subtotal + v_fee);
end;
$$;

-- ---------------------------------------------------------------------
-- order_status(p_token uuid) -> the order behind one tracking link, or null
-- ---------------------------------------------------------------------
create or replace function public.order_status(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code',          o.code,
    'status',        o.status,
    'fulfilment',    o.fulfilment,
    'customer_name', split_part(o.customer_name, ' ', 1),
    'address',       o.address,
    'landmark',      o.landmark,
    'note',          o.note,
    'needed_for',    o.needed_for,
    'subtotal',      o.subtotal,
    'delivery_fee',  o.delivery_fee,
    'total',         o.total,
    'paid',          o.paid,
    'cancel_reason', o.cancel_reason,
    'created_at',    o.created_at,
    'updated_at',    o.updated_at,
    'location',      jsonb_build_object('id', l.id, 'name', l.name, 'address', l.address,
                                        'phone', l.phone, 'bank_details', l.bank_details),
    'items',         coalesce((select jsonb_agg(jsonb_build_object('name', i.item_name, 'unit_price', i.unit_price,
                                                                   'quantity', i.quantity) order by i.item_name)
                                 from public.order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  join public.locations l on l.id = o.location_id
  where o.tracking_token = p_token;
$$;

-- Customers (signed out) and staff may call these two; nothing else.
revoke all on function public.place_order(jsonb) from public;
revoke all on function public.order_status(uuid) from public;
revoke all on function public.new_order_code() from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.order_status(uuid) to anon, authenticated;
