'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOpener, type GeneratedOpener } from '@/lib/anthropic';

export type GenState =
  | { ok: true; enrollmentId: string; result: GeneratedOpener }
  | { ok: false; error: string }
  | null;

// Generate a Claude opener for one enrolled creator (§7.5). Does not persist —
// the user reviews, edits, then saves as a draft.
export async function generateOpenerAction(_prev: GenState, formData: FormData): Promise<GenState> {
  const enrollmentId = String(formData.get('enrollmentId') ?? '');
  if (!enrollmentId) return { ok: false, error: 'Missing enrollment.' };

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('campaign_creators')
      .select(
        'creators(display_name, handle, niche, bio, fit_notes, follower_count, primary_platform), ' +
          'campaigns(name, brand)',
      )
      .eq('id', enrollmentId)
      .single();

    const row = data as unknown as {
      creators: {
        display_name: string | null;
        handle: string | null;
        niche: string | null;
        bio: string | null;
        fit_notes: string | null;
        follower_count: number | null;
        primary_platform: string;
      } | null;
      campaigns: { name: string; brand: string | null } | null;
    } | null;

    if (!row?.creators) return { ok: false, error: 'Creator not found.' };
    const c = row.creators;

    const result = await generateOpener({
      displayName: c.display_name,
      handle: c.handle,
      niche: c.niche,
      bio: c.bio,
      fitNotes: c.fit_notes,
      followerCount: c.follower_count,
      platform: c.primary_platform,
      brand: row.campaigns?.brand ?? null,
      campaign: row.campaigns?.name ?? null,
    });

    return { ok: true, enrollmentId, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Generation failed.' };
  }
}

export type SaveState = { ok: true } | { ok: false; error: string } | null;

// Save (or update) the outbound draft message for an enrollment.
export async function saveDraftAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const enrollmentId = String(formData.get('enrollmentId') ?? '');
  const subject = String(formData.get('subject') ?? '').trim();
  const opener = String(formData.get('opener') ?? '').trim();
  if (!enrollmentId || !opener) return { ok: false, error: 'Nothing to save.' };

  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('campaign_creator_id', enrollmentId)
      .eq('direction', 'outbound')
      .eq('status', 'draft')
      .maybeSingle();

    const existingId = (existing as { id: string } | null)?.id;
    const payload = {
      campaign_creator_id: enrollmentId,
      direction: 'outbound' as const,
      status: 'draft' as const,
      subject: subject || null,
      body: opener,
      ai_opener: opener,
    };

    if (existingId) {
      await supabase.from('messages').update(payload as never).eq('id', existingId);
    } else {
      await supabase.from('messages').insert(payload as never);
    }

    revalidatePath('/outreach');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed.' };
  }
}
