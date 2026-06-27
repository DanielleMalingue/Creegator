import { createAdminClient } from '@/lib/supabase/admin';
import { scrapeCreators } from '@/lib/scrapecreators';
import type { Platform } from '@/lib/database.types';

// Discovery flow (§7.1): hashtag search → extract authors → upsert creators.
// One hashtag call (~1 credit) yields ~20 creators with handle + bio + email.
// Follower counts are unreliable in search results, so profile enrichment
// (1 credit each) is opt-in and capped.

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// Niche keywords → bucket. First match wins for the primary niche; all matches
// become tags. Danielle owns the real "good UGC fit" definition (§5) — this is
// a transparent starter heuristic.
const NICHE_KEYWORDS: Record<string, RegExp> = {
  beauty: /beauty|skincare|makeup|cosmetic|skin\b/i,
  fashion: /fashion|outfit|style|clothing|apparel/i,
  fitness: /fitness|gym|workout|health|wellness/i,
  food: /food|recipe|cook|snack|eat|restaurant/i,
  travel: /travel|trip|adventure|wanderlust/i,
  home: /home|interior|decor|cozy|cleaning/i,
  tech: /tech|gadget|unbox|software|app\b/i,
  parenting: /mom|parent|baby|kids|family/i,
  lifestyle: /lifestyle|daily|vlog|routine/i,
};

const UGC_SIGNAL = /\bugc\b|user generated|content creator|rate|collab|brand deal|portfolio|pr\/|dm to work/i;

export type CreatorCandidate = {
  dedupe_key: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  email: string | null;
  niche: string | null;
  tags: string[];
  fit_score: number;
  fit_notes: string;
  raw: Record<string, unknown>;
};

function inferNiche(bio: string): { niche: string | null; tags: string[] } {
  const tags: string[] = [];
  for (const [niche, re] of Object.entries(NICHE_KEYWORDS)) {
    if (re.test(bio)) tags.push(niche);
  }
  return { niche: tags[0] ?? null, tags };
}

// Transparent 0–100 fit heuristic. Rewards the strongest paid-UGC signals:
// a contact email, explicit UGC language, a portfolio/rate mention.
function scoreFit(bio: string, email: string | null, tags: string[]): { score: number; notes: string } {
  const reasons: string[] = [];
  let score = 30;
  if (email) { score += 30; reasons.push('contact email in bio'); }
  if (/\bugc\b|user generated|content creator/i.test(bio)) { score += 20; reasons.push('explicit UGC'); }
  if (/rate|collab|brand deal|pr\//i.test(bio)) { score += 10; reasons.push('open to collabs'); }
  if (/portfolio|rate card|link in bio/i.test(bio)) { score += 8; reasons.push('portfolio/rates'); }
  if (tags.length) { score += Math.min(tags.length * 2, 6); reasons.push(`niche: ${tags.join(', ')}`); }
  return { score: Math.min(score, 100), notes: reasons.join('; ') || 'low signal' };
}

// Parse a /v1/tiktok/search/hashtag response into deduped candidates.
export function parseHashtagAuthors(body: {
  aweme_list?: Array<{ author?: Record<string, unknown> }>;
}): CreatorCandidate[] {
  const out = new Map<string, CreatorCandidate>();
  for (const v of body.aweme_list ?? []) {
    const a = v.author ?? {};
    const handle = (a.unique_id ?? a.uniqueId) as string | undefined;
    if (!handle || out.has(handle)) continue;

    const bio = ((a.signature as string) ?? '').trim();
    const email = (bio.match(EMAIL_RE) ?? [])[0] ?? null;
    const { niche, tags } = inferNiche(bio);
    if (!UGC_SIGNAL.test(bio) && !email) continue; // skip low-signal noise
    const { score, notes } = scoreFit(bio, email, tags);

    out.set(handle, {
      dedupe_key: `tiktok:@${handle}`,
      handle,
      display_name: ((a.nickname as string) ?? null) || null,
      bio: bio || null,
      email,
      niche,
      tags,
      fit_score: score,
      fit_notes: notes,
      raw: a,
    });
  }
  return [...out.values()].sort((x, y) => y.fit_score - x.fit_score);
}

export type DiscoveryResult = {
  hashtag: string;
  creditsRemaining: number | null;
  found: number;
  inserted: number;
  skippedExisting: number;
  candidates: CreatorCandidate[];
};

// Run discovery for a hashtag and upsert new creators (deduped, non-destructive:
// existing creators are left untouched). `body` lets tests pass a cached
// response so no credits are spent.
export async function runHashtagDiscovery(
  hashtag: string,
  opts: { limit?: number; body?: { aweme_list?: unknown[]; credits_remaining?: number }; persist?: boolean } = {},
): Promise<DiscoveryResult> {
  const tag = hashtag.replace(/^#/, '').trim();
  const body =
    opts.body ??
    ((await scrapeCreators.tiktokHashtag(tag)) as {
      aweme_list?: unknown[];
      credits_remaining?: number;
    });

  const creditsRemaining = (body.credits_remaining as number) ?? null;
  let candidates = parseHashtagAuthors(body as Parameters<typeof parseHashtagAuthors>[0]);
  if (opts.limit) candidates = candidates.slice(0, opts.limit);

  const result: DiscoveryResult = {
    hashtag: tag,
    creditsRemaining,
    found: candidates.length,
    inserted: 0,
    skippedExisting: 0,
    candidates,
  };

  if (opts.persist === false || candidates.length === 0) return result;

  const supabase = createAdminClient();

  // Ensure a source row for this hashtag (reused across runs).
  const sourceLabel = `#${tag}`;
  const { data: existingSource } = await supabase
    .from('sources')
    .select('id')
    .eq('label', sourceLabel)
    .eq('type', 'hashtag')
    .maybeSingle();

  let sourceId = (existingSource as { id: string } | null)?.id ?? null;
  if (!sourceId) {
    const { data: newSource } = await supabase
      .from('sources')
      .insert({ type: 'hashtag', label: sourceLabel, platform: 'tiktok' as Platform, query: `#${tag}` } as never)
      .select('id')
      .single();
    sourceId = (newSource as { id: string } | null)?.id ?? null;
  }

  // Skip creators we already have (non-destructive).
  const keys = candidates.map((c) => c.dedupe_key);
  const { data: existing } = await supabase
    .from('creators')
    .select('dedupe_key')
    .in('dedupe_key', keys);
  const have = new Set((((existing ?? []) as { dedupe_key: string }[]).map((r) => r.dedupe_key)));

  const toInsert = candidates
    .filter((c) => !have.has(c.dedupe_key))
    .map((c) => ({
      dedupe_key: c.dedupe_key,
      handle: `@${c.handle}`,
      display_name: c.display_name,
      primary_platform: 'tiktok' as Platform,
      niche: c.niche,
      bio: c.bio,
      email: c.email,
      email_status: 'unverified' as const,
      fit_score: c.fit_score,
      fit_notes: c.fit_notes,
      status: 'new' as const,
      tags: c.tags,
      raw: c.raw,
      source_id: sourceId,
    }));

  result.skippedExisting = candidates.length - toInsert.length;

  if (toInsert.length) {
    const { error } = await supabase.from('creators').insert(toInsert as never);
    if (error) throw error;
    result.inserted = toInsert.length;
  }
  return result;
}
