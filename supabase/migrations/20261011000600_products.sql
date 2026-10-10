-- =============================================================================
-- SOKO migration 06 — Supplier catalogue
-- Products belong to supplier companies only. Published products of public,
-- non-suspended companies are readable by anyone (including anonymous).
-- Raw product views are never readable by clients; only aggregates are (07/11).
-- =============================================================================

-- Stamps created_by from the session so it can never be forged by a client.
create or replace function private.stamp_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new := jsonb_populate_record(new, jsonb_build_object('created_by', auth.uid()));
  end if;
  return new;
end $$;

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  company_kind public.company_kind not null default 'supplier' check (company_kind = 'supplier'),
  name         text not null check (char_length(name) between 2 and 200),
  type         text check (char_length(type) <= 80),
  category     text check (char_length(category) <= 120),
  subcategory  text check (char_length(subcategory) <= 120),
  brand        text check (char_length(brand) <= 120),
  description  text check (char_length(description) <= 10000),
  image_paths  text[] not null default '{}' check (cardinality(image_paths) <= 12),
  status       public.product_status not null default 'draft',
  published_at timestamptz,
  search       tsvector generated always as (
                 to_tsvector('simple',
                   coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' ||
                   coalesce(category, '') || ' ' || coalesce(subcategory, '') || ' ' ||
                   coalesce(description, ''))
               ) stored,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (company_id, company_kind) references public.companies (id, kind) on delete cascade
);
create index products_company_status on public.products (company_id, status);
create index products_search on public.products using gin (search);
create index products_category on public.products (category, subcategory) where status = 'published';
create trigger products_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger products_created_by before insert on public.products
  for each row execute function private.stamp_created_by();

create or replace function private.products_published_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end $$;
create trigger products_published_at before insert or update of status on public.products
  for each row execute function private.products_published_at();
select private.attach_audit('public.products');

create table public.product_specs (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label      text not null check (char_length(label) <= 120),
  value      text not null check (char_length(value) <= 500),
  position   smallint not null default 0
);
create index on public.product_specs (product_id, position);

create table public.product_regions (
  product_id uuid not null references public.products (id) on delete cascade,
  region     text not null check (char_length(region) <= 60),
  primary key (product_id, region)
);

create table public.saved_products (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index on public.saved_products (product_id);

-- One row per product, viewer and day. Viewer identity is private to SOKO.
create table public.product_views (
  id                bigint generated always as identity primary key,
  product_id        uuid not null references public.products (id) on delete cascade,
  company_id        uuid not null references public.companies (id) on delete cascade,
  viewer_user_id    uuid references auth.users (id) on delete set null,
  viewer_company_id uuid references public.companies (id) on delete set null,
  viewed_on         date not null default current_date,
  created_at        timestamptz not null default now(),
  unique (product_id, viewer_user_id, viewed_on)
);
create index product_views_company_day on public.product_views (company_id, viewed_on);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.products        enable row level security;
alter table public.product_specs   enable row level security;
alter table public.product_regions enable row level security;
alter table public.saved_products  enable row level security;
alter table public.product_views   enable row level security;

select private.reset_table_grants('public.products');
grant select on public.products to anon, authenticated;
grant insert (company_id, name, type, category, subcategory, brand, description, image_paths, status),
      update (name, type, category, subcategory, brand, description, image_paths, status),
      delete
  on public.products to authenticated;

create policy products_public_read on public.products
  for select to anon, authenticated
  using (status = 'published'
         and exists (select 1 from public.companies c
                     where c.id = company_id and c.is_public and not c.is_suspended));
create policy products_member_read on public.products
  for select to authenticated using (private.is_member(company_id));
create policy products_insert on public.products
  for insert to authenticated with check (private.has_permission(company_id, 'products.manage'));
create policy products_update on public.products
  for update to authenticated
  using (private.has_permission(company_id, 'products.manage'))
  with check (private.has_permission(company_id, 'products.manage'));
create policy products_delete on public.products
  for delete to authenticated using (private.has_permission(company_id, 'records.delete'));

-- Specs and regions follow the parent product (the subquery is itself
-- filtered by products' RLS, so visibility is inherited).
create or replace function private.can_manage_product(p_product uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.products p
                 where p.id = p_product and private.has_permission(p.company_id, 'products.manage'));
$$;
grant execute on function private.can_manage_product(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['product_specs','product_regions'] loop
    perform private.reset_table_grants(format('public.%I', t)::regclass);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format($p$create policy %I on public.%I for select to anon, authenticated
      using (exists (select 1 from public.products p where p.id = product_id))$p$, t || '_read', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (private.can_manage_product(product_id))$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (private.can_manage_product(product_id)) with check (private.can_manage_product(product_id))$p$, t || '_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (private.can_manage_product(product_id))$p$, t || '_delete', t);
  end loop;
end $$;

select private.reset_table_grants('public.saved_products');
grant select, insert, delete on public.saved_products to authenticated;
create policy saved_products_own_read on public.saved_products
  for select to authenticated using (user_id = auth.uid());
create policy saved_products_own_insert on public.saved_products
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id));
create policy saved_products_own_delete on public.saved_products
  for delete to authenticated using (user_id = auth.uid());

-- No client policies at all: written by record_product_view, read by metrics.
select private.reset_table_grants('public.product_views');

create or replace function public.record_product_view(p_product uuid, p_viewer_company uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_company uuid;
begin
  select p.company_id into v_company
  from public.products p join public.companies c on c.id = p.company_id
  where p.id = p_product and p.status = 'published' and c.is_public and not c.is_suspended;
  if v_company is null or private.is_member(v_company) then
    return;  -- unknown product, or a supplier viewing their own catalogue
  end if;
  if p_viewer_company is not null and not private.is_member(p_viewer_company) then
    p_viewer_company := null;
  end if;
  insert into public.product_views (product_id, company_id, viewer_user_id, viewer_company_id)
  values (p_product, v_company, v_uid, p_viewer_company)
  on conflict (product_id, viewer_user_id, viewed_on) do nothing;
end $$;

select private.lock_down_public_functions();
