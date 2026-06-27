/**
 * Smoke-test main read APIs (list + first record by id).
 * Run: npm run test:api:smoke
 */
const BASE = process.env.API_BASE || 'http://localhost:6201/api';

const endpoints = [
  { name: 'Health', list: '/health', ok: (b) => b.status === 'ok' },
  { name: 'Departments', list: '/department?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/department/${id}` },
  { name: 'Business Categories', list: '/business-category?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/business-category/${id}` },
  { name: 'Users', list: '/user-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/user-master/${id}` },
  { name: 'Customers', list: '/customer-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/customer-master/${id}` },
  { name: 'Vendors', list: '/vendor-master?page=1&limit=5', id: (d) => d.data?.[0]?.id, detail: (id) => `/vendor-master/${id}` },
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

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  let body;
  try {
    body = await res.json();
  } catch {
    body = { parseError: true };
  }
  return { status: res.status, body };
}

async function testOne(ep) {
  const results = [];
  const list = await fetchJson(ep.list);
  const listOk = list.status >= 200 && list.status < 300 && isOk(list.body, ep.ok);
  results.push({ step: 'list', ok: listOk, status: list.status, code: list.body?.code, message: list.body?.message });

  if (ep.detail && listOk && ep.id) {
    const id = ep.id(list.body);
    if (id) {
      const detail = await fetchJson(ep.detail(id));
      const detailOk = detail.status >= 200 && detail.status < 300 && isOk(detail.body);
      results.push({ step: `detail/${id}`, ok: detailOk, status: detail.status, code: detail.body?.code, message: detail.body?.message });
    }
  }
  return results;
}

async function main() {
  console.log(`\n=== API Smoke Test (${BASE}) ===\n`);
  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    const results = await testOne(ep);
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
