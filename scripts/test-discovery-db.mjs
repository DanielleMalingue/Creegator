// 0-credit smoke test of the discovery DB path: replays the cached hashtag
// response and upserts creators via the service-role key. Mirrors the parse +
// insert logic in src/lib/discovery.ts to validate schema/enum/RLS compat.
//   node scripts/test-discovery-db.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const UGC = /\bugc\b|user generated|content creator|rate|collab|brand deal|portfolio|pr\/|dm to work/i;
const NICHES = {
  beauty: /beauty|skincare|makeup/i, fashion: /fashion|outfit|style/i,
  fitness: /fitness|gym|workout|wellness/i, food: /food|recipe|cook|snack/i,
  travel: /travel|trip/i, home: /home|interior|decor/i, tech: /tech|gadget|unbox/i,
  parenting: /mom|parent|baby|kids/i, lifestyle: /lifestyle|vlog|routine/i,
};

const body = JSON.parse(readFileSync('.cache/sc-hashtag-ugccreator.json', 'utf8'));
const seen = new Map();
for (const v of body.aweme_list || []) {
  const a = v.author || {};
  const h = a.unique_id || a.uniqueId;
  if (!h || seen.has(h)) continue;
  const bio = (a.signature || '').trim();
  const email = (bio.match(EMAIL) || [])[0] || null;
  if (!UGC.test(bio) && !email) continue;
  const tags = Object.entries(NICHES).filter(([, re]) => re.test(bio)).map(([n]) => n);
  let score = 30;
  if (email) score += 30;
  if (/\bugc\b|content creator/i.test(bio)) score += 20;
  if (/rate|collab|brand deal/i.test(bio)) score += 10;
  if (tags.length) score += Math.min(tags.length * 2, 6);
  seen.set(h, {
    dedupe_key: `tiktok:@${h}`, handle: `@${h}`, display_name: a.nickname || null,
    primary_platform: 'tiktok', niche: tags[0] || null, bio: bio || null, email,
    email_status: 'unverified', fit_score: Math.min(score, 100),
    fit_notes: tags.length ? `niche: ${tags.join(', ')}` : 'low signal',
    status: 'new', tags,
  });
}
const candidates = [...seen.values()];
console.log('parsed candidates:', candidates.length);

// ensure source
let { data: src } = await supabase.from('sources').select('id').eq('label', '#ugccreator').eq('type', 'hashtag').maybeSingle();
if (!src) {
  ({ data: src } = await supabase.from('sources').insert({ type: 'hashtag', label: '#ugccreator', platform: 'tiktok', query: '#ugccreator' }).select('id').single());
  console.log('created source', src?.id);
} else console.log('reused source', src.id);

const keys = candidates.map((c) => c.dedupe_key);
const { data: existing } = await supabase.from('creators').select('dedupe_key').in('dedupe_key', keys);
const have = new Set((existing || []).map((r) => r.dedupe_key));
const toInsert = candidates.filter((c) => !have.has(c.dedupe_key)).map((c) => ({ ...c, source_id: src?.id }));
console.log('already had:', candidates.length - toInsert.length, '| to insert:', toInsert.length);

if (toInsert.length) {
  const { error, count } = await supabase.from('creators').insert(toInsert, { count: 'exact' });
  if (error) { console.error('✗ insert error:', error.message, error.details || ''); process.exit(1); }
  console.log('✓ inserted', count, 'creators');
}
const { count: total } = await supabase.from('creators').select('*', { count: 'exact', head: true });
console.log('creators table total now:', total);
