'use server';

import { revalidatePath } from 'next/cache';
import { enrichCreators, type EnrichResult } from '@/lib/enrichment';

export type EnrichState =
  | { ok: true; result: EnrichResult }
  | { ok: false; error: string }
  | null;

export async function enrichAction(_prev: EnrichState, formData: FormData): Promise<EnrichState> {
  const ids = String(formData.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return { ok: false, error: 'Nothing to enrich.' };

  // Hard cap to avoid a runaway credit spend from one click.
  const maxCredits = Math.min(ids.length, 25);

  try {
    const result = await enrichCreators(ids, { maxCredits });
    revalidatePath('/creators');
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Enrichment failed.' };
  }
}
