import Link from 'next/link';
import { listCreators } from '@/lib/data';
import { isAdminConfigured } from '@/lib/supabase/admin';
import { compact, pct, creatorStatusStyle, emailStatusStyle, titleize } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
      <p className="font-semibold">Service key not set</p>
      <p className="mt-1 text-sm">
        Paste your <code className="rounded bg-amber-100 px-1">sb_secret_…</code> key into{' '}
        <code className="rounded bg-amber-100 px-1">.env.local</code> as{' '}
        <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>, then restart{' '}
        <code className="rounded bg-amber-100 px-1">npm run dev</code> to load the seeded creators.
      </p>
    </div>
  );
}

export default async function CreatorsPage() {
  if (!isAdminConfigured()) {
    return (
      <Shell>
        <NotConfigured />
      </Shell>
    );
  }

  const creators = await listCreators();

  return (
    <Shell>
      <div className="overflow-hidden rounded-xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Niche</th>
              <th className="px-4 py-3 font-medium">Followers</th>
              <th className="px-4 py-3 font-medium">Engagement</th>
              <th className="px-4 py-3 font-medium">Fit</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {creators.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-lime/5">
                <td className="px-4 py-3">
                  <Link href={`/creators/${c.id}`} className="group flex flex-col">
                    <span className="font-medium text-foreground group-hover:text-brand-dark">
                      {c.display_name ?? c.handle ?? '—'}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {c.handle} · {titleize(c.primary_platform)}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{c.niche ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">{compact(c.follower_count)}</td>
                <td className="px-4 py-3 tabular-nums">{pct(c.engagement_rate)}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-brand-dark">{c.fit_score ?? '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={emailStatusStyle[c.email_status]}>{c.email_status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={creatorStatusStyle[c.status]}>{titleize(c.status)}</Badge>
                </td>
              </tr>
            ))}
            {creators.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No creators yet — the discovery pipeline will populate this.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-brand">Cree</span>
            <span className="text-lime">gator</span>
            <span className="ml-2 font-normal text-zinc-400">/ Creators</span>
          </h1>
          <p className="text-sm text-zinc-500">Discovery CRM — sorted by fit score.</p>
        </div>
        <Link
          href="/waitlist"
          className="rounded-full border-2 border-lime px-4 py-2 text-sm font-semibold hover:bg-lime/10"
        >
          Waitlist
        </Link>
      </div>
      {children}
    </div>
  );
}
