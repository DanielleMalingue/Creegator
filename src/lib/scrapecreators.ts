// ScrapeCreators API client (§3, §7.1) — discovery + enrichment data-in.
// Server-only: uses SCRAPECREATORS_API_KEY. Pay-as-you-go, ~1 credit/request.
// Base + auth confirmed from docs.scrapecreators.com.

const BASE = 'https://api.scrapecreators.com';

export class ScrapeCreatorsError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ScrapeCreatorsError';
  }
}

async function sc<T = unknown>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new ScrapeCreatorsError('Missing SCRAPECREATORS_API_KEY', 0);

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    headers: { 'x-api-key': key },
    // discovery data is fine to cache briefly; tune per-endpoint later
    cache: 'no-store',
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new ScrapeCreatorsError(
      `ScrapeCreators ${path} failed (${res.status})`,
      res.status,
      body,
    );
  }
  return body as T;
}

// --- Endpoints --------------------------------------------------------------

export const scrapeCreators = {
  tiktokProfile: (handle: string) => sc('/v1/tiktok/profile', { handle }),
  instagramProfile: (handle: string) => sc('/v1/instagram/profile', { handle }),
  youtubeChannel: (handle: string) => sc('/v1/youtube/channel', { handle }),
  tiktokHashtag: (hashtag: string) =>
    sc('/v1/tiktok/search/hashtag', { hashtag: hashtag.replace(/^#/, '') }),
  tiktokKeyword: (query: string) => sc('/v1/tiktok/search/keyword', { query }),
  linktree: (url: string) => sc('/v1/linktree', { url }),
};

// Pull the fields we care about out of a TikTok profile response into a shape
// close to our `creators` table. The API nests under `user`/`stats` or returns
// flat depending on endpoint version — we read defensively.
export function normalizeTikTokProfile(raw: Record<string, unknown>) {
  const user = (raw.user ?? raw) as Record<string, unknown>;
  const stats = (raw.stats ?? raw.statsV2 ?? user.stats ?? raw) as Record<string, unknown>;
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    handle: (user.uniqueId ?? user.unique_id ?? user.handle) as string | undefined,
    display_name: (user.nickname ?? user.display_name) as string | undefined,
    bio: (user.signature ?? user.bio) as string | undefined,
    follower_count: num(stats.followerCount ?? stats.follower_count ?? stats.followers),
    following_count: num(stats.followingCount ?? stats.following_count),
    like_count: num(stats.heartCount ?? stats.heart ?? stats.likes),
    video_count: num(stats.videoCount ?? stats.video_count),
    verified: Boolean(user.verified),
    link_in_bio: (user.bioLink as Record<string, unknown>)?.link as string | undefined,
    raw,
  };
}
