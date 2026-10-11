// SOKO Migration 07 — concurrent Storage quota and version-finalisation tests.
//
// Needs several real sessions, so it cannot live in security_tests.sql.
// Run only against a disposable LOCAL database with all migrations applied:
//
//   SOKO_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres \
//   PG_MODULE=/path/to/node_modules/pg/lib/index.js \
//   node supabase/tests/storage_concurrency_tests.mjs
//
// Every transaction takes its snapshot, waits at a barrier, then writes, so each
// run forces the stale-snapshot case at every isolation level.

const url = process.env.SOKO_TEST_DATABASE_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
  throw new Error('SOKO_TEST_DATABASE_URL must point at a local test database');
}
const pg = (await import(process.env.PG_MODULE ?? 'pg')).default;
const connect = async () => { const c = new pg.Client({ connectionString: url }); await c.connect(); return c; };

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(ok ? 'PASS' : 'FAIL', label, detail);
};

const ISOLATIONS = ['read committed', 'repeatable read', 'serializable'];
const RETRYABLE = new Set(['40001', '40P01']);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const summary = xs => xs.reduce((acc, o) => ({ ...acc, [o]: (acc[o] ?? 0) + 1 }), {});
const asUser = uid => [
  `select set_config('request.jwt.claims', '${JSON.stringify({ sub: uid, role: 'authenticated' })}', true)`,
  'set local role authenticated',
];

const owner = await connect();
const created = { companies: [], users: [] };

async function user() {
  const id = (await owner.query(
    `insert into auth.users (id, email, aud, role, email_confirmed_at)
     values (gen_random_uuid(), 'st-' || gen_random_uuid() || '@soko-security.test', 'authenticated', 'authenticated', now())
     returning id`)).rows[0].id;
  created.users.push(id);
  return id;
}

// A supplier company with one admin member.
async function company() {
  const admin = await user();
  const co = (await owner.query(
    `insert into public.companies (kind, legal_name) values ('supplier', 'Storage Race Co ' || gen_random_uuid()) returning id`)).rows[0].id;
  created.companies.push(co);
  await owner.query(
    `insert into public.company_memberships (company_id, company_kind, user_id, role_key)
     values ($1, 'supplier', $2, 'supplier_admin')`, [co, admin]);
  return { co, admin };
}

const quota = async co => (await owner.query(
  `select private.entitlement_int($1, 'storageMb')::bigint * 1024 * 1024 as limit,
          (select coalesce(sum(coalesce(private.object_size(o.metadata), 0)), 0) from storage.objects o
            where o.bucket_id in ('company-documents', 'company-media', 'verification')
              and o.name like $1::text || '/%') as used`, [co])).rows[0];

// n sessions run `work` together after taking a snapshot. Retries 40001/40P01.
async function race(uid, isolation, jobs, work, { retry = true, max = 80 } = {}) {
  const clients = await Promise.all(jobs.map(connect));
  let release, ready = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const once = async (c, job, first) => {
    await c.query(`begin isolation level ${isolation}`);
    try {
      for (const s of asUser(uid)) await c.query(s);
      await c.query(`select count(*) from storage.objects`);
      if (first) { if (++ready === jobs.length) release(); await gate; }
      await work(c, job);
      await c.query('select pg_sleep(0.02)');
      await c.query('commit');
      return 'ok';
    } catch (e) {
      await c.query('rollback').catch(() => {});
      return e.code ?? e.message;
    }
  };
  try {
    return await Promise.all(jobs.map(async (job, i) => {
      const seen = [];
      for (let first = true; ; first = false) {
        const outcome = await once(clients[i], job, first);
        if (!retry || !RETRYABLE.has(outcome) || seen.length >= max) return { outcome, retries: seen };
        seen.push(outcome);
        await sleep(Math.random() * Math.min(400, 10 * 2 ** Math.min(seen.length, 6)));
      }
    }));
  } finally {
    await Promise.all(clients.map(c => c.end()));
  }
}

const upload = (bucket, size, mime) => (c, name) => c.query(
  `insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)`,
  [bucket, name, JSON.stringify({ size, mimetype: mime })]);

try {
  // 1. Quota race: 1,000 bytes left, 20 parallel 100-byte uploads. Exactly 10 fit.
  for (const isolation of ISOLATIONS) {
    const { co, admin } = await company();
    const { limit } = await quota(co);
    await owner.query(`insert into storage.objects (bucket_id, name, metadata) values ('company-media', $1, $2)`,
      [`${co}/gallery/filler.png`, JSON.stringify({ size: Number(limit) - 1000, mimetype: 'image/png' })]);
    const names = Array.from({ length: 20 }, (_, i) => `${co}/gallery/r${i}.png`);
    const results = await race(admin, isolation, names, upload('company-media', 100, 'image/png'));
    const { used } = await quota(co);
    const finals = summary(results.map(r => r.outcome));
    check(Number(used) === Number(limit) && finals.ok === 10 && finals['42501'] === 10,
      `quota race (${isolation}) fills the quota exactly`,
      JSON.stringify({ over: Number(used) - Number(limit), finals, retries: summary(results.flatMap(r => r.retries)) }));
  }

  // 2. Without retries, losers fail safely and the quota is never exceeded.
  for (const isolation of ['repeatable read', 'serializable']) {
    const { co, admin } = await company();
    const { limit } = await quota(co);
    await owner.query(`insert into storage.objects (bucket_id, name, metadata) values ('company-media', $1, $2)`,
      [`${co}/gallery/filler.png`, JSON.stringify({ size: Number(limit) - 500, mimetype: 'image/png' })]);
    const names = Array.from({ length: 20 }, (_, i) => `${co}/gallery/n${i}.png`);
    const results = await race(admin, isolation, names, upload('company-media', 100, 'image/png'), { retry: false });
    const outcomes = results.map(r => r.outcome);
    const { used } = await quota(co);
    check(Number(used) <= Number(limit) && outcomes.every(o => ['ok', '40001', '42501'].includes(o)),
      `quota race (${isolation}, no retry) never overshoots`, JSON.stringify({ over: Number(used) - Number(limit), ...summary(outcomes) }));
  }

  // 3. Mixed buckets share one quota: media, documents and verification race together.
  {
    const { co, admin } = await company();
    const { limit } = await quota(co);
    const doc = (await owner.query(
      `insert into public.documents (company_id, name, access_level) values ($1, 'Race doc', 'team') returning id`, [co])).rows[0].id;
    await owner.query(`insert into storage.objects (bucket_id, name, metadata) values ('company-media', $1, $2)`,
      [`${co}/gallery/filler.png`, JSON.stringify({ size: Number(limit) - 300, mimetype: 'image/png' })]);
    const jobs = [
      ...Array.from({ length: 4 }, (_, i) => ['company-media', `${co}/logo/m${i}.png`, 'image/png']),
      ['company-documents', `${co}/${doc}/v1/a.pdf`, 'application/pdf'],
      ...Array.from({ length: 4 }, (_, i) => ['verification', `${co}/${crypto.randomUUID()}/v${i}.pdf`, 'application/pdf']),
    ];
    const results = await race(admin, 'read committed', jobs, (c, [bucket, name, mime]) =>
      c.query(`insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)`,
        [bucket, name, JSON.stringify({ size: 100, mimetype: mime })]));
    const { used } = await quota(co);
    const finals = summary(results.map(r => r.outcome));
    check(Number(used) === Number(limit) && finals.ok === 3,
      'quota race across buckets admits exactly what fits', JSON.stringify({ over: Number(used) - Number(limit), finals }));
  }

  // 4. Finalisation race: 12 sessions finalise the same next version; exactly one wins.
  for (const isolation of ISOLATIONS) {
    const { co, admin } = await company();
    const doc = (await owner.query(
      `insert into public.documents (company_id, name, access_level) values ($1, 'Race doc', 'team') returning id`, [co])).rows[0].id;
    const path = `${co}/${doc}/v1/file.pdf`;
    await owner.query(`insert into storage.objects (bucket_id, name, metadata) values ('company-documents', $1, $2)`,
      [path, JSON.stringify({ size: 100, mimetype: 'application/pdf' })]);
    const results = await race(admin, isolation, Array(12).fill(path),
      (c, p) => c.query('select public.finalize_document_version($1, $2, null)', [doc, p]));
    const state = (await owner.query(
      `select d.current_version, (select count(*)::int from public.document_versions v where v.document_id = d.id) as versions
       from public.documents d where d.id = $1`, [doc])).rows[0];
    const finals = summary(results.map(r => r.outcome));
    check(state.current_version === 1 && state.versions === 1 && finals.ok === 1 && finals['22023'] === 11,
      `finalise race (${isolation}) creates exactly one version`, JSON.stringify({ ...state, finals }));
  }

  // 5. One company at its limit does not block another company's uploads.
  {
    const a = await company(), b = await company();
    const { limit } = await quota(a.co);
    await owner.query(`insert into storage.objects (bucket_id, name, metadata) values ('company-media', $1, $2)`,
      [`${a.co}/gallery/filler.png`, JSON.stringify({ size: Number(limit), mimetype: 'image/png' })]);
    const [ra, rb] = await Promise.all([
      race(a.admin, 'serializable', Array.from({ length: 10 }, (_, i) => `${a.co}/gallery/x${i}.png`), upload('company-media', 10, 'image/png')),
      race(b.admin, 'serializable', Array.from({ length: 10 }, (_, i) => `${b.co}/gallery/y${i}.png`), upload('company-media', 10, 'image/png')),
    ]);
    check(ra.every(r => r.outcome === '42501') && rb.every(r => r.outcome === 'ok'),
      'a full company does not limit another', JSON.stringify({ a: summary(ra.map(r => r.outcome)), b: summary(rb.map(r => r.outcome)) }));
  }
} finally {
  if (created.companies.length) {
    await owner.query(
      `delete from storage.objects where split_part(name, '/', 1) = any($1::text[])`, [created.companies]);
    await owner.query('delete from public.companies where id = any($1)', [created.companies]);
  }
  if (created.users.length) await owner.query('delete from auth.users where id = any($1)', [created.users]);
  const left = (await owner.query(
    `select (select count(*) from storage.objects where split_part(name, '/', 1) = any($1::text[]))
          + (select count(*) from private.storage_quota_guard where company_id = any($2::uuid[]))
          + (select count(*) from public.documents where company_id = any($2::uuid[])) as c`,
    [created.companies, created.companies])).rows[0].c;
  check(Number(left) === 0, 'cleanup removed all test objects, guards and documents', `left=${left}`);
  await owner.end();
}

console.log(failures ? `STORAGE CONCURRENCY: ${failures} FAILED` : 'STORAGE CONCURRENCY: all passed');
if (failures) process.exitCode = 1;
