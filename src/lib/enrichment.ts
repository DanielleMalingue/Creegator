import { createAdminClient } from '@/lib/supabase/admin';
import { scrapeCreators } from '@/lib/scrapecreators';

// Enrichment (§7.1, §4): turn a thin discovered creator into a usable one by
// pulling the full TikTok profile — real follower count, engagement, and the
// link-in-bio where rate cards live. Costs 1 credit per creator, so it's always
// an explicit, metered step (never auto-run during discovery).

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

type ProfileResp = {
  credits_remaining?: number;
  user?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  statsV2?: Record<string, unknown>;
  itemList?: Array<{ stats?: Record<string, unknown> }>;
};

// Engagement rate from recent videos when available: avg(likes+comments+shares)
// / followers. Falls back to avg-likes-per-video / followers from totals.
function engagementRate(p: ProfileResp, followers: number | null): number | null {
  if (!followers) return null;
  const items = p.itemList ?? [];
  if (items.length) {
    let interactions = 0;
    let counted = 0;
    for (const it of items) {
      const s = it.stats ?? {};
      const d = Number(s.diggCount ?? 0) + Number(s.commentCount ?? 0) + Number(s.shareCount ?? 0);
      if (Number.isFinite(d)) { interactions += d; counted++; }
    }
    if (counted) return Math.min(interactions / counted / followers, 1);
  }
  const stats = p.statsV2 ?? p.stats ?? {};
  const likes = Number(stats.heartCount ?? stats.heart ?? 0);
  const videos = Number(stats.videoCount ?? 0);
  if (likes && videos) return Math.min(likes / videos / followers, 1);
  return null;
}

export type EnrichResult = {
  attempted: number;
  enriched: number;
  failed: { handle: string; reason: string }[];
  creditsRemaining: number | null;
};

// Enrich the given creator ids (TikTok). `maxCredits` hard-caps spend.
export async function enrichCreators(
  ids: string[],
  opts: { maxCredits?: number } = {},
): Promise<EnrichResult> {
  const supabase = createAdminClient();
  const cap = opts.maxCredits ?? ids.length;

  const { data: rows } = await supabase
    .from('creators')
    .select('id, handle, dedupe_key, primary_platform, email, tags')
    .in('id', ids);

  const creators = ((rows ?? []) as {
    id: string;
    handle: string | null;
    dedupe_key: string;
    primary_platform: string;
    email: string | null;
    tags: string[];
  }[]).slice(0, cap);

  const result: EnrichResult = { attempted: 0, enriched: 0, failed: [], creditsRemaining: null };

  for (const c of creators) {
    const handle = (c.handle ?? c.dedupe_key.split('@')[1] ?? '').replace(/^@/, '');
    if (!handle || c.primary_platform !== 'tiktok') {
      result.failed.push({ handle: c.handle ?? c.dedupe_key, reason: 'no tiktok handle' });
      continue;
    }
    result.attempted++;
    try {
      const p = (await scrapeCreators.tiktokProfile(handle)) as ProfileResp;
      result.creditsRemaining = p.credits_remaining ?? result.creditsRemaining;
      const user = p.user ?? {};
      const stats = p.statsV2 ?? p.stats ?? {};

      const followers = num(stats.followerCount ?? stats.follower_count ?? stats.followers);
      const bioLink = (user.bioLink as { link?: string } | undefined)?.link ?? null;
      const sig = String(user.signature ?? '');
      const verified = Boolean(user.verified);

      const update = {
        display_name: (user.nickname as string) || null,
        bio: sig || null,
        follower_count: followers,
        engagement_rate: engagementRate(p, followers),
        link_in_bio: bioLink,
        email: c.email ?? (sig.match(EMAIL_RE) ?? [])[0] ?? null,
        tags: verified && !c.tags.includes('verified') ? [...c.tags, 'verified'] : c.tags,
        status: 'enriched' as const,
        raw: p as unknown as Record<string, unknown>,
      };

      const { error } = await supabase.from('creators').update(update as never).eq('id', c.id);
      if (error) {
        result.failed.push({ handle, reason: error.message });
      } else {
        result.enriched++;
      }
    } catch (e) {
      result.failed.push({ handle, reason: e instanceof Error ? e.message : 'fetch failed' });
    }
  }
  return result;
}
