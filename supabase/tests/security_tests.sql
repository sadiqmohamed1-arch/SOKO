-- =============================================================================
-- SOKO security tests — unauthorized access attempts
--
-- Runs entirely inside one transaction and ends with ROLLBACK, so the fixture
-- users, companies and records below never persist. Run it as the database
-- owner (postgres) against a NON-production database, after all migrations.
--
-- Each check records PASS/FAIL into soko_test.results; the final SELECT lists
-- them and the closing DO block raises if anything failed.
-- Fixture emails use the reserved .test TLD and cannot receive mail.
-- =============================================================================
begin;

create schema soko_test;
create table soko_test.results (n serial primary key, label text not null, passed boolean not null, detail text);
create table soko_test.ids (key text primary key, id uuid not null);
create table soko_test.secrets (key text primary key, value text not null);
grant usage on schema soko_test to anon, authenticated;
grant all on all tables in schema soko_test to anon, authenticated;
grant all on all sequences in schema soko_test to anon, authenticated;

create function soko_test.id(p_key text) returns uuid language sql stable as
  $$ select id from soko_test.ids where key = p_key $$;

create function soko_test.as_user(p_key text) returns void language sql as $$
  select set_config('request.jwt.claims',
           json_build_object('sub', soko_test.id(p_key), 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', soko_test.id(p_key)::text, true);
$$;

create function soko_test.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true),
         set_config('request.jwt.claim.sub', '', true);
$$;

-- Passes when the statement raises, or when it silently affects zero rows
-- (RLS filtering an UPDATE/DELETE produces no error, just no rows).
create function soko_test.expect_denied(p_label text, p_sql text) returns void language plpgsql as $$
declare v_rows bigint;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    insert into soko_test.results (label, passed, detail) values (p_label, v_rows = 0, 'affected ' || v_rows || ' row(s)');
  exception when others then
    insert into soko_test.results (label, passed, detail) values (p_label, true, 'denied: ' || sqlerrm);
  end;
end $$;

create function soko_test.expect_ok(p_label text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_test.results (label, passed, detail) values (p_label, true, 'ok');
  exception when others then
    insert into soko_test.results (label, passed, detail) values (p_label, false, 'unexpected error: ' || sqlerrm);
  end;
end $$;

-- p_sql must return a single count.
create function soko_test.expect_count(p_label text, p_sql text, p_expected bigint) returns void language plpgsql as $$
declare v_n bigint;
begin
  begin
    execute p_sql into v_n;
    insert into soko_test.results (label, passed, detail)
    values (p_label, v_n = p_expected, 'expected ' || p_expected || ', got ' || v_n);
  exception when others then
    insert into soko_test.results (label, passed, detail) values (p_label, p_expected = 0, 'error: ' || sqlerrm);
  end;
end $$;

grant execute on all functions in schema soko_test to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Fixtures (as owner)
-- -----------------------------------------------------------------------------
insert into soko_test.ids (key, id) values
  ('sup_admin',  '00000000-0000-4000-8000-000000000001'),
  ('sup_viewer', '00000000-0000-4000-8000-000000000002'),
  ('con_admin',  '00000000-0000-4000-8000-000000000003'),
  ('outsider',   '00000000-0000-4000-8000-000000000004'),
  ('padmin',     '00000000-0000-4000-8000-000000000005'),
  ('con_member', '00000000-0000-4000-8000-000000000006');

insert into auth.users (id, email, aud, role, raw_user_meta_data)
select i.id, i.key || '@soko-security.test', 'authenticated', 'authenticated',
       jsonb_build_object('full_name', 'Test ' || i.key)
from soko_test.ids i;

insert into public.platform_admins (user_id, note) values (soko_test.id('padmin'), 'security test fixture');

-- Supplier admin creates a supplier company and makes it public.
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.ids values ('supplier', public.create_company('supplier', 'Security Test Supplier LLC'));
update public.companies set is_public = true where id = soko_test.id('supplier');
insert into soko_test.secrets values ('viewer_token',
  public.invite_member(soko_test.id('supplier'), 'sup_viewer@soko-security.test', 'viewer'));
insert into soko_test.secrets values ('outsider_token',
  public.invite_member(soko_test.id('supplier'), 'someone-else@soko-security.test', 'viewer'));
reset role;

-- Viewer accepts the invitation.
select soko_test.as_user('sup_viewer');
set local role authenticated;
select public.accept_invitation((select value from soko_test.secrets where key = 'viewer_token'));
reset role;

-- Contractor admin creates a contractor company with a vendor record and contact.
select soko_test.as_user('con_admin');
set local role authenticated;
insert into soko_test.ids values ('contractor', public.create_company('contractor', 'Security Test Contractor LLC'));
insert into public.vendor_records (contractor_company_id, supplier_company_id, trade_category)
values (soko_test.id('contractor'), soko_test.id('supplier'), 'MEP');
insert into public.company_contacts (company_id, full_name, email)
values (soko_test.id('contractor'), 'Private Contact', 'private@soko-security.test');
reset role;

insert into soko_test.ids
select 'vendor_record', id from public.vendor_records where contractor_company_id = soko_test.id('contractor');
insert into soko_test.ids
select 'viewer_membership', id from public.company_memberships
where company_id = soko_test.id('supplier') and user_id = soko_test.id('sup_viewer');
insert into soko_test.ids
select 'admin_membership', id from public.company_memberships
where company_id = soko_test.id('supplier') and user_id = soko_test.id('sup_admin');

-- Supplier admin: a draft product, a published product, an admin-only document
-- with an uploaded version, and a promotion campaign draft.
insert into storage.objects (bucket_id, name, metadata)
values ('company-documents', soko_test.id('supplier')::text || '/placeholder', '{"size": 1}');
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into public.products (company_id, name, status) values (soko_test.id('supplier'), 'Draft Valve', 'draft');
insert into public.products (company_id, name, status) values (soko_test.id('supplier'), 'Published Valve', 'published');
insert into public.documents (company_id, name, access_level) values (soko_test.id('supplier'), 'Admin Only Licence', 'admins');
insert into public.campaigns (owner_company_id, kind, promo_type, title, body, budget_credits)
values (soko_test.id('supplier'), 'promotion', 'special_offer', 'Test Promotion', 'Body', 10);
reset role;
insert into soko_test.ids select 'document', id from public.documents where company_id = soko_test.id('supplier');
insert into soko_test.ids select 'campaign', id from public.campaigns where owner_company_id = soko_test.id('supplier');
insert into storage.objects (bucket_id, name, metadata)
values ('company-documents',
        soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v1/licence.pdf',
        '{"size": 2048, "mimetype": "application/pdf"}');
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.ids values ('document_version', public.finalize_document_version(
  soko_test.id('document'),
  soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v1/licence.pdf',
  'licence.pdf'));
-- Supplier requests a visit with the contractor and leaves a private note.
insert into soko_test.ids values ('visit', public.request_visit(
  soko_test.id('supplier'), soko_test.id('contractor'), now() + interval '2 days'));
insert into public.visit_notes (visit_id, company_id, body)
values (soko_test.id('visit'), soko_test.id('supplier'), 'Supplier-only note');
reset role;

-- Contractor posts a confidential opportunity.
select soko_test.as_user('con_admin');
set local role authenticated;
insert into public.opportunities (owner_company_id, type, opp_group, title, description, identity,
                                  contact_name, contact_email)
values (soko_test.id('contractor'), 'material', 'requirements', 'Need 500 valves', 'Details',
        'confidential', 'Hidden Buyer', 'hidden@soko-security.test');
reset role;
insert into soko_test.ids select 'opportunity', id from public.opportunities where owner_company_id = soko_test.id('contractor');

-- =============================================================================
-- 1. Membership and role escalation
-- =============================================================================
select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_denied('viewer cannot update own membership role directly',
  $$update public.company_memberships set role_key = 'supplier_admin' where user_id = auth.uid()$$);
select soko_test.expect_denied('viewer cannot promote self via RPC',
  format($$select public.change_member_role(%L, 'supplier_admin')$$, soko_test.id('viewer_membership')));
select soko_test.expect_denied('viewer cannot insert a membership into another company',
  format($$insert into public.company_memberships (company_id, company_kind, user_id, role_key)
           values (%L, 'contractor', auth.uid(), 'contractor_admin')$$, soko_test.id('contractor')));
select soko_test.expect_denied('viewer cannot invite members',
  format($$select public.invite_member(%L, 'x@soko-security.test', 'supplier_admin')$$, soko_test.id('supplier')));
select soko_test.expect_denied('viewer cannot edit the company profile',
  format($$update public.companies set description = 'hacked' where id = %L$$, soko_test.id('supplier')));
select soko_test.expect_denied('viewer cannot read the admin-only document',
  format($$select 1 from public.documents where id = %L$$, soko_test.id('document')));
select soko_test.expect_count('viewer can read team memberships (positive control)',
  format($$select count(*) from public.company_memberships where company_id = %L$$, soko_test.id('supplier')), 2);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('admin cannot change own role',
  format($$select public.change_member_role(%L, 'viewer')$$, soko_test.id('admin_membership')));
select soko_test.expect_denied('last admin cannot leave the company',
  format($$select public.remove_member(%L)$$, soko_test.id('admin_membership')));
reset role;

select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_denied('invitation cannot be accepted by a different email',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'outsider_token'))$$);
select soko_test.expect_denied('reused invitation token is rejected',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'viewer_token'))$$);
select soko_test.expect_count('outsider cannot list supplier memberships',
  format($$select count(*) from public.company_memberships where company_id = %L$$, soko_test.id('supplier')), 0);
select soko_test.expect_denied('outsider cannot read invitation token hashes',
  $$select token_hash from public.company_invitations$$);
reset role;

-- =============================================================================
-- 2. Verification and entitlements
-- =============================================================================
select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('admin cannot set verification_status directly',
  format($$update public.companies set verification_status = 'verified' where id = %L$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot unsuspend or change kind directly',
  format($$update public.companies set is_suspended = false, kind = 'contractor' where id = %L$$, soko_test.id('supplier')));
select soko_test.expect_ok('admin can submit verification (positive control)',
  format($$select public.submit_verification(%L, 'LIC-1', 'DED', current_date + 365)$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot approve own verification',
  $$select public.review_verification((select id from public.company_verifications limit 1), true)$$);
select soko_test.expect_denied('admin cannot change the subscription plan directly',
  format($$update public.company_subscriptions set plan_id = 'enterprise' where company_id = %L$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot call admin_set_subscription',
  format($$select public.admin_set_subscription(%L, 'enterprise')$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot mint credits',
  format($$insert into public.credit_ledger (company_id, delta, reason) values (%L, 1000, 'purchase')$$, soko_test.id('supplier')));
select soko_test.expect_denied('free plan cannot submit a promotion campaign',
  format($$select public.submit_campaign(%L)$$, soko_test.id('campaign')));
select soko_test.expect_denied('campaign status cannot be set directly',
  format($$update public.campaigns set status = 'active' where id = %L$$, soko_test.id('campaign')));
reset role;

select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_ok('platform admin can approve verification (positive control)',
  $$select public.review_verification((select id from public.company_verifications where status = 'pending' limit 1), true)$$);
reset role;
select soko_test.expect_count('company is verified after platform review',
  format($$select count(*) from public.companies where id = %L and verification_status = 'verified'$$, soko_test.id('supplier')), 1);

-- =============================================================================
-- 3. Company-private data
-- =============================================================================
select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_count('outsider cannot read vendor records',
  $$select count(*) from public.vendor_records$$, 0);
select soko_test.expect_count('outsider cannot read company contacts',
  $$select count(*) from public.company_contacts$$, 0);
select soko_test.expect_count('outsider cannot read audit log',
  $$select count(*) from public.audit_log$$, 0);
select soko_test.expect_count('outsider cannot read another user''s notifications',
  $$select count(*) from public.notifications$$, 0);
select soko_test.expect_denied('outsider cannot insert notifications',
  format($$insert into public.notifications (user_id, type) values (%L, 'spoof')$$, soko_test.id('sup_admin')));
select soko_test.expect_count('outsider cannot see the visit',
  $$select count(*) from public.visits$$, 0);
select soko_test.expect_denied('outsider cannot read private document version',
  format($$select 1 from public.document_versions where id = %L$$, soko_test.id('document_version')));
select soko_test.expect_count('outsider cannot read the stored file',
  $$select count(*) from storage.objects where bucket_id = 'company-documents'$$, 0);
select soko_test.expect_denied('outsider cannot upload into the supplier''s folder',
  format($$insert into storage.objects (bucket_id, name, metadata) values ('company-documents', %L, '{"size":1}')$$,
         soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v2/x.pdf'));
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('supplier cannot read the contractor''s vendor record about them',
  $$select count(*) from public.vendor_records$$, 0);
select soko_test.expect_count('supplier cannot read the contractor''s contacts',
  $$select count(*) from public.company_contacts$$, 0);
select soko_test.expect_denied('supplier cannot approve itself as a vendor',
  format($$select public.set_vendor_approval(%L, 'approved')$$, soko_test.id('vendor_record')));
select soko_test.expect_denied('supplier cannot confirm its own visit request',
  format($$select public.set_visit_status(%L, %L, 'scheduled')$$, soko_test.id('visit'), soko_test.id('supplier')));
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('contractor cannot read the supplier''s private visit note',
  $$select count(*) from public.visit_notes$$, 0);
select soko_test.expect_count('contractor sees the shared visit (positive control)',
  $$select count(*) from public.visits$$, 1);
select soko_test.expect_ok('contractor can confirm the visit (positive control)',
  format($$select public.set_visit_status(%L, %L, 'scheduled')$$, soko_test.id('visit'), soko_test.id('contractor')));
select soko_test.expect_count('contractor cannot read unshared supplier document',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 0);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('supplier cannot check in a visit (host-only transition)',
  format($$select public.set_visit_status(%L, %L, 'checked-in')$$, soko_test.id('visit'), soko_test.id('supplier')));
insert into soko_test.ids values ('share', public.share_document(soko_test.id('document'), soko_test.id('contractor')));
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('contractor reads document after share (positive control)',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 1);
select soko_test.expect_count('contractor reads shared file object (positive control)',
  $$select count(*) from storage.objects where bucket_id = 'company-documents' and name like '%/v1/licence.pdf'$$, 1);
select soko_test.expect_denied('recipient cannot revoke or re-share the owner''s document',
  format($$select public.revoke_document_share(%L)$$, soko_test.id('share')));
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select public.revoke_document_share(soko_test.id('share'));
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('contractor loses access after revocation',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 0);
select soko_test.expect_count('contractor loses file access after revocation',
  $$select count(*) from storage.objects where bucket_id = 'company-documents'$$, 0);
reset role;

-- =============================================================================
-- 4. Public data and anonymous access
-- =============================================================================
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('anon sees only published products of public companies',
  $$select count(*) from public.products$$, 1);
select soko_test.expect_denied('anon cannot read profiles',
  $$select 1 from public.profiles$$);
select soko_test.expect_denied('anon cannot call create_company',
  $$select public.create_company('supplier', 'Anon Co')$$);
select soko_test.expect_denied('anon cannot read opportunities',
  $$select 1 from public.opportunities$$);
reset role;

-- =============================================================================
-- 5. Market Hub confidentiality
-- =============================================================================
select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('open opportunity is listed (positive control)',
  $$select count(*) from public.opportunities$$, 1);
select soko_test.expect_denied('contact columns are not selectable',
  $$select contact_email from public.opportunities$$);
select soko_test.expect_denied('owner columns are not selectable',
  $$select owner_company_id from public.opportunities$$);
select soko_test.expect_count('confidential publisher and contact stay hidden before connection',
  format($$select count(*) from (select public.get_opportunity_details(%L) d) x
           where d ->> 'publisher_display' = 'Confidential publisher' and d -> 'contact' = 'null'::jsonb$$,
         soko_test.id('opportunity')), 1);
insert into public.opportunity_interests (opportunity_id, responder_company_id, message)
values (soko_test.id('opportunity'), soko_test.id('supplier'), 'We can supply');
select soko_test.expect_denied('responder cannot mark own interest as connected',
  $$select public.set_interest_status((select id from public.opportunity_interests limit 1), 'connected')$$);
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_denied('owner cannot express interest in own opportunity',
  format($$insert into public.opportunity_interests (opportunity_id, responder_company_id) values (%L, %L)$$,
         soko_test.id('opportunity'), soko_test.id('contractor')));
select soko_test.expect_ok('owner can connect with the responder (positive control)',
  $$select public.set_interest_status((select id from public.opportunity_interests limit 1), 'connected')$$);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('contact is revealed after connection',
  format($$select count(*) from (select public.get_opportunity_details(%L) d) x
           where d -> 'contact' ->> 'email' = 'hidden@soko-security.test'$$, soko_test.id('opportunity')), 1);
reset role;

-- =============================================================================
-- 6. Append-only records
-- =============================================================================
select soko_test.expect_denied('audit log cannot be modified, even by the owner',
  $$update public.audit_log set action = 'tampered'$$);
select soko_test.expect_denied('document versions are immutable, even for the owner',
  $$update public.document_versions set file_name = 'tampered.pdf'$$);

-- -----------------------------------------------------------------------------
-- Report
-- -----------------------------------------------------------------------------
reset role;
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
from soko_test.results order by n;

do $$
declare v_failed int; v_total int;
begin
  select count(*) filter (where not passed), count(*) into v_failed, v_total from soko_test.results;
  if v_failed > 0 then
    raise exception 'SOKO security tests: % of % FAILED', v_failed, v_total;
  end if;
  raise notice 'SOKO security tests: all % passed', v_total;
end $$;

rollback;
