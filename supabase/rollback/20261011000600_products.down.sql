-- Rollback for migration 06 — products. DESTROYS the catalogue.
drop function if exists public.record_product_view(uuid, uuid);
drop table if exists public.product_views cascade;
drop table if exists public.saved_products cascade;
drop table if exists public.product_regions cascade;
drop table if exists public.product_specs cascade;
drop table if exists public.products cascade;
drop function if exists private.can_manage_product(uuid);
drop function if exists private.products_published_at();
drop function if exists private.stamp_created_by();
