// SOKO Migration 06 — concurrent product-view cap tests.
//
// Needs several real sessions, so it cannot live in security_tests.sql.
// Run only against a disposable LOCAL database with all migrations applied:
//
//   SOKO_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres \
//   PG_MODULE=/path/to/node_modules/pg/lib/index.js \
//   node supabase/tests/product_view_concurrency_tests.mjs
//
// Every transaction takes its snapshot, waits at a barrier, then records a view,
// so each run forces the stale-snapshot case at every isolation level.

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

const CAP = 200;
const ISOLATIONS = ['read committed', 'repeatable read', 'serializable'];
const RETRYABLE = new Set(['40001', '40P01']);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const summary = xs => xs.reduce((acc, o) => ({ ...acc, [o]: (acc[o] ?? 0) + 1 }), {});

const owner = await connect();
const created = { companies: [], users: [] };

async function user() {
  const id = (await owner.query(
    `insert into auth.users (id, email, aud, role, email_confirmed_at)
     values (gen_random_uuid(), 'pv-' || gen_random_uuid() || '@soko-security.test', 'authenticated', 'authenticated', now())
     returning id`)).rows[0].id;
  created.users.push(id);
  return id;
}

async function supplier(productCount, { status = 'published', isPublic = true } = {}) {
  const co = (await owner.query(
    `insert into public.companies (kind, legal_name, is_public)
     values ('supplier', 'View Race Co ' || gen_random_uuid(), $1) returning id`, [isPublic])).rows[0].id;
  created.companies.push(co);
  const ids = (await owner.query(
    `insert into public.products (company_id, name, status)
     select $1, 'Race item ' || g, $3 from generate_series(1, $2) g returning id`,
    [co, productCount, status])).rows.map(r => r.id);
  return { co, ids };
}

const asUser = uid => [
  `select set_config('request.jwt.claims', '${JSON.stringify({ sub: uid, role: 'authenticated' })}', true)`,
  'set local role authenticated',
];

// Records views serially (setup only).
async function view(uid, productIds) {
  for (const id of productIds) {
    await owner.query('begin');
    for (const s of asUser(uid)) await owner.query(s);
    await owner.query('select public.record_product_view($1)', [id]);
    await owner.query('commit');
  }
}

// n sessions, one product each, released together. Retries 40001/40P01 when asked.
// Under REPEATABLE READ / SERIALIZABLE, contenders on one user's quota row fail
// with 40001 rather than overshoot; the client contract is retry with
// exponential backoff and jitter. (PostgREST RPCs run READ COMMITTED, where
// contenders simply queue on the row lock.)
async function race(uid, isolation, productIds, { retry = true, max = 80 } = {}) {
  const clients = await Promise.all(productIds.map(connect));
  let release, ready = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const once = async (c, id, first) => {
    await c.query(`begin isolation level ${isolation}`);
    try {
      for (const s of asUser(uid)) await c.query(s);
      await c.query('select count(*) from public.products');
      if (first) { if (++ready === productIds.length) release(); await gate; }
      await c.query('select public.record_product_view($1)', [id]);
      await c.query('select pg_sleep(0.02)');
      await c.query('commit');
      return 'ok';
    } catch (e) {
      await c.query('rollback').catch(() => {});
      return e.code ?? e.message;
    }
  };
  try {
    return await Promise.all(productIds.map(async (id, i) => {
      const seen = [];
      for (let first = true; ; first = false) {
        const outcome = await once(clients[i], id, first);
        if (!retry || !RETRYABLE.has(outcome) || seen.length >= max) return { outcome, retries: seen };
        seen.push(outcome);
        await sleep(Math.random() * Math.min(400, 10 * 2 ** Math.min(seen.length, 6)));
      }
    }));
  } finally {
    await Promise.all(clients.map(c => c.end()));
  }
}

const counts = async uid => (await owner.query(
  `select (select count(*)::int from public.product_views where viewer_user_id = $1) as views,
          (select coalesce(sum(views), 0)::int from private.product_view_quota where viewer_user_id = $1) as quota`,
  [uid])).rows[0];

try {
  const { ids } = await supplier(CAP + 60);

  // 1. Cap race near the limit: 195 recorded, then 40 parallel new products.
  for (const isolation of ISOLATIONS) {
    const uid = await user();
    await view(uid, ids.slice(0, CAP - 5));
    const results = await race(uid, isolation, ids.slice(CAP - 5, CAP + 35));
    const { views, quota } = await counts(uid);
    const finals = summary(results.map(r => r.outcome));
    const retries = summary(results.flatMap(r => r.retries));
    check(views === CAP && quota === CAP && (finals.ok ?? 0) === results.length,
      `view cap race (${isolation}) stops at exactly ${CAP}`, JSON.stringify({ views, quota, finals, retries }));
  }

  // 2. Without retries, losers fail safely: only 40001 is surfaced and the cap holds.
  for (const isolation of ['repeatable read', 'serializable']) {
    const uid = await user();
    await view(uid, ids.slice(0, CAP - 3));
    const results = await race(uid, isolation, ids.slice(CAP - 3, CAP + 17), { retry: false });
    const outcomes = results.map(r => r.outcome);
    const { views, quota } = await counts(uid);
    check(views <= CAP && views === quota && outcomes.every(o => o === 'ok' || o === '40001'),
      `view cap race (${isolation}, no retry) never overshoots`, JSON.stringify({ views, quota, ...summary(outcomes) }));
  }

  // 3. Fresh user, first view of the day, 50 parallel distinct products: no lost
  //    quota updates and no unique-violation on the quota row.
  for (const isolation of ISOLATIONS) {
    const uid = await user();
    const results = await race(uid, isolation, ids.slice(0, 50));
    const { views, quota } = await counts(uid);
    const finals = summary(results.map(r => r.outcome));
    check(views === 50 && quota === 50 && (finals.ok ?? 0) === 50,
      `first-view race (${isolation}) counts every view once`, JSON.stringify({ views, quota, finals }));
  }

  // 4. Duplicate views of one product in parallel stay idempotent.
  for (const isolation of ISOLATIONS) {
    const uid = await user();
    const results = await race(uid, isolation, Array(20).fill(ids[0]));
    const { views, quota } = await counts(uid);
    const finals = summary(results.map(r => r.outcome));
    check(views === 1 && quota === 1 && (finals.ok ?? 0) === 20,
      `duplicate-view race (${isolation}) records one view`, JSON.stringify({ views, quota, finals }));
  }

  // 5. At the cap, parallel repeats and new products are all silent no-ops.
  {
    const uid = await user();
    await view(uid, ids.slice(0, CAP));
    const mixed = [...ids.slice(0, 10), ...ids.slice(CAP, CAP + 10)];
    const results = await race(uid, 'read committed', mixed);
    const { views, quota } = await counts(uid);
    check(views === CAP && quota === CAP && results.every(r => r.outcome === 'ok'),
      'calls at the cap succeed without recording', JSON.stringify({ views, quota }));
  }

  // 6. Privacy under concurrency: inaccessible products never touch the quota.
  {
    const uid = await user();
    const { ids: drafts } = await supplier(10, { status: 'draft' });
    const { ids: hidden } = await supplier(10, { isPublic: false });
    const missing = Array.from({ length: 10 }, () => crypto.randomUUID());
    const results = await race(uid, 'serializable', [...drafts, ...hidden, ...missing]);
    const { views, quota } = await counts(uid);
    const rows = (await owner.query('select count(*)::int c from private.product_view_quota where viewer_user_id = $1', [uid])).rows[0].c;
    check(views === 0 && quota === 0 && rows === 0 && results.every(r => r.outcome === 'ok' && r.retries.length === 0),
      'inaccessible products return identically and leave no quota trace', JSON.stringify({ views, rows }));
  }

  // 7. Users do not contend with each other.
  {
    const [a, b] = [await user(), await user()];
    await view(a, ids.slice(0, CAP));
    await race(b, 'serializable', ids.slice(0, 30));
    const ca = await counts(a), cb = await counts(b);
    check(ca.views === CAP && cb.views === 30 && cb.quota === 30,
      'one user at the cap does not limit another', JSON.stringify({ a: ca, b: cb }));
  }
} finally {
  if (created.companies.length) await owner.query('delete from public.companies where id = any($1)', [created.companies]);
  if (created.users.length) await owner.query('delete from auth.users where id = any($1)', [created.users]);
  const left = (await owner.query(
    `select (select count(*) from private.product_view_quota where viewer_user_id = any($1))
          + (select count(*) from public.product_views where viewer_user_id = any($1))::int as c`,
    [created.users])).rows[0].c;
  check(Number(left) === 0, 'cleanup removed all view and quota rows', `left=${left}`);
  await owner.end();
}

console.log(failures ? `PRODUCT VIEW CONCURRENCY: ${failures} FAILED` : 'PRODUCT VIEW CONCURRENCY: all passed');
if (failures) process.exitCode = 1;
