import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaign } from '@/lib/data';
import { isAdminConfigured } from '@/lib/supabase/admin';
import { PIPELINE_STAGES } from '@/lib/database.types';
import { compact, stageStyle, titleize } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAdminConfigured()) {
    return <div className="mx-auto max-w-5xl px-6 py-8 text-zinc-500">Set SUPABASE_SERVICE_ROLE_KEY.</div>;
  }

  const data = await getCampaign(id);
  if (!data) notFound();
  const { campaign, enrollments } = data;

  // Group enrollments into stage columns (kanban-style read view).
  const columns = PIPELINE_STAGES.map((stage) => ({
    stage,
    rows: enrollments.filter((e) => e.stage === stage),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <Link href="/campaigns" className="text-sm text-brand-dark hover:underline">
        ← Campaigns
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-zinc-500">
            {campaign.brand && <>{campaign.brand} · </>}
            {campaign.status} · {enrollments.length} creators
          </p>
        </div>
      </div>
      {campaign.description && <p className="mt-2 max-w-2xl text-sm text-zinc-600">{campaign.description}</p>}

      <div className="mt-6 grid grid-flow-col gap-3 overflow-x-auto pb-4 [grid-auto-columns:minmax(220px,1fr)]">
        {columns.map((col) => (
          <div key={col.stage} className="rounded-xl border border-black/10 bg-zinc-50/50">
            <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageStyle[col.stage]}`}>
                {titleize(col.stage)}
              </span>
              <span className="text-xs font-semibold text-zinc-400">{col.rows.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {col.rows.map((e) => {
                const cr = e.creators;
                if (!cr) return null;
                return (
                  <Link
                    key={e.id}
                    href={`/creators/${cr.id}`}
                    className="block rounded-lg border border-black/10 bg-white p-2.5 text-sm transition-colors hover:border-brand/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cr.display_name ?? cr.handle}</span>
                      {cr.fit_score != null && (
                        <span className="text-xs font-bold text-brand-dark">{cr.fit_score}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {cr.niche ?? '—'} · {compact(cr.follower_count)}
                    </div>
                  </Link>
                );
              })}
              {col.rows.length === 0 && <div className="px-1 py-2 text-xs text-zinc-300">—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
