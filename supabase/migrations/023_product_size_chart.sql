-- 023: optional per-product size chart (client request, 2026-11-10).
--
-- One nullable jsonb column on `products`; no new table. All numbers stored in
-- the chart are INCHES only — the storefront converts them to centimetres for
-- display.
--
-- Shape:
--   {
--     "title": "Waistcoat",
--     "columns": ["XS", "S", "M", "L", "XL", "XXL"],
--     "rows": [
--       { "label": "Chest", "values": ["47", "49.5", "52.1", "54.6", "57.1", "59.7"] }
--     ],
--     "notes": "plain text, one note per line"
--   }
--
-- A product with no chart keeps NULL, which is what the storefront reads as
-- "no Size Chart link". The existing table-level grants already cover new
-- columns, so no extra GRANT is needed.

alter table public.products
  add column if not exists size_chart jsonb default null;

comment on column public.products.size_chart is
  'Optional size chart JSON: {title, columns[], rows[{label, values[]}], notes}. Measurements are inches; CM is derived for display.';
