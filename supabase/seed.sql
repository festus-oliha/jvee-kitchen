-- =====================================================================
-- JVee Crunch Kitchen · launch menu, prices and locations
-- Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
--
-- Run after schema.sql. Prices are whole naira, from the owner's
-- handwritten price list. Lines marked PLACEHOLDER are made up and must
-- be replaced before launch (see the design document, section 6).
-- =====================================================================

-- Locations ------------------------------------------------------------
insert into public.locations (id, name, address, phone, taking_orders, delivery_fee, same_day_cutoff, opening_hours, bank_details, sort_order) values
('benin-city', 'Benin City', '2 Asemota Street, Ekehuan Road, Benin City', '0805 892 3302', true,
  1500,                                                         -- PLACEHOLDER delivery fee
  '14:00',                                                      -- PLACEHOLDER cut-off
  '{"mon":["08:00","18:00"],"tue":["08:00","18:00"],"wed":["08:00","18:00"],"thu":["08:00","18:00"],"fri":["08:00","18:00"],"sat":["08:00","18:00"],"sun":null}',
  'JVee Crunch Kitchen · 0123456789 · Sample Bank',             -- PLACEHOLDER bank details
  1),
('abuja', 'Abuja', '99N Success Street, FHA, Lugbe, Abuja', '0805 892 3302', true,
  2500,                                                         -- PLACEHOLDER delivery fee
  '14:00',                                                      -- PLACEHOLDER cut-off
  '{"mon":["08:00","18:00"],"tue":["08:00","18:00"],"wed":["08:00","18:00"],"thu":["08:00","18:00"],"fri":["08:00","18:00"],"sat":["08:00","18:00"],"sun":null}',
  'JVee Crunch Kitchen · 0123456789 · Sample Bank',             -- PLACEHOLDER bank details
  2);

-- Categories -----------------------------------------------------------
insert into public.categories (id, name, sort_order) values
('chin-chin',     'Chin chin',     1),
('gift-packages', 'Gift packages', 2),
('veggie-trays',  'Veggie trays',  3),
('small-chops',   'Small chops',   4),
('cakes',         'Cakes',         5),
('drinks',        'Drinks',        6);

-- Products ---------------------------------------------------------------
insert into public.products (slug, category_id, name, description, notice_hours, enquiry_only, sort_order) values
('homemade-chin-chin',   'chin-chin',     'Homemade chin chin',       'Crunchy and golden, fried fresh in small batches. Standard or premium milky.', 0, false, 1),
('basic-unique-package', 'gift-packages', 'Basic Unique Package',     '1.5 L or 2 L chin chin, plantain chips, a pack of groundnut or kuli-kuli, and a small treat or chocolate, nicely packaged.', 0, false, 2),
('custom-basket',        'gift-packages', 'Custom occasion basket',   'Birthdays, weddings and thank-yous. Tell us your budget and we build the basket around it.', 0, true, 3),
('mixed-veggie-tray',    'veggie-trays',  'Mixed veggie tray',        'Freshly made with cabbage, carrots, cucumber, sweet corn and lettuce.', 24, false, 4),
('quick-solo-samosa',    'small-chops',   'Quick Solo samosa pack',   'Samosas, ready to share.', 0, false, 5),          -- PLACEHOLDER: count and filling to confirm
('quick-solo',           'small-chops',   'Quick Solo',               'Samosa, puff-puff and peppered chicken.', 0, false, 6),
('naked-fruit-cake',     'cakes',         'Naked fruit cake',         'An 8 inch naked cake finished with fresh fruit.', 0, false, 7),
('sports-drink',         'drinks',        'Sports drink',             'Kept ice-cold with clean solar power.', 0, false, 8),   -- PLACEHOLDER product
('bottled-water',        'drinks',        'Bottled water',            'Kept ice-cold with clean solar power.', 0, false, 9);   -- PLACEHOLDER product

-- Product options (every priced choice) -----------------------------------
-- Chin chin: 5 sizes x 2 types, from the owner's price list
insert into public.product_options (product_id, label, size, type, price, sort_order)
select p.id, v.size || ' · ' || v.type, v.size, v.type, v.price, v.sort_order
from public.products p
cross join (values
  ('1.0 L', 'Standard',         4500,  1), ('1.0 L', 'Premium (milky)',  6000,  2),
  ('1.5 L', 'Standard',         6000,  3), ('1.5 L', 'Premium (milky)',  8000,  4),
  ('2.0 L', 'Standard',         8500,  5), ('2.0 L', 'Premium (milky)', 10000,  6),
  ('2.5 L', 'Standard',        12000,  7), ('2.5 L', 'Premium (milky)', 18000,  8),
  ('5.0 L', 'Standard',        16500,  9), ('5.0 L', 'Premium (milky)', 25000, 10)
) as v(size, type, price, sort_order)
where p.slug = 'homemade-chin-chin';

insert into public.product_options (product_id, label, size, type, price, sort_order)
select p.id, v.label, v.size, null, v.price, v.sort_order
from public.products p
join (values
  ('basic-unique-package', 'With 1.5 L chin chin', '1.5 L', 23000, 1),
  ('basic-unique-package', 'With 2 L chin chin',   '2.0 L', 23000, 2),   -- PLACEHOLDER: owner to confirm if 2 L costs more
  ('mixed-veggie-tray',    'Without eggs',          null,    5000, 1),
  ('mixed-veggie-tray',    'With eggs',             null,    7000, 2),
  ('quick-solo-samosa',    'Samosa pack',           null,    3000, 1),
  ('quick-solo',           'Samosa, puff-puff and peppered chicken', null, 5000, 1),
  ('naked-fruit-cake',     '8 inch',               '8 inch', 15000, 1),
  ('sports-drink',         '50cl',                 '50cl',   1000, 1),   -- PLACEHOLDER price
  ('bottled-water',        '75cl',                 '75cl',    300, 1)    -- PLACEHOLDER price
) as v(slug, label, size, price, sort_order) on v.slug = p.slug;
