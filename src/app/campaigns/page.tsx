import Link from 'next/link';
import { listCampaigns } from '@/lib/data';
import { isAdminConfigured } from '@/lib/supabase/admin';
import { PIPELINE_STAGES } from '@/lib/database.types';
import { stageStyle, titleize } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  if (!isAdminConfigured()) {
    return <Page><p className="text-zinc-500">Set SUPABASE_SERVICE_ROLE_KEY to load data.</p></Page>;
  }
  const campaigns = await listCampaigns();

  return (
    <Page>
      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-10 text-center text-zinc-500">
          No campaigns yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="rounded-xl border border-black/10 p-5 transition-colors hover:border-brand/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  {c.brand && <div className="text-xs text-zinc-500">{c.brand}</div>}
                </div>
                <span className="rounded-full bg-brand/12 px-2 py-0.5 text-xs font-medium text-brand-dark">
                  {c.status}
                </span>
              </div>
              <div className="mt-3 text-sm text-zinc-600">{c.creatorCount} creators</div>
              <div className="mt-3 flex gap-1">
                {PIPELINE_STAGES.map((st) => {
                  const n = c.stageCounts[st] ?? 0;
                  if (!n) return null;
                  return (
                    <span
                      key={st}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${stageStyle[st]}`}
                      title={titleize(st)}
                    >
                      {titleize(st)} {n}
                    </span>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-zinc-500">Outreach pushes — creators move through the pipeline here.</p>
        </div>
      </div>
      {children}
    </div>
  );
}
