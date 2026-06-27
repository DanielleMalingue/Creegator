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

// --- Dashboard / overview ---------------------------------------------------

export type DashboardStats = {
  totalCreators: number;
  enrichedCreators: number;
  withEmail: number;
  byStatus: Record<string, number>;
  stageCounts: Record<string, number>;
  campaigns: number;
  waitlist: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const [creatorsRes, enrollRes, campaignsRes, waitlistRes] = await Promise.all([
    supabase.from('creators').select('status, follower_count, email'),
    supabase.from('campaign_creators').select('stage'),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    supabase.from('waitlist_signups').select('id', { count: 'exact', head: true }),
  ]);

  const creators = (creatorsRes.data ?? []) as {
    status: string;
    follower_count: number | null;
    email: string | null;
  }[];
  const enrollments = (enrollRes.data ?? []) as { stage: string }[];

  const byStatus: Record<string, number> = {};
  for (const c of creators) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;

  const stageCounts: Record<string, number> = {};
  for (const e of enrollments) stageCounts[e.stage] = (stageCounts[e.stage] ?? 0) + 1;

  return {
    totalCreators: creators.length,
    enrichedCreators: creators.filter((c) => c.follower_count != null).length,
    withEmail: creators.filter((c) => c.email).length,
    byStatus,
    stageCounts,
    campaigns: campaignsRes.count ?? 0,
    waitlist: waitlistRes.count ?? 0,
  };
}

// --- Campaigns --------------------------------------------------------------

export type CampaignSummary = {
  id: string;
  name: string;
  brand: string | null;
  status: string;
  creatorCount: number;
  stageCounts: Record<string, number>;
};

export async function listCampaigns(): Promise<CampaignSummary[]> {
  const supabase = createAdminClient();
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, brand, status')
    .order('created_at', { ascending: false });

  const { data: enrollments } = await supabase
    .from('campaign_creators')
    .select('campaign_id, stage');

  const byCampaign = new Map<string, { count: number; stages: Record<string, number> }>();
  for (const e of (enrollments ?? []) as { campaign_id: string; stage: string }[]) {
    const agg = byCampaign.get(e.campaign_id) ?? { count: 0, stages: {} };
    agg.count++;
    agg.stages[e.stage] = (agg.stages[e.stage] ?? 0) + 1;
    byCampaign.set(e.campaign_id, agg);
  }

  return ((campaigns ?? []) as { id: string; name: string; brand: string | null; status: string }[]).map(
    (c) => ({
      ...c,
      creatorCount: byCampaign.get(c.id)?.count ?? 0,
      stageCounts: byCampaign.get(c.id)?.stages ?? {},
    }),
  );
}

// --- Outreach (§7.5) --------------------------------------------------------

export type OutreachTarget = {
  enrollmentId: string;
  stage: string;
  creator: {
    id: string;
    display_name: string | null;
    handle: string | null;
    niche: string | null;
    bio: string | null;
    fit_notes: string | null;
    fit_score: number | null;
    follower_count: number | null;
    email: string | null;
    primary_platform: string;
  };
  campaign: { id: string; name: string; brand: string | null } | null;
  draft: { id: string; subject: string | null; body: string | null; ai_opener: string | null } | null;
};

export async function listOutreachTargets(): Promise<OutreachTarget[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('campaign_creators')
    .select(
      'id, stage, ' +
        'creators(id, display_name, handle, niche, bio, fit_notes, fit_score, follower_count, email, primary_platform), ' +
        'campaigns(id, name, brand), ' +
        'messages(id, subject, body, ai_opener, direction, status)',
    )
    .order('priority', { ascending: false });

  type Row = {
    id: string;
    stage: string;
    creators: OutreachTarget['creator'] | null;
    campaigns: OutreachTarget['campaign'];
    messages: Array<{
      id: string;
      subject: string | null;
      body: string | null;
      ai_opener: string | null;
      direction: string;
      status: string;
    }> | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.creators)
    .map((r) => {
      const draft = (r.messages ?? []).find((m) => m.direction === 'outbound' && m.status === 'draft') ?? null;
      return {
        enrollmentId: r.id,
        stage: r.stage,
        creator: r.creators!,
        campaign: r.campaigns,
        draft: draft
          ? { id: draft.id, subject: draft.subject, body: draft.body, ai_opener: draft.ai_opener }
          : null,
      };
    });
}

export async function getCampaign(id: string) {
  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();
  if (!campaign) return null;

  const { data: enrollments } = await supabase
    .from('campaign_creators')
    .select('id, stage, priority, notes, creators(id, display_name, handle, niche, fit_score, follower_count, email)')
    .eq('campaign_id', id)
    .order('priority', { ascending: false });

  return {
    campaign: campaign as unknown as {
      id: string;
      name: string;
      brand: string | null;
      status: string;
      description: string | null;
    },
    enrollments: (enrollments ?? []) as unknown as Array<{
      id: string;
      stage: string;
      priority: number;
      notes: string | null;
      creators: {
        id: string;
        display_name: string | null;
        handle: string | null;
        niche: string | null;
        fit_score: number | null;
        follower_count: number | null;
        email: string | null;
      } | null;
    }>,
  };
}
