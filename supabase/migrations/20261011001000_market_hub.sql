-- =============================================================================
-- SOKO migration 10 — Market Hub
-- Opportunities (owned by a company OR a personal buyer), interests and
-- connection approval, campaigns with credit spend and SOKO review, targeted
-- delivery, responses and events.
--
-- Publisher identity and contact details are NOT selectable columns. They are
-- returned only by get_opportunity_details, which applies the confidentiality
-- and "contact on connection" rules.
-- =============================================================================

create or replace function private.notify_platform_admins(p_type text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload)
  select pa.user_id, p_type, coalesce(p_payload, '{}'::jsonb) from public.platform_admins pa;
$$;

-- -----------------------------------------------------------------------------
-- Opportunities
-- -----------------------------------------------------------------------------
create table public.opportunities (
  id                 uuid primary key default gen_random_uuid(),
  owner_company_id   uuid references public.companies (id) on delete cascade,
  owner_user_id      uuid references auth.users (id) on delete cascade,
  type               public.opportunity_type not null,
  opp_group          public.opportunity_group not null,
  urgency            public.urgency not null default 'standard',
  title              text not null check (char_length(title) between 3 and 200),
  category           text check (char_length(category) <= 120),
  subcategory        text check (char_length(subcategory) <= 120),
  location           text check (char_length(location) <= 120),
  description        text not null check (char_length(description) <= 5000),
  scope              text check (char_length(scope) <= 5000),
  required_by        date,
  response_deadline  date,
  identity           text not null default 'public' check (identity in ('public', 'confidential')),
  contact_visibility text not null default 'on_connection' check (contact_visibility in ('on_connection', 'members')),
  contact_name       text check (char_length(contact_name) <= 120),
  contact_email      text check (char_length(contact_email) <= 254),
  contact_phone      text check (char_length(contact_phone) <= 40),
  project_name       text check (char_length(project_name) <= 200),
  attachment_name    text check (char_length(attachment_name) <= 255),
  status             text not null default 'open' check (status in ('open', 'closed')),
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((owner_company_id is null) <> (owner_user_id is null))
);
create index opportunities_open on public.opportunities (opp_group, created_at desc) where status = 'open';
create index on public.opportunities (owner_company_id);
create index on public.opportunities (owner_user_id);
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function private.set_updated_at();
create trigger opportunities_created_by before insert on public.opportunities
  for each row execute function private.stamp_created_by();

-- Personal opportunities are always owned by the caller; company ones never
-- carry a personal owner. Also enforces the plan flag and a daily limit.
create or replace function private.opportunity_owner_defaults() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_company_id is null then
    new.owner_user_id := auth.uid();
  else
    new.owner_user_id := null;
    if not private.entitled(new.owner_company_id, 'postOpportunity') then
      raise exception 'your plan does not allow posting opportunities' using errcode = '42501';
    end if;
  end if;
  if (select count(*) from public.opportunities o
      where o.created_by = auth.uid() and o.created_at > now() - interval '1 day') >= 20 then
    raise exception 'opportunity posting limit reached' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger opportunities_owner_defaults before insert on public.opportunities
  for each row execute function private.opportunity_owner_defaults();

create table public.opportunity_interests (
  id                   uuid primary key default gen_random_uuid(),
  opportunity_id       uuid not null references public.opportunities (id) on delete cascade,
  responder_user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  responder_company_id uuid references public.companies (id) on delete cascade,
  message              text check (char_length(message) <= 2000),
  status               public.interest_status not null default 'interested',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index opportunity_interests_one_per_responder
  on public.opportunity_interests (opportunity_id, coalesce(responder_company_id, responder_user_id));
create index on public.opportunity_interests (responder_user_id);
create trigger opportunity_interests_updated_at before update on public.opportunity_interests
  for each row execute function private.set_updated_at();

create table public.saved_opportunities (
  user_id        uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- -----------------------------------------------------------------------------
-- Campaigns
-- -----------------------------------------------------------------------------
create table public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null references public.companies (id) on delete cascade,
  kind             public.campaign_kind not null,
  promo_type       text check (promo_type in ('new_product','special_offer','stock_availability','catalogue',
                                              'technical_solution','manufacturing_capability',
                                              'distribution_opportunity','service_promotion')),
  title            text not null check (char_length(title) between 3 and 200),
  body             text not null check (char_length(body) <= 5000),
  status           public.campaign_status not null default 'draft',
  audience_filter  jsonb not null default '{}'::jsonb,
  budget_credits   integer not null default 0 check (budget_credits between 0 and 100000),
  starts_at        timestamptz,
  ends_at          timestamptz,
  submitted_at     timestamptz,
  reviewed_by      uuid references auth.users (id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text check (char_length(review_note) <= 2000),
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (kind <> 'promotion' or promo_type is not null)
);
create index on public.campaigns (owner_company_id, status);
create index campaigns_due on public.campaigns (starts_at) where status = 'scheduled';
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function private.set_updated_at();
create trigger campaigns_created_by before insert on public.campaigns
  for each row execute function private.stamp_created_by();
select private.attach_audit('public.campaigns');

create table public.campaign_recipients (
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  company_id   uuid references public.companies (id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index on public.campaign_recipients (user_id);

create table public.campaign_responses (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.campaigns (id) on delete cascade,
  responder_user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  responder_company_id uuid references public.companies (id) on delete set null,
  availability         public.response_availability,
  message              text check (char_length(message) <= 2000),
  share_identity       boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (campaign_id, responder_user_id)
);

create table public.campaign_events (
  id                bigint generated always as identity primary key,
  campaign_id       uuid not null references public.campaigns (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  type              public.campaign_event_type not null,
  share_identity    boolean not null default false,
  reason            text check (char_length(reason) <= 500),
  event_day         date not null default current_date,
  at                timestamptz not null default now(),
  unique (campaign_id, recipient_user_id, type, event_day)
);
create index campaign_events_campaign_at on public.campaign_events (campaign_id, at);
create trigger campaign_events_no_update before update on public.campaign_events
  for each row execute function private.forbid_mutation();

create table public.buyer_preferences (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  categories         text[] not null default '{}' check (cardinality(categories) <= 50),
  emirates           text[] not null default '{}' check (cardinality(emirates) <= 10),
  receive_promotions boolean not null default false,   -- opt-in
  receive_sourcing   boolean not null default true,
  updated_at         timestamptz not null default now()
);
create trigger buyer_preferences_updated_at before update on public.buyer_preferences
  for each row execute function private.set_updated_at();

create table public.supplier_mutes (
  user_id             uuid not null references auth.users (id) on delete cascade,
  supplier_company_id uuid not null references public.companies (id) on delete cascade,
  created_at          timestamptz not null default now(),
  primary key (user_id, supplier_company_id)
);

-- -----------------------------------------------------------------------------
-- Predicates
-- -----------------------------------------------------------------------------
create or replace function private.is_opportunity_member(p_opportunity uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o
                 where o.id = p_opportunity
                   and (o.owner_user_id = auth.uid() or private.is_member(o.owner_company_id)));
$$;

create or replace function private.is_opportunity_manager(p_opportunity uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o
                 where o.id = p_opportunity
                   and (o.owner_user_id = auth.uid()
                        or private.has_permission(o.owner_company_id, 'opportunities.manage')));
$$;

create or replace function private.can_express_interest(p_opportunity uuid, p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o
                 where o.id = p_opportunity and o.status = 'open'
                   and not private.is_opportunity_member(o.id)
                   and (p_company is null or o.owner_company_id is distinct from p_company))
     and (p_company is null
          or (private.has_permission(p_company, 'opportunities.manage')
              and private.entitled(p_company, 'expressInterest')));
$$;

create or replace function private.is_campaign_recipient(p_campaign uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaign_recipients r join public.campaigns c on c.id = r.campaign_id
                 where r.campaign_id = p_campaign and r.user_id = auth.uid() and c.status = 'active');
$$;

create or replace function private.campaign_company(p_campaign uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select c.owner_company_id from public.campaigns c where c.id = p_campaign;
$$;

grant execute on function private.is_opportunity_member(uuid) to authenticated;
grant execute on function private.is_opportunity_manager(uuid) to authenticated;
grant execute on function private.can_express_interest(uuid, uuid) to authenticated;
grant execute on function private.is_campaign_recipient(uuid) to authenticated;
grant execute on function private.campaign_company(uuid) to authenticated;

-- Connected Market Hub parties become counterparties too.
create or replace function private.is_counterparty(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.visits v
      where (v.host_company_id = p_company and private.is_member(v.supplier_company_id))
         or (v.supplier_company_id = p_company and private.is_member(v.host_company_id)))
    or exists (
      select 1 from public.document_shares s
      where s.revoked_at is null
        and ((s.owner_company_id = p_company and private.is_member(s.recipient_company_id))
          or (s.recipient_company_id = p_company and private.is_member(s.owner_company_id))))
    or exists (
      select 1 from public.vendor_records vr
      where (vr.supplier_company_id = p_company and private.is_member(vr.contractor_company_id))
         or (vr.contractor_company_id = p_company and private.is_member(vr.supplier_company_id)))
    or exists (
      select 1 from public.opportunity_interests i join public.opportunities o on o.id = i.opportunity_id
      where i.status = 'connected'
        and ((o.owner_company_id = p_company and (i.responder_user_id = auth.uid() or private.is_member(i.responder_company_id)))
          or (i.responder_company_id = p_company and (o.owner_user_id = auth.uid() or private.is_member(o.owner_company_id)))));
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.opportunities         enable row level security;
alter table public.opportunity_interests enable row level security;
alter table public.saved_opportunities   enable row level security;
alter table public.campaigns             enable row level security;
alter table public.campaign_recipients   enable row level security;
alter table public.campaign_responses    enable row level security;
alter table public.campaign_events       enable row level security;
alter table public.buyer_preferences     enable row level security;
alter table public.supplier_mutes        enable row level security;

select private.reset_table_grants('public.opportunities');
grant select (id, type, opp_group, urgency, title, category, subcategory, location, description, scope,
              required_by, response_deadline, identity, contact_visibility, project_name, attachment_name,
              status, created_at, updated_at)
  on public.opportunities to authenticated;
grant insert (owner_company_id, type, opp_group, urgency, title, category, subcategory, location, description,
              scope, required_by, response_deadline, identity, contact_visibility, contact_name, contact_email,
              contact_phone, project_name, attachment_name),
      update (urgency, title, category, subcategory, location, description, scope, required_by,
              response_deadline, identity, contact_visibility, contact_name, contact_email, contact_phone,
              project_name, attachment_name, status),
      delete
  on public.opportunities to authenticated;
create policy opportunities_read on public.opportunities
  for select to authenticated using (status = 'open' or private.is_opportunity_member(id));
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check ((owner_company_id is null and owner_user_id = auth.uid())
              or (owner_user_id is null and private.has_permission(owner_company_id, 'opportunities.manage')));
create policy opportunities_update on public.opportunities
  for update to authenticated
  using (private.is_opportunity_manager(id)) with check (private.is_opportunity_manager(id));
create policy opportunities_delete on public.opportunities
  for delete to authenticated using (private.is_opportunity_manager(id));

select private.reset_table_grants('public.opportunity_interests');
grant select, delete on public.opportunity_interests to authenticated;
grant insert (opportunity_id, responder_company_id, message), update (message)
  on public.opportunity_interests to authenticated;
create policy interests_read on public.opportunity_interests
  for select to authenticated
  using (responder_user_id = auth.uid() or private.is_member(responder_company_id)
         or private.is_opportunity_member(opportunity_id));
create policy interests_insert on public.opportunity_interests
  for insert to authenticated
  with check (responder_user_id = auth.uid() and status = 'interested'
              and private.can_express_interest(opportunity_id, responder_company_id));
create policy interests_update_message on public.opportunity_interests
  for update to authenticated
  using (responder_user_id = auth.uid() and status = 'interested')
  with check (responder_user_id = auth.uid());
create policy interests_withdraw on public.opportunity_interests
  for delete to authenticated using (responder_user_id = auth.uid());

select private.reset_table_grants('public.saved_opportunities');
grant select, insert, delete on public.saved_opportunities to authenticated;
create policy saved_opportunities_own_read on public.saved_opportunities
  for select to authenticated using (user_id = auth.uid());
create policy saved_opportunities_own_insert on public.saved_opportunities
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy saved_opportunities_own_delete on public.saved_opportunities
  for delete to authenticated using (user_id = auth.uid());

-- Campaign status, review and submission columns are never client-writable.
select private.reset_table_grants('public.campaigns');
grant select, delete on public.campaigns to authenticated;
grant insert (owner_company_id, kind, promo_type, title, body, audience_filter, budget_credits, starts_at, ends_at),
      update (promo_type, title, body, audience_filter, budget_credits, starts_at, ends_at)
  on public.campaigns to authenticated;
create policy campaigns_read on public.campaigns
  for select to authenticated
  using (private.is_member(owner_company_id) or private.is_platform_admin()
         or private.is_campaign_recipient(id));
create policy campaigns_insert on public.campaigns
  for insert to authenticated
  with check (status = 'draft' and private.has_permission(owner_company_id, 'campaigns.manage'));
create policy campaigns_update_draft on public.campaigns
  for update to authenticated
  using (status in ('draft', 'rejected') and private.has_permission(owner_company_id, 'campaigns.manage'))
  with check (status in ('draft', 'rejected') and private.has_permission(owner_company_id, 'campaigns.manage'));
create policy campaigns_delete_draft on public.campaigns
  for delete to authenticated
  using (status in ('draft', 'rejected') and private.has_permission(owner_company_id, 'campaigns.manage'));

select private.reset_table_grants('public.campaign_recipients');
grant select on public.campaign_recipients to authenticated;
create policy campaign_recipients_read on public.campaign_recipients
  for select to authenticated
  using (user_id = auth.uid() or private.has_permission(private.campaign_company(campaign_id), 'campaigns.manage'));

-- Owners read responses only through get_campaign_responses (identity masking).
select private.reset_table_grants('public.campaign_responses');
grant select, delete on public.campaign_responses to authenticated;
grant insert (campaign_id, responder_company_id, availability, message, share_identity)
  on public.campaign_responses to authenticated;
create policy campaign_responses_read_own on public.campaign_responses
  for select to authenticated using (responder_user_id = auth.uid());
create policy campaign_responses_insert on public.campaign_responses
  for insert to authenticated
  with check (responder_user_id = auth.uid() and private.is_campaign_recipient(campaign_id)
              and (responder_company_id is null or private.is_member(responder_company_id)));
create policy campaign_responses_delete_own on public.campaign_responses
  for delete to authenticated using (responder_user_id = auth.uid());

select private.reset_table_grants('public.campaign_events');

do $$
declare t text;
begin
  foreach t in array array['buyer_preferences','supplier_mutes'] loop
    perform private.reset_table_grants(format('public.%I', t)::regclass);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
                   t || '_own', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Opportunity RPCs
-- -----------------------------------------------------------------------------
create or replace function public.get_opportunity_details(p_opportunity uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  o public.opportunities%rowtype;
  v_mine boolean;
  v_connected boolean;
  v_publisher text;
  v_my_interest jsonb;
begin
  select * into o from public.opportunities where id = p_opportunity;
  if o.id is null then
    return null;
  end if;
  v_mine := private.is_opportunity_member(o.id);
  if o.status <> 'open' and not v_mine then
    return null;
  end if;

  select jsonb_build_object('status', i.status, 'message', i.message) into v_my_interest
  from public.opportunity_interests i
  where i.opportunity_id = o.id and (i.responder_user_id = v_uid or private.is_member(i.responder_company_id))
  order by (i.responder_user_id = v_uid) desc limit 1;

  v_connected := coalesce(v_my_interest ->> 'status', '') = 'connected';

  if o.identity = 'public' or v_mine or v_connected then
    select coalesce(c.trading_name, c.legal_name) into v_publisher from public.companies c where c.id = o.owner_company_id;
    if v_publisher is null then
      select nullif(p.full_name, '') into v_publisher from public.profiles p where p.id = o.owner_user_id;
    end if;
  end if;

  return jsonb_build_object(
    'id', o.id,
    'is_mine', v_mine,
    'is_confidential', o.identity = 'confidential',
    'publisher_display', coalesce(v_publisher, 'Confidential publisher'),
    'contact', case when v_mine or v_connected or o.contact_visibility = 'members'
                    then jsonb_build_object('name', o.contact_name, 'email', o.contact_email, 'phone', o.contact_phone)
               end,
    'interested_count', (select count(*) from public.opportunity_interests i where i.opportunity_id = o.id),
    'my_interest', v_my_interest
  );
end $$;

create or replace function public.my_opportunity_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select o.id from public.opportunities o
  where o.owner_user_id = auth.uid() or private.is_member(o.owner_company_id);
$$;

-- Owner side: under_review | connected | declined. Responder: connection_requested.
create or replace function public.set_interest_status(p_interest uuid, p_status public.interest_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  i public.opportunity_interests%rowtype;
  v_owner_side boolean;
  v_responder_side boolean;
begin
  select * into i from public.opportunity_interests where id = p_interest for update;
  if i.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_owner_side := private.is_opportunity_manager(i.opportunity_id);
  v_responder_side := i.responder_user_id = v_uid
                      or private.has_permission(i.responder_company_id, 'opportunities.manage');

  if not (
       (v_owner_side and p_status in ('under_review', 'connected', 'declined') and i.status <> 'declined')
    or (v_responder_side and not v_owner_side and p_status = 'connection_requested'
        and i.status in ('interested', 'under_review'))
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.opportunity_interests set status = p_status where id = p_interest;

  if v_owner_side then
    perform private.notify(i.responder_user_id, i.responder_company_id, 'opportunity.interest_' || p_status::text,
      jsonb_build_object('interest_id', i.id, 'opportunity_id', i.opportunity_id));
  else
    perform private.notify(o.owner_user_id, o.owner_company_id, 'opportunity.connection_requested',
      jsonb_build_object('interest_id', i.id, 'opportunity_id', i.opportunity_id))
    from public.opportunities o where o.id = i.opportunity_id and o.owner_user_id is not null;
    perform private.notify_permission_holders(o.owner_company_id, 'opportunities.manage', 'opportunity.connection_requested',
      jsonb_build_object('interest_id', i.id, 'opportunity_id', i.opportunity_id))
    from public.opportunities o where o.id = i.opportunity_id and o.owner_company_id is not null;
  end if;
end $$;

create or replace function private.interest_created_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o public.opportunities%rowtype;
begin
  select * into o from public.opportunities where id = new.opportunity_id;
  if o.owner_user_id is not null then
    perform private.notify(o.owner_user_id, null, 'opportunity.interest',
      jsonb_build_object('interest_id', new.id, 'opportunity_id', o.id));
  else
    perform private.notify_permission_holders(o.owner_company_id, 'opportunities.manage', 'opportunity.interest',
      jsonb_build_object('interest_id', new.id, 'opportunity_id', o.id));
  end if;
  return new;
end $$;
create trigger opportunity_interests_notify after insert on public.opportunity_interests
  for each row execute function private.interest_created_notify();

-- -----------------------------------------------------------------------------
-- Campaign RPCs
-- -----------------------------------------------------------------------------
-- Checks plan entitlement and weekly launch limit, then spends the budget.
create or replace function public.submit_campaign(p_campaign uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  c public.campaigns%rowtype;
  v_kind public.company_kind;
  v_recent integer;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  if c.id is null or not private.has_permission(c.owner_company_id, 'campaigns.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if c.status not in ('draft', 'rejected') then
    raise exception 'campaign has already been submitted' using errcode = '22023';
  end if;
  select co.kind into v_kind from public.companies co where co.id = c.owner_company_id;
  if (c.kind = 'promotion' and (v_kind <> 'supplier' or not private.entitled(c.owner_company_id, 'createPromoCampaign')))
     or (c.kind = 'sourcing' and (v_kind <> 'contractor' or not private.entitled(c.owner_company_id, 'createSourcingCampaign'))) then
    raise exception 'your plan does not include this campaign type' using errcode = '42501';
  end if;
  if c.budget_credits <= 0 then
    raise exception 'campaign budget must be positive' using errcode = '22023';
  end if;
  select count(*) into v_recent from public.campaigns x
  where x.owner_company_id = c.owner_company_id and x.submitted_at > now() - interval '7 days'
    and x.status not in ('draft', 'rejected');
  if v_recent >= private.entitlement_int(c.owner_company_id, 'maxLaunchesPer7Days') then
    raise exception 'weekly campaign launch limit reached' using errcode = '54000';
  end if;

  perform private.spend_credits(c.owner_company_id, c.budget_credits, 'campaign_launch', c.id);
  update public.campaigns set status = 'pending_review', submitted_at = now(),
         reviewed_by = null, reviewed_at = null, review_note = null
  where id = c.id;
  perform private.notify_platform_admins('campaign.pending_review', jsonb_build_object('campaign_id', c.id));
end $$;

-- SOKO moderation. Rejection refunds the budget.
create or replace function public.review_campaign(p_campaign uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  c public.campaigns%rowtype;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
  select * into c from public.campaigns where id = p_campaign for update;
  if c.id is null or c.status <> 'pending_review' then
    raise exception 'campaign is not pending review' using errcode = '22023';
  end if;
  if private.is_member(c.owner_company_id) then
    raise exception 'you cannot review your own company''s campaign' using errcode = '42501';
  end if;
  update public.campaigns
  set status = case when p_approve then 'scheduled'::public.campaign_status else 'rejected'::public.campaign_status end,
      reviewed_by = v_uid, reviewed_at = now(), review_note = left(p_note, 2000)
  where id = c.id;
  if not p_approve then
    perform private.add_credits(c.owner_company_id, c.budget_credits, 'campaign_refund', c.id);
  end if;
  perform private.notify_permission_holders(c.owner_company_id, 'campaigns.manage',
    case when p_approve then 'campaign.approved' else 'campaign.rejected' end,
    jsonb_build_object('campaign_id', c.id, 'note', p_note));
end $$;

-- Owner controls after approval: pause, resume, complete.
create or replace function public.set_campaign_status(p_campaign uuid, p_status public.campaign_status) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns%rowtype;
begin
  perform private.require_user();
  select * into c from public.campaigns where id = p_campaign for update;
  if c.id is null or not private.has_permission(c.owner_company_id, 'campaigns.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not ((c.status = 'active' and p_status in ('paused', 'completed'))
       or (c.status = 'paused' and p_status in ('active', 'completed'))) then
    raise exception 'transition % -> % is not allowed', c.status, p_status using errcode = '42501';
  end if;
  update public.campaigns set status = p_status where id = c.id;
end $$;

create or replace function public.record_campaign_event(
  p_campaign uuid, p_type public.campaign_event_type, p_share_identity boolean default false, p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if not private.is_campaign_recipient(p_campaign) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.campaign_events (campaign_id, recipient_user_id, type, share_identity, reason)
  values (p_campaign, v_uid, p_type, coalesce(p_share_identity, false), left(p_reason, 500))
  on conflict (campaign_id, recipient_user_id, type, event_day) do nothing;
  if p_type = 'report' and found then
    perform private.notify_platform_admins('campaign.reported',
      jsonb_build_object('campaign_id', p_campaign, 'reason', left(p_reason, 500)));
  end if;
end $$;

create or replace function public.get_campaign_stats(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_company uuid := private.campaign_company(p_campaign);
begin
  perform private.require_user();
  if v_company is null or not private.is_member(v_company)
     or not private.entitled(v_company, 'campaignAnalytics') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'recipients', (select count(*) from public.campaign_recipients r where r.campaign_id = p_campaign),
    'responses',  (select count(*) from public.campaign_responses r where r.campaign_id = p_campaign),
    'events', coalesce((select jsonb_object_agg(t.type, t.n)
                        from (select e.type, count(*) as n from public.campaign_events e
                              where e.campaign_id = p_campaign group by e.type) t), '{}'::jsonb));
end $$;

-- Responder identity is revealed only when the responder chose to share it.
create or replace function public.get_campaign_responses(p_campaign uuid)
returns table (id uuid, availability public.response_availability, message text, created_at timestamptz,
               responder_name text, responder_company text, responder_company_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.has_permission(private.campaign_company(p_campaign), 'campaigns.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select r.id, r.availability, r.message, r.created_at,
         case when r.share_identity then p.full_name end,
         case when r.share_identity then coalesce(co.trading_name, co.legal_name) end,
         case when r.share_identity then r.responder_company_id end
  from public.campaign_responses r
  left join public.profiles p on p.id = r.responder_user_id
  left join public.companies co on co.id = r.responder_company_id
  where r.campaign_id = p_campaign
  order by r.created_at desc;
end $$;

-- Scheduled job (service role / pg_cron): activates due campaigns, delivers
-- them to the matching audience, and completes campaigns past their end date.
create or replace function private.activate_due_campaigns() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  c public.campaigns%rowtype;
  v_count integer := 0;
  v_cats text[];
  v_emirates text[];
  v_verified boolean;
begin
  update public.campaigns set status = 'completed'
  where status in ('active', 'paused') and ends_at is not null and ends_at <= now();

  for c in
    select * from public.campaigns
    where status = 'scheduled' and coalesce(starts_at, now()) <= now()
    for update skip locked
  loop
    v_cats := array(select jsonb_array_elements_text(coalesce(c.audience_filter -> 'categories', '[]'::jsonb)));
    v_emirates := array(select jsonb_array_elements_text(coalesce(c.audience_filter -> 'emirates', '[]'::jsonb)));
    v_verified := coalesce((c.audience_filter ->> 'verifiedOnly')::boolean, false);

    if c.kind = 'promotion' then
      insert into public.campaign_recipients (campaign_id, user_id)
      select c.id, bp.user_id
      from public.buyer_preferences bp
      where bp.receive_promotions
        and (cardinality(v_cats) = 0 or bp.categories && v_cats)
        and (cardinality(v_emirates) = 0 or bp.emirates && v_emirates)
        and not exists (select 1 from public.supplier_mutes sm
                        where sm.user_id = bp.user_id and sm.supplier_company_id = c.owner_company_id)
        and not exists (select 1 from public.company_memberships m
                        where m.user_id = bp.user_id and m.company_id = c.owner_company_id and m.status = 'active')
      on conflict do nothing;
    else
      insert into public.campaign_recipients (campaign_id, user_id, company_id)
      select distinct on (m.user_id) c.id, m.user_id, co.id
      from public.companies co
      join public.company_memberships m on m.company_id = co.id and m.status = 'active'
      join public.role_permissions rp on rp.company_kind = m.company_kind and rp.role_key = m.role_key
                                      and rp.permission in ('campaigns.manage', 'contacts.manage')
      left join public.buyer_preferences bp on bp.user_id = m.user_id
      where co.kind = 'supplier' and co.is_public and not co.is_suspended
        and (not v_verified or co.verification_status = 'verified')
        and (cardinality(v_emirates) = 0 or co.emirate = any (v_emirates))
        and (cardinality(v_cats) = 0 or exists (
              select 1 from public.company_taxonomy t
              where t.company_id = co.id and t.kind = 'category' and t.value = any (v_cats)))
        and coalesce(bp.receive_sourcing, true)
        and private.entitled(co.id, 'receiveSourcing')
      on conflict do nothing;
    end if;

    insert into public.notifications (user_id, company_id, type, payload)
    select r.user_id, r.company_id, 'campaign.delivered', jsonb_build_object('campaign_id', c.id)
    from public.campaign_recipients r where r.campaign_id = c.id;

    update public.campaigns set status = 'active' where id = c.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
grant execute on function private.activate_due_campaigns() to service_role;

select private.lock_down_public_functions();
