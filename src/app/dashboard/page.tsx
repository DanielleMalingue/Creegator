import Link from 'next/link';
import { getDashboardStats } from '@/lib/data';
import { isAdminConfigured } from '@/lib/supabase/admin';
import { PIPELINE_STAGES } from '@/lib/database.types';
import { stageStyle, creatorStatusStyle, titleize } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (!isAdminConfigured()) {
    return (
      <Page>
        <p className="text-zinc-500">Set SUPABASE_SERVICE_ROLE_KEY in .env.local to load data.</p>
      </Page>
    );
  }

  const s = await getDashboardStats();
  const enrichPct = s.totalCreators ? Math.round((s.enrichedCreators / s.totalCreators) * 100) : 0;
  const maxStage = Math.max(1, ...PIPELINE_STAGES.map((st) => s.stageCounts[st] ?? 0));

  return (
    <Page>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Creators" value={s.totalCreators} href="/creators" />
        <Metric label="Enriched" value={`${s.enrichedCreators}`} sub={`${enrichPct}% of CRM`} />
        <Metric label="With email" value={s.withEmail} sub="reachable" />
        <Metric label="Campaigns" value={s.campaigns} href="/campaigns" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-black/10 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Pipeline funnel</h2>
          <p className="mb-4 text-xs text-zinc-500">Creators by stage across all campaigns (§7.6)</p>
          <div className="space-y-2">
            {PIPELINE_STAGES.map((st) => {
              const n = s.stageCounts[st] ?? 0;
              return (
                <div key={st} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-zinc-500">{titleize(st)}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-zinc-100">
                    <div
                      className={`h-full rounded ${stageStyle[st].split(' ')[0]}`}
                      style={{ width: `${(n / maxStage) * 100}%`, minWidth: n ? '1.5rem' : 0 }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-semibold tabular-nums">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 p-5">
          <h2 className="text-sm font-semibold">Creator lifecycle</h2>
          <p className="mb-4 text-xs text-zinc-500">Own status, not campaign stage</p>
          <ul className="space-y-2">
            {Object.entries(s.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, n]) => (
                <li key={status} className="flex items-center justify-between text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      creatorStatusStyle[status as keyof typeof creatorStatusStyle] ?? 'bg-zinc-100'
                    }`}
                  >
                    {titleize(status)}
                  </span>
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            {Object.keys(s.byStatus).length === 0 && (
              <li className="text-sm text-zinc-400">No creators yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <Quick href="/discover" label="Discover creators" primary />
        <Quick href="/creators" label="Open CRM" />
        <Quick href="/campaigns" label="Campaigns" />
      </section>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mb-6 text-sm text-zinc-500">Your UGC pipeline at a glance.</p>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-xl border border-black/10 p-4 transition-colors hover:border-brand/40">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-black text-brand">{value}</div>
      {sub && <div className="text-xs text-zinc-400">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Quick({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-dark'
          : 'rounded-full border-2 border-lime px-5 py-2 text-sm font-semibold hover:bg-lime/10'
      }
    >
      {label}
    </Link>
  );
}
