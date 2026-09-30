const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer } = require('../src/server');

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: data
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (_) {
            json = text;
          }
          resolve({ status: res.statusCode, body: json });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

describe('HTTP server', () => {
  let server;
  let port;

  before(async () => {
    server = createServer(
      { printerName: 'TestPrinter', printMode: 'dry-run', port: 0 },
      {
        printLabelFn: async (value) => ({ ok: true, method: 'mock', value }),
        listPrintersFn: async () => ['A', 'B'],
      },
    );
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    port = server.address().port;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /health returns 200', async () => {
    const res = await request(port, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.printerName, 'TestPrinter');
  });

  it('POST /api/print/fg-label without value returns 400', async () => {
    const res = await request(port, 'POST', '/api/print/fg-label', {});
    assert.equal(res.status, 400);
    assert.match(res.body.message, /value/i);
  });

  it('POST /api/print/fg-label with value returns 200', async () => {
    const res = await request(port, 'POST', '/api/print/fg-label', {
      value: 'PCB/09092026',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 200);
    assert.equal(res.body.result.value, 'PCB/09092026');
  });

  it('GET /api/printers lists printers', async () => {
    const res = await request(port, 'GET', '/api/printers');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.printers, ['A', 'B']);
  });

  it('POST /api/print/fg-label returns 500 instead of hanging', async () => {
    const hung = createServer(
      { printerName: 'Fake', printMode: 'auto', port: 0 },
      {
        printTimeoutMs: 50,
        printLabelFn: () => new Promise(() => {}),
      },
    );
    await new Promise((resolve) => hung.listen(0, '127.0.0.1', resolve));
    const hungPort = hung.address().port;
    const started = Date.now();
    try {
      const res = await request(hungPort, 'POST', '/api/print/fg-label', { value: 'PCB-01' });
      assert.equal(res.status, 500);
      assert.match(res.body.message, /timed out/i);
      assert.ok(Date.now() - started < 2000);
    } finally {
      await new Promise((resolve) => hung.close(resolve));
    }
  });
});
