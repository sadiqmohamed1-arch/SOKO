-- =============================================================================
-- STAGING-ONLY hotfix for Module 1A (iqzvlsgwphmjuornlbmj)
-- PRODUCTION (rzcsdilzpqvwjmzdxwyf) STRICTLY PROHIBITED.
--
-- Fixes: 42883 pg_advisory_xact_lock(integer, bigint) does not exist
-- inside private.contact_throttle_hit (migration 13 already applied).
-- Idempotent: CREATE OR REPLACE of that function only. Do NOT re-run mig 13.
-- =============================================================================

create or replace function private.contact_throttle_hit(p_kind text, p_key text, p_window interval, p_limit integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hash text := encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  v_start timestamptz := date_trunc('hour', now());
  v_hits integer;
begin
  if p_window >= interval '1 day' then
    v_start := date_trunc('day', now());
  end if;

  -- Per kind+key serialization; two-arg advisory lock requires (int4, int4).
  perform pg_advisory_xact_lock(
    813001,
    ('x' || substr(encode(sha256(convert_to(p_kind || ':' || p_key, 'UTF8')), 'hex'), 1, 8))::bit(32)::integer);

  delete from private.contact_submit_throttle where expires_at < now();

  insert into private.contact_submit_throttle (kind, key_hash, window_start, hits, expires_at)
  values (p_kind, v_hash, v_start, 1, now() + interval '48 hours')
  on conflict (kind, key_hash, window_start)
  do update set hits = private.contact_submit_throttle.hits + 1
  returning hits into v_hits;

  if v_hits > p_limit then
    raise exception 'inquiry limit reached' using errcode = '54000';
  end if;
end $$;
