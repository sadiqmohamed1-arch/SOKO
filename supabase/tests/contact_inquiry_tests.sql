-- =============================================================================
-- SOKO Contact Us tests (Module 1A)
-- Run as the database owner against a NON-production database after migration 13.
-- One transaction; always ROLLBACK. Fixture emails use the .test TLD.
-- =============================================================================
begin;

create schema soko_ci;
create table soko_ci.results (n serial primary key, label text not null, passed boolean not null, detail text);
create table soko_ci.ids (key text primary key, id uuid not null);
grant usage on schema soko_ci to anon, authenticated, service_role;
grant all on all tables in schema soko_ci to anon, authenticated, service_role;
grant all on all sequences in schema soko_ci to anon, authenticated, service_role;

create function soko_ci.id(p_key text) returns uuid language sql stable as
  $$ select id from soko_ci.ids where key = p_key $$;

create function soko_ci.as_user(p_key text) returns void language sql as $$
  select set_config('request.jwt.claims',
           json_build_object('sub', soko_ci.id(p_key), 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', soko_ci.id(p_key)::text, true);
$$;

create function soko_ci.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true),
         set_config('request.jwt.claim.sub', '', true);
$$;

create function soko_ci.expect_denied(p_label text, p_sql text) returns void language plpgsql as $$
declare v_rows bigint;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    insert into soko_ci.results (label, passed, detail) values (p_label, v_rows = 0, 'affected ' || v_rows || ' row(s)');
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, true, 'denied: ' || sqlerrm);
  end;
end $$;

create function soko_ci.expect_ok(p_label text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_ci.results (label, passed, detail) values (p_label, true, 'ok');
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, false, 'unexpected error: ' || sqlerrm);
  end;
end $$;

create function soko_ci.expect_count(p_label text, p_sql text, p_expected bigint) returns void language plpgsql as $$
declare v_n bigint;
begin
  begin
    execute p_sql into v_n;
    insert into soko_ci.results (label, passed, detail)
    values (p_label, v_n = p_expected, 'expected ' || p_expected || ', got ' || v_n);
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, p_expected = 0, 'error: ' || sqlerrm);
  end;
end $$;

create function soko_ci.expect_sqlstate(p_label text, p_sql text, p_state text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_ci.results (label, passed, detail) values (p_label, false, 'expected ' || p_state);
  exception when others then
    insert into soko_ci.results (label, passed, detail)
    values (p_label, sqlstate = p_state, 'sqlstate ' || sqlstate || ' ' || sqlerrm);
  end;
end $$;

grant execute on all functions in schema soko_ci to anon, authenticated, service_role;

insert into soko_ci.ids (key, id) values
  ('padmin',   '00000000-0000-4000-8000-00000000c001'),
  ('member',   '00000000-0000-4000-8000-00000000c002');

insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at)
select i.id, i.key || '@soko-contact.test', 'authenticated', 'authenticated',
       jsonb_build_object('full_name', 'CI ' || i.key), now()
from soko_ci.ids i
on conflict (id) do nothing;

insert into public.platform_admins (user_id, note)
values (soko_ci.id('padmin'), 'contact inquiry tests')
on conflict (user_id) do nothing;

create function soko_ci.valid_submit(p_email text) returns text language plpgsql as $$
begin
  return format(
    $$select public.submit_contact_inquiry('Ada Lovelace', 'SOKO Test LLC', %L, '+971 50 000 0000',
      'Buyer', 'General Inquiry', 'Need help with access', 'Please help us join the network.', '')$$,
    p_email);
end $$;

-- Anonymous cannot touch the table directly
select soko_ci.as_anon();
set local role anon;
select soko_ci.expect_denied('CI: anon cannot insert inquiries',
  $$insert into public.contact_inquiries (
      reference, full_name, email, email_norm, user_type, category, subject, message)
    values ('SOKO-INQ-19990101-00001', 'X Y', 'a@b.co', 'a@b.co', 'Other', 'Other', 'Hello there', 'This is a long enough message')$$);
select soko_ci.expect_denied('CI: anon cannot select inquiries',
  $$select * from public.contact_inquiries$$);
select soko_ci.expect_denied('CI: anon cannot update inquiries',
  $$update public.contact_inquiries set status = 'open'$$);
select soko_ci.expect_sqlstate('CI: invalid email is rejected',
  $$select public.submit_contact_inquiry('Ada Lovelace', null, 'not-an-email', null, 'Buyer', 'General Inquiry', 'Need help with access', 'Please help us join the network.', '')$$,
  '22023');
select soko_ci.expect_sqlstate('CI: short message is rejected',
  $$select public.submit_contact_inquiry('Ada Lovelace', null, 'ok@soko-contact.test', null, 'Buyer', 'General Inquiry', 'Need help with access', 'too short', '')$$,
  '22023');
select soko_ci.expect_ok('CI: valid public submission', soko_ci.valid_submit('one@soko-contact.test'));
select soko_ci.expect_count('CI: honeypot is stored as nothing',
  $$select (public.submit_contact_inquiry('Ada Lovelace', null, 'bot@soko-contact.test', null, 'Buyer',
     'General Inquiry', 'Need help with access', 'Please help us join the network.', 'http://spam.example')
     ->> 'ignored' = 'true')::int$$, 1);
reset role;

select soko_ci.expect_count('CI: honeypot did not insert a row',
  $$select count(*) from public.contact_inquiries where email_norm = 'bot@soko-contact.test'$$, 0);
select soko_ci.expect_count('CI: valid submission persisted',
  $$select count(*) from public.contact_inquiries where email_norm = 'one@soko-contact.test'$$, 1);
select soko_ci.expect_count('CI: reference was issued',
  $$select count(*) from public.contact_inquiries where reference like 'SOKO-INQ-%' and email_norm = 'one@soko-contact.test'$$, 1);
insert into soko_ci.ids
select 'inq', id from public.contact_inquiries where email_norm = 'one@soko-contact.test';

-- Notifications (no personal fields in payload)
select soko_ci.expect_count('CI: platform admin was notified',
  format($$select count(*) from public.notifications
           where user_id = %L and type = 'contact_inquiry.created'$$, soko_ci.id('padmin')), 1);
select soko_ci.expect_count('CI: notification payload has no email or message',
  $$select count(*) from public.notifications
     where type = 'contact_inquiry.created'
       and (payload::text ilike '%one@soko-contact.test%' or payload::text ilike '%Please help us join%')$$, 0);

-- Audit has metadata only
select soko_ci.expect_count('CI: inquiry insert is audited',
  $$select count(*) from public.audit_log where entity = 'contact_inquiries' and action = 'insert'$$, 1);
select soko_ci.expect_count('CI: audit log contains no personal inquiry fields',
  $$select count(*) from public.audit_log
     where entity in ('contact_inquiries', 'contact_inquiry_notes')
       and (diff::text ilike '%one@soko-contact.test%'
            or diff::text ilike '%Ada Lovelace%'
            or diff::text ilike '%+971%'
            or diff::text ilike '%Please help us join%')$$, 0);

-- Non-admin cannot read or manage
select soko_ci.as_user('member');
set local role authenticated;
select soko_ci.expect_denied('CI: member cannot select inquiries', $$select * from public.contact_inquiries$$);
select soko_ci.expect_denied('CI: member cannot select notes', $$select * from public.contact_inquiry_notes$$);
select soko_ci.expect_sqlstate('CI: member cannot update inquiry',
  format($$select public.admin_update_contact_inquiry(%L, 'open', null)$$, soko_ci.id('inq')),
  '42501');
select soko_ci.expect_sqlstate('CI: member cannot add notes',
  format($$select public.admin_add_contact_inquiry_note(%L, 'secret')$$, soko_ci.id('inq')),
  '42501');
select soko_ci.expect_sqlstate('CI: member cannot list assignees',
  $$select * from public.admin_list_contact_assignees()$$, '42501');
reset role;

-- Admin management
select soko_ci.as_user('padmin');
set local role authenticated;
select soko_ci.expect_count('CI: admin can read inquiries', $$select count(*) from public.contact_inquiries$$, 1);
select soko_ci.expect_ok('CI: admin assigns and opens',
  format($$select public.admin_update_contact_inquiry(id, 'open', %L) from public.contact_inquiries where email_norm = 'one@soko-contact.test'$$,
         soko_ci.id('padmin')));
select soko_ci.expect_ok('CI: admin adds a note',
  $$select public.admin_add_contact_inquiry_note(id, 'Called the sender.') from public.contact_inquiries where email_norm = 'one@soko-contact.test'$$);
select soko_ci.expect_count('CI: note stored', $$select count(*) from public.contact_inquiry_notes$$, 1);
select soko_ci.expect_count('CI: note body is not in audit_log',
  $$select count(*) from public.audit_log where entity = 'contact_inquiry_notes' and diff::text ilike '%Called the sender%'$$, 0);
select soko_ci.expect_count('CI: note audit names the inquiry only',
  $$select count(*) from public.audit_log where entity = 'contact_inquiry_notes' and diff ? 'inquiry_id'$$, 1);
select soko_ci.expect_count('CI: assignees lists the admin',
  format($$select count(*) from public.admin_list_contact_assignees() where user_id = %L$$, soko_ci.id('padmin')), 1);
reset role;

-- Rate limit (same email, sequential under the same xact lock — still increments hits)
select soko_ci.as_anon();
set local role anon;
select soko_ci.expect_ok('CI: first same-email submit allowed', soko_ci.valid_submit('rate@soko-contact.test'));
select soko_ci.expect_ok('CI: second same-email submit allowed', soko_ci.valid_submit('rate@soko-contact.test'));
select soko_ci.expect_ok('CI: third same-email submit allowed', soko_ci.valid_submit('rate@soko-contact.test'));
select soko_ci.expect_sqlstate('CI: fourth same-email submit is rate limited',
  soko_ci.valid_submit('rate@soko-contact.test'), '54000');
reset role;

-- Concurrent-style: two lock keys cannot exceed the email cap even if issued back-to-back
select soko_ci.expect_count('CI: rate-limited email stored at most 3 rows',
  $$select count(*) from public.contact_inquiries where email_norm = 'rate@soko-contact.test'$$, 3);

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
from soko_ci.results order by n;

do $$
declare v_failed int; v_total int;
begin
  select count(*) filter (where not passed), count(*) into v_failed, v_total from soko_ci.results;
  if v_failed > 0 then
    raise exception 'SOKO contact inquiry tests: % of % FAILED', v_failed, v_total;
  end if;
  raise notice 'SOKO contact inquiry tests: all % passed', v_total;
end $$;

rollback;
