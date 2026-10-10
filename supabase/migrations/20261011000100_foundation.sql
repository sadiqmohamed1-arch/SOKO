-- =============================================================================
-- SOKO migration 01 — Foundation
-- Schemas, enums, reference data (permissions, roles, plans) and shared helpers.
--
-- Depends on Supabase-provided objects: schemas `auth` and `storage`, roles
-- `anon`, `authenticated`, `service_role`, and function `auth.uid()`.
-- Contains no secrets, no users and no demo data.
-- =============================================================================

-- `private` holds helper functions. It is NOT exposed through the Data API,
-- so nothing in it can be called as an RPC. Policies still need USAGE on it.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Functions are not executable by PUBLIC unless a migration grants them.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public  revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Enums (values mirror src/data/supplierTypes.ts and marketHubTypes.ts)
-- -----------------------------------------------------------------------------
create type public.company_kind as enum ('supplier', 'contractor');
create type public.membership_status as enum ('active', 'invited', 'pending_approval', 'removed');
create type public.verification_status as enum ('not_submitted', 'pending', 'verified', 'rejected');
create type public.doc_access_level as enum ('admins', 'team', 'technical');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.visit_status as enum (
  'pending-confirmation', 'scheduled', 'checked-in', 'in-meeting',
  'completed', 'cancelled', 'no-show', 'declined'
);
create type public.task_status as enum ('pending', 'in-progress', 'completed');
create type public.vendor_approval_status as enum (
  'not-reviewed', 'under-review', 'approved', 'conditionally-approved', 'rejected', 'suspended'
);
create type public.vendor_doc_status as enum ('submitted', 'missing', 'under-review', 'accepted', 'rejected');
create type public.connection_status as enum ('pending', 'accepted', 'declined', 'blocked');
create type public.opportunity_type as enum (
  'material', 'subcontracting', 'manpower', 'equipment_rental', 'specialist_service',
  'project', 'supply_availability', 'surplus', 'distribution', 'manufacturing', 'partnership'
);
create type public.opportunity_group as enum ('requirements', 'supply', 'projects');
create type public.urgency as enum ('standard', 'high', 'urgent');
create type public.interest_status as enum ('interested', 'under_review', 'connection_requested', 'connected', 'declined');
create type public.campaign_kind as enum ('sourcing', 'promotion');
create type public.campaign_status as enum (
  'draft', 'pending_review', 'approved', 'scheduled', 'active', 'paused', 'completed', 'rejected', 'suspended'
);
create type public.campaign_event_type as enum ('view', 'click', 'interested', 'declined', 'saved', 'report');
create type public.response_availability as enum ('available', 'on_order', 'partial', 'alternative');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled');

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Returns the caller's user id or raises. Used inside trusted RPCs.
create or replace function private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  return v_uid;
end $$;

-- Safe cast for storage path segments; returns null instead of raising.
create or replace function private.try_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;
grant execute on function private.try_uuid(text) to anon, authenticated;

-- Supabase grants ALL on new public tables to anon and authenticated by
-- default. Every table is reset with this and then granted explicitly.
create or replace function private.reset_table_grants(p_table regclass) returns void
language plpgsql set search_path = '' as $$
begin
  execute format('revoke all on table %s from public, anon, authenticated', p_table);
  execute format('grant all on table %s to service_role', p_table);
end $$;

-- Public-schema functions are RPCs. None are callable by anon; every one is
-- callable by authenticated users and performs its own authorization checks.
create or replace function private.lock_down_public_functions() returns void
language plpgsql set search_path = '' as $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- Append-only guard for ledgers and logs.
create or replace function private.forbid_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end $$;

-- -----------------------------------------------------------------------------
-- Reference data: permissions, roles, document access, plans
-- -----------------------------------------------------------------------------
create table public.permissions (
  key         text primary key,
  description text not null
);

create table public.roles (
  company_kind public.company_kind not null,
  key          text not null,
  label        text not null,
  description  text not null default '',
  is_admin     boolean not null default false,
  primary key (company_kind, key)
);

create table public.role_permissions (
  company_kind public.company_kind not null,
  role_key     text not null,
  permission   text not null references public.permissions (key),
  primary key (company_kind, role_key, permission),
  foreign key (company_kind, role_key) references public.roles (company_kind, key) on delete cascade
);

create table public.role_document_access (
  company_kind public.company_kind not null,
  role_key     text not null,
  access_level public.doc_access_level not null,
  primary key (company_kind, role_key, access_level),
  foreign key (company_kind, role_key) references public.roles (company_kind, key) on delete cascade
);

create table public.plans (
  id           text primary key,
  company_kind public.company_kind,          -- null = available to either kind
  label        text not null,
  entitlements jsonb not null default '{}'::jsonb,
  is_default   boolean not null default false
);
create unique index plans_one_default_per_kind on public.plans (company_kind) where is_default;

insert into public.permissions (key, description) values
  ('profile.edit',        'Edit the company profile'),
  ('products.manage',     'Create, edit and publish products'),
  ('documents.view',      'View company documents'),
  ('documents.manage',    'Upload, edit and version company documents'),
  ('documents.share',     'Share documents with other companies'),
  ('contacts.manage',     'Manage private contacts and vendor records'),
  ('campaigns.manage',    'Create and manage Market Hub campaigns'),
  ('visits.manage',       'Schedule and manage visits'),
  ('team.manage',         'Invite, approve, re-role and remove members'),
  ('plan.manage',         'View and manage the subscription'),
  ('records.delete',      'Delete company records'),
  ('vendors.approve',     'Approve, reject or suspend vendors and review compliance'),
  ('opportunities.manage','Post Market Hub opportunities and respond to them');

insert into public.roles (company_kind, key, label, description, is_admin) values
  ('supplier',   'supplier_admin',      'Supplier Admin',       'Full control of the company workspace, team, plan and records.', true),
  ('supplier',   'sales_manager',       'Sales Manager',        'Manages profile, products, buyer relationships, campaigns and document sharing.', false),
  ('supplier',   'sales_rep',           'Sales Representative', 'Handles authorised buyer interactions and visits.', false),
  ('supplier',   'technical_manager',   'Technical Manager',    'Maintains product information and technical documents.', false),
  ('supplier',   'viewer',              'Viewer',               'Read-only access to the company workspace.', false),
  ('contractor', 'contractor_admin',    'Company Admin',        'Full company administration, membership management and vendor oversight.', true),
  ('contractor', 'procurement_manager', 'Procurement Manager',  'Vendor registration, reviews, approvals, sourcing, contacts and visits.', false),
  ('contractor', 'procurement_officer', 'Buyer / Procurement',  'Vendor records, sourcing opportunities and contacts. No approval authority.', false),
  ('contractor', 'project_manager',     'Project Manager',      'Project-related visits and vendor interactions.', false),
  ('contractor', 'viewer',              'Viewer',               'Read-only access to permitted company information.', false);

insert into public.role_permissions (company_kind, role_key, permission)
select r.kind::public.company_kind, r.role_key, unnest(r.perms)
from (values
  ('supplier',   'supplier_admin',      array['profile.edit','products.manage','documents.view','documents.manage','documents.share','contacts.manage','campaigns.manage','visits.manage','team.manage','plan.manage','records.delete','opportunities.manage']),
  ('supplier',   'sales_manager',       array['profile.edit','products.manage','documents.view','documents.share','contacts.manage','campaigns.manage','visits.manage','opportunities.manage']),
  ('supplier',   'sales_rep',           array['documents.view','contacts.manage','visits.manage','opportunities.manage']),
  ('supplier',   'technical_manager',   array['products.manage','documents.view','documents.manage']),
  ('contractor', 'contractor_admin',    array['profile.edit','products.manage','documents.view','documents.manage','documents.share','contacts.manage','campaigns.manage','visits.manage','team.manage','plan.manage','records.delete','vendors.approve','opportunities.manage']),
  ('contractor', 'procurement_manager', array['profile.edit','products.manage','documents.view','documents.share','contacts.manage','campaigns.manage','visits.manage','vendors.approve','opportunities.manage']),
  ('contractor', 'procurement_officer', array['documents.view','contacts.manage','visits.manage','opportunities.manage']),
  ('contractor', 'project_manager',     array['documents.view','visits.manage','opportunities.manage'])
) as r(kind, role_key, perms);

insert into public.role_document_access (company_kind, role_key, access_level)
select r.kind::public.company_kind, r.role_key, unnest(r.levels)::public.doc_access_level
from (values
  ('supplier',   'supplier_admin',      array['admins','team','technical']),
  ('supplier',   'sales_manager',       array['team','technical']),
  ('supplier',   'sales_rep',           array['team']),
  ('supplier',   'technical_manager',   array['team','technical']),
  ('supplier',   'viewer',              array['team']),
  ('contractor', 'contractor_admin',    array['admins','team','technical']),
  ('contractor', 'procurement_manager', array['team','technical']),
  ('contractor', 'procurement_officer', array['team']),
  ('contractor', 'project_manager',     array['team','technical']),
  ('contractor', 'viewer',              array['team'])
) as r(kind, role_key, levels);

-- Entitlements mirror PLANS in src/data/marketHubCatalog.ts.
-- storageMb is NOT in the app today and is a placeholder pending approval.
insert into public.plans (id, company_kind, label, is_default, entitlements) values
  ('free_supplier', 'supplier', 'Free Supplier', true,
   '{"postOpportunity":true,"expressInterest":true,"receiveSourcing":true,"receivePromotions":false,"createSourcingCampaign":false,"createPromoCampaign":false,"campaignAnalytics":false,"monthlyCredits":0,"maxLaunchesPer7Days":0,"multipleCampaignUsers":false,"approvalWorkflow":false,"storageMb":500}'),
  ('supplier_pro', 'supplier', 'Supplier Pro', false,
   '{"postOpportunity":true,"expressInterest":true,"receiveSourcing":true,"receivePromotions":false,"createSourcingCampaign":false,"createPromoCampaign":true,"campaignAnalytics":true,"monthlyCredits":100,"maxLaunchesPer7Days":3,"multipleCampaignUsers":false,"approvalWorkflow":false,"storageMb":5000}'),
  ('free_contractor', 'contractor', 'Free Contractor', true,
   '{"postOpportunity":true,"expressInterest":true,"receiveSourcing":true,"receivePromotions":true,"createSourcingCampaign":false,"createPromoCampaign":false,"campaignAnalytics":false,"monthlyCredits":0,"maxLaunchesPer7Days":0,"multipleCampaignUsers":false,"approvalWorkflow":false,"storageMb":500}'),
  ('contractor_premium', 'contractor', 'Contractor Premium', false,
   '{"postOpportunity":true,"expressInterest":true,"receiveSourcing":true,"receivePromotions":true,"createSourcingCampaign":true,"createPromoCampaign":false,"campaignAnalytics":true,"monthlyCredits":150,"maxLaunchesPer7Days":4,"multipleCampaignUsers":false,"approvalWorkflow":false,"storageMb":5000}'),
  ('enterprise', null, 'Enterprise', false,
   '{"postOpportunity":true,"expressInterest":true,"receiveSourcing":true,"receivePromotions":true,"createSourcingCampaign":true,"createPromoCampaign":true,"campaignAnalytics":true,"monthlyCredits":500,"maxLaunchesPer7Days":12,"multipleCampaignUsers":true,"approvalWorkflow":true,"storageMb":50000}');

-- Reference tables are readable by everyone and writable by nobody but the
-- migration owner / service role.
do $$
declare t text;
begin
  foreach t in array array['permissions','roles','role_permissions','role_document_access','plans'] loop
    execute format('alter table public.%I enable row level security', t);
    perform private.reset_table_grants(format('public.%I', t)::regclass);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read_all', t);
  end loop;
end $$;

select private.lock_down_public_functions();
