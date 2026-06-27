/**
 * Smoke-test main read APIs (list + first record by id).
 * Run: npm run test:api:smoke
 *
 * Env: API_BASE, SMOKE_USER (default admin), SMOKE_PASS (default admin123)
 */
const BASE = process.env.API_BASE || 'http://localhost:6201/api';
const USER = process.env.SMOKE_USER || 'admin';
const PASS = process.env.SMOKE_PASS || 'admin123';

const endpoints = [
  { name: 'Health', list: '/health', ok: (b) => b.status === 'ok', public: true },
  { name: 'Departments', list: '/department?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/department/${id}`, public: true },
  { name: 'Business Categories', list: '/business-category?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/business-category/${id}`, public: true },
  { name: 'Users', list: '/user-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/user-master/${id}` },
  { name: 'Customers', list: '/customer-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/customer-master/${id}`, public: true },
  { name: 'Vendors', list: '/vendor-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/vendor-master/${id}`, public: true },
  { name: 'Lens Categories', list: '/v1/lens-categories?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/v1/lens-categories/${id}` },
  { name: 'Lens Brands', list: '/v1/lens-brands?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/v1/lens-brands/${id}` },
  { name: 'Lens Types', list: '/v1/lens-types?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/v1/lens-types/${id}` },
  { name: 'Lens Products', list: '/v1/lens-products?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/v1/lens-products/${id}` },
  { name: 'Locations', list: '/v1/location-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/v1/location-master/${id}` },
  { name: 'Sale Orders', list: '/sale-orders?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/sale-orders/${id}` },
  { name: 'Purchase Orders', list: '/purchase-orders?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/purchase-orders/${id}` },
  { name: 'Invoices', list: '/invoices?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/invoices/${id}` },
  { name: 'Ledgers', list: '/ledgers?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/ledgers/${id}` },
];

function isOk(body, customOk) {
  if (customOk) return customOk(body);
  return body?.success === true || (body?.data !== undefined && body?.status !== 'error');
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const body = await res.json();
  if (!res.ok || !body?.data?.accessToken) {
    throw new Error(body?.message || `Login failed (${res.status})`);
  }
  return body.data.accessToken;
}

async function fetchJson(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  let body;
  try {
    body = await res.json();
  } catch {
    body = { parseError: true };
  }
  return { status: res.status, body };
}

async function testOne(ep, token) {
  const results = [];
  const authToken = ep.public ? undefined : token;
  const list = await fetchJson(ep.list, authToken);
  const listOk = list.status >= 200 && list.status < 300 && isOk(list.body, ep.ok);
  results.push({ step: 'list', ok: listOk, status: list.status, code: list.body?.code, message: list.body?.message });

  if (ep.detail && listOk && ep.id) {
    const id = ep.id(list.body);
    if (id) {
      const detail = await fetchJson(ep.detail(id), authToken);
      const detailOk = detail.status >= 200 && detail.status < 300 && isOk(detail.body);
      results.push({ step: `detail/${id}`, ok: detailOk, status: detail.status, code: detail.body?.code, message: detail.body?.message });
    }
  }
  return results;
}

async function main() {
  console.log(`\n=== API Smoke Test (${BASE}) ===\n`);

  let token;
  try {
    token = await login();
    console.log(`🔐 Logged in as ${USER}\n`);
  } catch (e) {
    console.warn(`⚠️  Login skipped: ${e.message} — protected routes will fail\n`);
  }

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    const results = await testOne(ep, token);
    for (const r of results) {
      const icon = r.ok ? '✅' : '❌';
      console.log(`${icon} ${ep.name} ${r.step} → ${r.status}${r.code ? ` [${r.code}]` : ''}${r.message ? ` — ${r.message}` : ''}`);
      if (r.ok) passed++;
      else failed++;
    }
  }

  console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
