// range worker test: run `npm run build && npx wrangler dev --port 8791`, then `node worker/range.test.mjs`.
// optional: BASE=http://localhost:8791 node worker/range.test.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.BASE ?? 'http://localhost:8791';
const files = [
  ['/assets/work/whyclub/p-hero.mp4', 'video/mp4'],
  ['/assets/work/whyclub/p-hero.webm', 'video/webm'],
];

let passed = 0;
async function t(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok   ', name);
  } catch (e) {
    console.log('FAIL ', name, '\n     ', e.message);
    process.exitCode = 1;
  }
}

for (const [path, type] of files) {
  const disk = await readFile(new URL(`../public${path}`, import.meta.url));
  const size = disk.length;
  const get = (headers, method = 'GET') => fetch(base + path, { method, headers });
  const bytes = async (r) => Buffer.from(await r.arrayBuffer());
  const label = (s) => `${path.split('.').pop()}: ${s}`;

  await t(label('no range: 200, accept-ranges, full bytes, type'), async () => {
    const r = await get();
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('accept-ranges'), 'bytes');
    assert.equal(r.headers.get('content-type'), type);
    assert.equal(Number(r.headers.get('content-length')), size);
    assert.ok(r.headers.get('etag'));
    assert.ok((await bytes(r)).equals(disk));
  });

  await t(label('bytes=0-1 -> 206, 2 bytes'), async () => {
    const r = await get({ Range: 'bytes=0-1' });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes 0-1/${size}`);
    assert.equal(r.headers.get('content-length'), '2');
    assert.equal(r.headers.get('content-type'), type);
    assert.equal(r.headers.get('accept-ranges'), 'bytes');
    assert.ok((await bytes(r)).equals(disk.subarray(0, 2)));
  });

  await t(label('bytes=100- open ended'), async () => {
    const r = await get({ Range: 'bytes=100-' });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes 100-${size - 1}/${size}`);
    assert.ok((await bytes(r)).equals(disk.subarray(100)));
  });

  await t(label('bytes=-500 suffix'), async () => {
    const r = await get({ Range: 'bytes=-500' });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes ${size - 500}-${size - 1}/${size}`);
    assert.ok((await bytes(r)).equals(disk.subarray(size - 500)));
  });

  await t(label('middle range spanning many chunks'), async () => {
    const a = 12345;
    const b = Math.min(size - 1, a + 300000);
    const r = await get({ Range: `bytes=${a}-${b}` });
    assert.equal(r.status, 206);
    assert.ok((await bytes(r)).equals(disk.subarray(a, b + 1)));
  });

  await t(label('end past EOF is clamped'), async () => {
    const r = await get({ Range: `bytes=${size - 10}-${size + 5000}` });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes ${size - 10}-${size - 1}/${size}`);
    assert.ok((await bytes(r)).equals(disk.subarray(size - 10)));
  });

  await t(label('start past EOF -> 416 bytes */size'), async () => {
    const r = await get({ Range: `bytes=${size + 10}-` });
    assert.equal(r.status, 416);
    assert.equal(r.headers.get('content-range'), `bytes */${size}`);
  });

  await t(label('HEAD (no range)'), async () => {
    const r = await get(undefined, 'HEAD');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-length'), String(size));
    assert.equal(r.headers.get('accept-ranges'), 'bytes');
    assert.equal((await bytes(r)).length, 0);
  });

  await t(label('HEAD with range -> 206 headers only'), async () => {
    const r = await get({ Range: 'bytes=0-9' }, 'HEAD');
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-length'), '10');
    assert.equal((await bytes(r)).length, 0);
  });

  await t(label('If-Range match -> 206'), async () => {
    const etag = (await get()).headers.get('etag');
    const r = await get({ Range: 'bytes=0-9', 'If-Range': etag });
    assert.equal(r.status, 206);
    assert.equal((await bytes(r)).length, 10);
  });

  await t(label('If-Range mismatch -> 200 full'), async () => {
    const r = await get({ Range: 'bytes=0-9', 'If-Range': '"nope"' });
    assert.equal(r.status, 200);
    assert.ok((await bytes(r)).equals(disk));
  });

  await t(label('garbage / multi range -> 200 full'), async () => {
    for (const range of ['bytes=a-b', 'items=0-1', 'bytes=0-1,5-9']) {
      const r = await get({ Range: range });
      assert.equal(r.status, 200, range);
      assert.equal((await bytes(r)).length, size, range);
    }
  });

  await t(label('cache-control is set by the worker'), async () => {
    const r = await get();
    assert.match(r.headers.get('cache-control'), /max-age=86400/);
    await r.arrayBuffer();
  });
}

await t('missing video -> 404', async () => {
  const r = await fetch(base + '/assets/nope.mp4', { headers: { Range: 'bytes=0-1' } });
  assert.equal(r.status, 404);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
