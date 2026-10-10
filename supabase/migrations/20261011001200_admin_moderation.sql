-- =============================================================================
-- SOKO migration 12 — Platform administration and moderation
-- Replaces the hardcoded seed arrays in server/routes/admin.ts. Every action
-- here requires private.is_platform_admin(). Platform admins are granted only
-- by the database owner:
--   insert into public.platform_admins (user_id, note) values ('<uuid>', '...');
-- =============================================================================

create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity      text not null check (entity in ('company', 'product', 'opportunity', 'campaign', 'business_card', 'document')),
  entity_id   uuid not null,
  reason      text not null check (char_length(reason) between 3 and 2000),
  status      text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by  uuid references auth.users (id) on delete set null,
  handled_at  timestamptz,
  resolution  text check (char_length(resolution) <= 2000),
  created_at  timestamptz not null default now()
);
create index content_reports_open on public.content_reports (created_at) where status = 'open';
create unique index content_reports_one_open_per_reporter
  on public.content_reports (reporter_id, entity, entity_id) where status = 'open';

create or replace function private.content_reports_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.content_reports r
      where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 day') >= 20 then
    raise exception 'report limit reached' using errcode = '54000';
  end if;
  perform private.notify_platform_admins('report.created',
    jsonb_build_object('entity', new.entity, 'entity_id', new.entity_id));
  return new;
end $$;
create trigger content_reports_rate_limit before insert on public.content_reports
  for each row execute function private.content_reports_rate_limit();

alter table public.content_reports enable row level security;
select private.reset_table_grants('public.content_reports');
grant select on public.content_reports to authenticated;
grant insert (entity, entity_id, reason) on public.content_reports to authenticated;
create policy content_reports_read on public.content_reports
  for select to authenticated using (reporter_id = auth.uid() or private.is_platform_admin());
create policy content_reports_insert on public.content_reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open');

create or replace function private.require_platform_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
  return v_uid;
end $$;

create or replace function public.admin_set_company_suspension(p_company uuid, p_suspended boolean, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_platform_admin();
begin
  if private.is_member(p_company) then
    raise exception 'you cannot moderate a company you belong to' using errcode = '42501';
  end if;
  update public.companies set is_suspended = p_suspended where id = p_company;
  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, diff)
  values (p_company, v_uid, case when p_suspended then 'suspend' else 'unsuspend' end, 'companies',
          p_company::text, jsonb_build_object('reason', left(p_reason, 1000)));
  perform private.notify_permission_holders(p_company, 'team.manage',
    case when p_suspended then 'company.suspended' else 'company.reinstated' end,
    jsonb_build_object('reason', left(p_reason, 1000)));
end $$;

create or replace function public.admin_suspend_campaign(p_campaign uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_platform_admin();
  v_company uuid := private.campaign_company(p_campaign);
begin
  if v_company is null or private.is_member(v_company) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.campaigns
  set status = 'suspended', review_note = left(p_reason, 2000), reviewed_by = v_uid, reviewed_at = now()
  where id = p_campaign and status in ('approved', 'scheduled', 'active', 'paused');
  perform private.notify_permission_holders(v_company, 'campaigns.manage', 'campaign.suspended',
    jsonb_build_object('campaign_id', p_campaign, 'reason', left(p_reason, 1000)));
end $$;

create or replace function public.admin_resolve_report(p_report uuid, p_status text, p_resolution text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_platform_admin();
begin
  if p_status not in ('actioned', 'dismissed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.content_reports
  set status = p_status, handled_by = v_uid, handled_at = now(), resolution = left(p_resolution, 2000)
  where id = p_report and status = 'open';
end $$;

-- Dashboard counters, replacing the hardcoded admin stats endpoint.
create or replace function public.admin_platform_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  return jsonb_build_object(
    'users',                 (select count(*) from public.profiles),
    'companies',             (select count(*) from public.companies),
    'suppliers',             (select count(*) from public.companies where kind = 'supplier'),
    'contractors',           (select count(*) from public.companies where kind = 'contractor'),
    'verified',              (select count(*) from public.companies where verification_status = 'verified'),
    'pending_verifications', (select count(*) from public.company_verifications where status = 'pending'),
    'campaigns_pending',     (select count(*) from public.campaigns where status = 'pending_review'),
    'open_reports',          (select count(*) from public.content_reports where status = 'open'),
    'published_products',    (select count(*) from public.products where status = 'published'));
end $$;

select private.lock_down_public_functions();
