import { createAdminClient } from '@/lib/supabase/admin';
import type { Creator, CampaignCreator, PipelineStage } from '@/lib/database.types';

// Internal CRM reads. These run server-side via the service_role client until
// team auth is wired up, after which they'll move to the RLS-scoped client.

export type CreatorRow = Creator & { sources: { label: string; type: string } | null };

export type EnrollmentRow = CampaignCreator & {
  stage: PipelineStage;
  campaigns: { name: string; brand: string | null; status: string } | null;
  messages: { id: string; direction: string; status: string; subject: string | null }[];
  deliverables: { id: string; content_url: string | null; views: number | null; likes: number | null }[];
  payments: { id: string; amount_cents: number; currency: string; status: string }[];
};

export async function listCreators(): Promise<CreatorRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('creators')
    .select('*, sources(label, type)')
    .order('fit_score', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as CreatorRow[];
}

export async function getCreator(
  id: string,
): Promise<{ creator: CreatorRow; enrollments: EnrollmentRow[] } | null> {
  const supabase = createAdminClient();

  const { data: creator, error } = await supabase
    .from('creators')
    .select('*, sources(label, type)')
    .eq('id', id)
    .single();
  if (error || !creator) return null;

  // Campaign enrollments (pipeline stage lives here), with campaign + activity.
  const { data: enrollments } = await supabase
    .from('campaign_creators')
    .select(
      '*, campaigns(name, brand, status), ' +
        'messages(id, direction, status, subject), ' +
        'deliverables(id, content_url, views, likes), ' +
        'payments(id, amount_cents, currency, status)',
    )
    .eq('creator_id', id)
    .order('priority', { ascending: false });

  return {
    creator: creator as unknown as CreatorRow,
    enrollments: (enrollments ?? []) as unknown as EnrollmentRow[],
  };
}

export async function listWaitlist() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('waitlist_signups')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}
