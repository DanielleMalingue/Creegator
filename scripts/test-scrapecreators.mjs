// Quick live test of the ScrapeCreators API. Usage:
//   node scripts/test-scrapecreators.mjs [handle]
//   node scripts/test-scrapecreators.mjs --hashtag ugccreator
// Reads SCRAPECREATORS_API_KEY from .env.local. Each call costs ~1 credit.

import { readFileSync } from 'node:fs';

// minimal .env.local parser (no deps)
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !(m[1] in process.env)) {
        let v = m[2];
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}
loadEnv('.env.local');

const KEY = process.env.SCRAPECREATORS_API_KEY;
if (!KEY) {
  console.error('✗ SCRAPECREATORS_API_KEY not set in .env.local');
  process.exit(1);
}

const BASE = 'https://api.scrapecreators.com';
const args = process.argv.slice(2);

async function call(path, params) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'x-api-key': KEY } });
  const ms = Date.now() - t0;
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, ms, body };
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

(async () => {
  if (args[0] === '--hashtag') {
    const tag = (args[1] || 'ugccreator').replace(/^#/, '');
    console.log(`→ GET /v1/tiktok/search/hashtag?hashtag=${tag}`);
    const r = await call('/v1/tiktok/search/hashtag', { hashtag: tag });
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.status} in ${r.ms}ms`);
    console.log('  top-level keys:', r.body && typeof r.body === 'object' ? Object.keys(r.body) : r.body);
    console.log(JSON.stringify(r.body, null, 2).slice(0, 1500));
    process.exit(r.ok ? 0 : 1);
  }

  const handle = args[0] || 'stoolpresidente';
  console.log(`→ GET /v1/tiktok/profile?handle=${handle}`);
  const r = await call('/v1/tiktok/profile', { handle });
  console.log(`  ${r.ok ? '✓ SUCCESS' : '✗ FAILED'} — HTTP ${r.status} in ${r.ms}ms`);

  if (!r.ok) {
    console.log('  error body:', JSON.stringify(r.body, null, 2).slice(0, 800));
    process.exit(1);
  }

  const b = r.body || {};
  const user = b.user ?? b;
  const stats = b.stats ?? b.statsV2 ?? user.stats ?? b;
  console.log('\n  Parsed:');
  console.log('   handle   :', user.uniqueId ?? user.unique_id ?? user.handle);
  console.log('   name     :', user.nickname ?? user.display_name);
  console.log('   verified :', Boolean(user.verified));
  console.log('   followers:', num(stats.followerCount ?? stats.followers));
  console.log('   likes    :', num(stats.heartCount ?? stats.likes));
  console.log('   videos   :', num(stats.videoCount));
  console.log('   bio      :', (user.signature ?? user.bio ?? '').slice(0, 120));
  console.log('   bio link :', user.bioLink?.link ?? '(none)');
  console.log('\n  Raw top-level keys:', Object.keys(b));
})();
