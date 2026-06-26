import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreator } from '@/lib/data';
import { isAdminConfigured } from '@/lib/supabase/admin';
import {
  compact,
  pct,
  money,
  creatorStatusStyle,
  emailStatusStyle,
  stageStyle,
  titleize,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default async function CreatorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isAdminConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/creators" className="text-sm text-brand-dark hover:underline">
          ← Back to creators
        </Link>
        <p className="mt-6 text-zinc-500">Set SUPABASE_SERVICE_ROLE_KEY in .env.local to load data.</p>
      </div>
    );
  }

  const result = await getCreator(id);
  if (!result?.creator) notFound();
  const { creator: c, enrollments } = result;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/creators" className="text-sm text-brand-dark hover:underline">
        ← Back to creators
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{c.display_name ?? c.handle}</h1>
          <p className="text-sm text-zinc-500">
            {c.handle} · {titleize(c.primary_platform)} · {c.niche ?? 'no niche'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={creatorStatusStyle[c.status]}>{titleize(c.status)}</Badge>
            <Badge className={emailStatusStyle[c.email_status]}>email: {c.email_status}</Badge>
            {c.tags.map((t) => (
              <Badge key={t} className="bg-lime/15 text-lime-700">
                #{t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Fit score</div>
          <div className="text-4xl font-black text-brand">{c.fit_score ?? '—'}</div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Followers" value={compact(c.follower_count)} />
        <Stat label="Engagement" value={pct(c.engagement_rate)} />
        <Stat label="Email" value={<span className="text-sm">{c.email ?? '—'}</span>} />
        <Stat
          label="Link in bio"
          value={
            c.link_in_bio ? (
              <a href={c.link_in_bio} target="_blank" rel="noreferrer" className="text-sm text-brand-dark hover:underline">
                open ↗
              </a>
            ) : (
              '—'
            )
          }
        />
      </section>

      {c.bio && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bio</h2>
          <p className="mt-1 text-sm text-zinc-700">{c.bio}</p>
        </section>
      )}

      {c.fit_notes && (
        <section className="mt-4 rounded-xl border border-lime/40 bg-lime/5 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-lime-700">Fit notes</h2>
          <p className="mt-1 text-sm text-zinc-700">{c.fit_notes}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Campaigns &amp; pipeline</h2>
        {enrollments.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Not enrolled in any campaign yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {enrollments.map((e) => {
              const campaign = e.campaigns as { name: string; brand: string | null } | null;
              const messages = (e.messages ?? []) as Array<{ id: string; direction: string }>;
              const payments = (e.payments ?? []) as Array<{
                amount_cents: number;
                currency: string;
                status: string;
              }>;
              return (
                <div key={e.id} className="rounded-xl border border-black/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{campaign?.name ?? 'Campaign'}</div>
                      {campaign?.brand && (
                        <div className="text-xs text-zinc-500">{campaign.brand}</div>
                      )}
                    </div>
                    <Badge className={stageStyle[e.stage]}>{titleize(e.stage)}</Badge>
                  </div>
                  <div className="mt-3 flex gap-6 text-sm text-zinc-600">
                    <span>{messages.length} message{messages.length === 1 ? '' : 's'}</span>
                    {payments.map((p, i) => (
                      <span key={i}>
                        {money(p.amount_cents, p.currency)} ({p.status})
                      </span>
                    ))}
                  </div>
                  {e.notes && <p className="mt-2 text-sm text-zinc-500">{e.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
