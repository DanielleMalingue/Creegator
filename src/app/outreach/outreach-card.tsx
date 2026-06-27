'use client';

import { useActionState, useEffect, useState } from 'react';
import { generateOpenerAction, saveDraftAction, type GenState, type SaveState } from './actions';
import type { OutreachTarget } from '@/lib/data';

export function OutreachCard({ target, disabled }: { target: OutreachTarget; disabled: boolean }) {
  const c = target.creator;
  const [subject, setSubject] = useState(target.draft?.subject ?? '');
  const [opener, setOpener] = useState(target.draft?.body ?? '');

  const [genState, generate, generating] = useActionState<GenState, FormData>(
    generateOpenerAction,
    null,
  );
  const [saveState, save, saving] = useActionState<SaveState, FormData>(saveDraftAction, null);

  // When generation returns for this card, fill the editable fields.
  useEffect(() => {
    if (genState?.ok && genState.enrollmentId === target.enrollmentId) {
      setSubject(genState.result.subject);
      setOpener(genState.result.opener);
    }
  }, [genState, target.enrollmentId]);

  const hasContent = opener.trim().length > 0;

  return (
    <div className="rounded-xl border border-black/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">
            {c.display_name ?? c.handle}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {c.niche ?? '—'} · {c.handle}
            </span>
          </div>
          <div className="truncate text-xs text-zinc-500">{c.bio}</div>
          <div className="mt-1 text-xs text-zinc-400">
            {c.email ?? 'no email'}
            {target.campaign && <> · {target.campaign.name}</>}
            {c.fit_score != null && <> · fit {c.fit_score}</>}
          </div>
        </div>
        <form action={generate} className="shrink-0">
          <input type="hidden" name="enrollmentId" value={target.enrollmentId} />
          <button
            type="submit"
            disabled={disabled || generating}
            className="rounded-full border-2 border-lime px-3 py-1.5 text-sm font-semibold hover:bg-lime/10 disabled:opacity-50"
            title={disabled ? 'Set ANTHROPIC_API_KEY to enable' : undefined}
          >
            {generating ? 'Drafting…' : target.draft ? 'Regenerate' : '✦ AI opener'}
          </button>
        </form>
      </div>

      {genState?.ok === false && (
        <p className="mt-3 text-sm text-red-600">{genState.error}</p>
      )}

      {(hasContent || generating) && (
        <form action={save} className="mt-4 space-y-2">
          <input type="hidden" name="enrollmentId" value={target.enrollmentId} />
          <input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <textarea
            name="opener"
            value={opener}
            onChange={(e) => setOpener(e.target.value)}
            rows={4}
            placeholder="The opener…"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !hasContent}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {saveState?.ok && <span className="text-sm text-brand-dark">✓ saved</span>}
            {saveState?.ok === false && <span className="text-sm text-red-600">{saveState.error}</span>}
            {target.draft && !saveState && <span className="text-xs text-zinc-400">draft saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}
