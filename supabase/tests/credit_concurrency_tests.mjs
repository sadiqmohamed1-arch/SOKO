// SOKO Migration 05 — concurrent credit spending tests.
//
// Needs several real sessions, so it cannot live in security_tests.sql.
// Run only against a disposable LOCAL database with all migrations applied:
//
//   SOKO_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres \
//   PG_MODULE=/path/to/node_modules/pg/lib/index.js \
//   node supabase/tests/credit_concurrency_tests.mjs
//
// Every transaction takes its snapshot, then waits at a barrier, then spends.
// That forces the stale-snapshot case on every run, at every isolation level.

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

const owner = await connect();
const created = { companies: [], users: [] };

async function company(balance) {
  const id = (await owner.query(
    `insert into public.companies (kind, legal_name) values ('supplier', 'Concurrency Co ' || gen_random_uuid()) returning id`,
  )).rows[0].id;
  created.companies.push(id);
  if (balance > 0) {
    await owner.query(`insert into public.credit_ledger (company_id, delta, reason) values ($1, $2, 'purchase')`, [id, balance]);
  }
  return id;
}
const balance = async co => (await owner.query('select private.credit_balance($1) b', [co])).rows[0].b;

async function race(n, isolation, statement, params, setup = []) {
  const clients = await Promise.all(Array.from({ length: n }, connect));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let ready = 0;
  const run = async c => {
    await c.query(`begin isolation level ${isolation}`);
    for (const s of setup) await c.query(s);
    await c.query('select count(*) from public.credit_ledger');
    if (++ready === n) release();
    await gate;
    try {
      await c.query(statement, params);
      await c.query('select pg_sleep(0.05)');
      await c.query('commit');
      return 'ok';
    } catch (e) {
      await c.query('rollback');
      return e.code;
    }
  };
  const outcomes = await Promise.all(clients.map(run));
  await Promise.all(clients.map(c => c.end()));
  return outcomes;
}

const summary = outcomes => outcomes.reduce((acc, o) => ({ ...acc, [o]: (acc[o] ?? 0) + 1 }), {});

try {
  // Overspend races at each isolation level: balance 10, eight parallel debits of 3.
  for (const isolation of ['read committed', 'repeatable read', 'serializable']) {
    const co = await company(10);
    const outcomes = await race(8, isolation,
      `select private.spend_credits($1, 3, 'campaign_launch', null)`, [co]);
    const ok = outcomes.filter(o => o === 'ok').length;
    const unexpected = outcomes.filter(o => !['ok', '53400', '40001'].includes(o));
    const final = await balance(co);
    check(final >= 0 && final === 10 - 3 * ok && unexpected.length === 0 && ok <= 3,
      `spend race (${isolation}) never overspends`, JSON.stringify({ final, ...summary(outcomes) }));
    if (isolation === 'read committed') {
      check(ok === 3, 'spend race (read committed) serves every affordable debit', `ok=${ok}`);
    }
  }

  // Platform-admin negative adjustments racing each other.
  const admin = (await owner.query(
    `insert into auth.users (id, email, aud, role, email_confirmed_at)
     values (gen_random_uuid(), 'conc-admin-' || gen_random_uuid() || '@soko-security.test', 'authenticated', 'authenticated', now())
     returning id`,
  )).rows[0].id;
  created.users.push(admin);
  await owner.query(`insert into public.platform_admins (user_id, note) values ($1, 'concurrency test')`, [admin]);
  const claims = JSON.stringify({ sub: admin, role: 'authenticated' });
  for (const isolation of ['read committed', 'repeatable read']) {
    const co = await company(10);
    const outcomes = await race(8, isolation, `select public.admin_adjust_credits($1, -3, null)`, [co],
      [`select set_config('request.jwt.claims', '${claims}', true)`, 'set local role authenticated']);
    const ok = outcomes.filter(o => o === 'ok').length;
    const final = await balance(co);
    const audits = (await owner.query(
      `select count(*)::int c from public.audit_log where company_id = $1 and action = 'credit_adjustment'`, [co])).rows[0].c;
    check(final >= 0 && final === 10 - 3 * ok && audits === ok && outcomes.every(o => ['ok', '53400', '40001'].includes(o)),
      `admin adjustment race (${isolation}) never goes negative`, JSON.stringify({ final, audits, ...summary(outcomes) }));
  }

  // Direct owner debits are caught by the overdraft trigger even without the functions.
  {
    const co = await company(10);
    const outcomes = await race(8, 'read committed',
      `insert into public.credit_ledger (company_id, delta, reason) values ($1, -3, 'campaign_launch')`, [co]);
    const final = await balance(co);
    check(final === 1 && outcomes.filter(o => o === 'ok').length === 3,
      'direct owner debit race is serialised by the overdraft trigger', JSON.stringify({ final, ...summary(outcomes) }));
  }

  // Spends and refunds interleaved: the final balance equals the committed sum.
  {
    const co = await company(6);
    const clients = 6;
    const spends = race(clients, 'read committed', `select private.spend_credits($1, 2, 'campaign_launch', null)`, [co]);
    const refunds = race(clients, 'read committed', `select private.add_credits($1, 1, 'campaign_refund', null)`, [co]);
    const [s, r] = await Promise.all([spends, refunds]);
    const expected = 6 - 2 * s.filter(o => o === 'ok').length + r.filter(o => o === 'ok').length;
    const final = await balance(co);
    check(final === expected && final >= 0, 'mixed spend/refund race keeps an exact, non-negative balance',
      JSON.stringify({ final, expected, spends: summary(s), refunds: summary(r) }));
  }

  // Monthly grants run concurrently grant at most once per company per month.
  {
    const co = await company(0);
    await owner.query(`update public.company_subscriptions set plan_id = 'supplier_pro', status = 'active' where company_id = $1`, [co]);
    const outcomes = await race(5, 'read committed', `select private.grant_monthly_credits($1::date)`, ['2032-07-19']);
    const grants = (await owner.query(
      `select count(*)::int c from public.credit_ledger where company_id = $1 and reason = 'monthly_grant'`, [co])).rows[0].c;
    check(grants === 1 && outcomes.every(o => o === 'ok'), 'concurrent monthly grants are idempotent',
      JSON.stringify({ grants, ...summary(outcomes) }));
  }
} finally {
  for (const id of created.companies) await owner.query('delete from public.companies where id = $1', [id]);
  for (const id of created.users) {
    await owner.query('delete from public.platform_admins where user_id = $1', [id]);
    await owner.query('delete from auth.users where id = $1', [id]);
  }
  await owner.end();
}

console.log(failures === 0 ? 'SOKO credit concurrency tests: all passed' : `SOKO credit concurrency tests: ${failures} failed`);
if (failures) process.exitCode = 1;
