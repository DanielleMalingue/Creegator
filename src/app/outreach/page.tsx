import { listOutreachTargets } from '@/lib/data';
import { isAdminConfigured } from '@/lib/supabase/admin';
import { isAnthropicConfigured } from '@/lib/anthropic';
import { OutreachCard } from './outreach-card';

export const dynamic = 'force-dynamic';

export default async function OutreachPage() {
  const aiReady = isAnthropicConfigured();

  if (!isAdminConfigured()) {
    return (
      <Page aiReady={aiReady}>
        <p className="text-zinc-500">Set SUPABASE_SERVICE_ROLE_KEY to load data.</p>
      </Page>
    );
  }

  const targets = await listOutreachTargets();

  return (
    <Page aiReady={aiReady}>
      {targets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-10 text-center text-zinc-500">
          No enrolled creators yet — add creators to a campaign first.
        </p>
      ) : (
        <div className="space-y-3">
          {targets.map((t) => (
            <OutreachCard key={t.enrollmentId} target={t} disabled={!aiReady} />
          ))}
        </div>
      )}
    </Page>
  );
}

function Page({ aiReady, children }: { aiReady: boolean; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Outreach</h1>
        <span className="rounded bg-lime/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-lime-700">
          AI openers
        </span>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Claude-drafted personalized opener per creator (§7.5) — review, edit, save as a draft.
      </p>

      {!aiReady && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-semibold">AI not configured.</span> Add{' '}
          <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to{' '}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and restart{' '}
          <code className="rounded bg-amber-100 px-1">npm run dev</code> to enable opener generation
          (model: claude-sonnet-4-6).
        </div>
      )}

      {children}
    </div>
  );
}
