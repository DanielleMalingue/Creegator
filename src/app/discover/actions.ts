'use server';

import { readFile } from 'node:fs/promises';
import { revalidatePath } from 'next/cache';
import { runHashtagDiscovery, type DiscoveryResult } from '@/lib/discovery';

export type DiscoverState =
  | { ok: true; result: DiscoveryResult }
  | { ok: false; error: string }
  | null;

export async function discoverAction(
  _prev: DiscoverState,
  formData: FormData,
): Promise<DiscoverState> {
  const hashtag = String(formData.get('hashtag') ?? '').replace(/^#/, '').trim();
  if (!hashtag) return { ok: false, error: 'Enter a hashtag.' };

  const useCache = formData.get('useCache') === 'on';
  const limit = Number(formData.get('limit') ?? 20) || 20;

  try {
    let body: { aweme_list?: unknown[]; credits_remaining?: number } | undefined;

    // Dev-only: replay a cached response so iterating costs 0 credits.
    if (useCache) {
      try {
        const raw = await readFile(`.cache/sc-hashtag-${hashtag}.json`, 'utf8');
        body = JSON.parse(raw);
      } catch {
        return { ok: false, error: `No cached response for #${hashtag} (.cache/sc-hashtag-${hashtag}.json).` };
      }
    }

    const result = await runHashtagDiscovery(hashtag, { body, limit, persist: true });
    revalidatePath('/creators');
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Discovery failed.' };
  }
}
