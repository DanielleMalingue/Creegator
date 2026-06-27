'use client';

import { useActionState } from 'react';
import { enrichAction, type EnrichState } from './actions';

// Metered enrichment: shows the exact credit cost before spending, and the
// remaining balance after. One profile pull = 1 credit.
export function EnrichBar({ unenrichedIds }: { unenrichedIds: string[] }) {
  const [state, formAction, pending] = useActionState<EnrichState, FormData>(enrichAction, null);
  const count = unenrichedIds.length;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-lime/40 bg-lime/5 px-4 py-3 text-sm">
      <span className="font-medium text-lime-700">
        {count} creator{count === 1 ? '' : 's'} missing metrics
      </span>

      {count > 0 && (
        <form action={formAction} className="flex items-center gap-3">
          <input type="hidden" name="ids" value={unenrichedIds.slice(0, 25).join(',')} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand px-4 py-1.5 font-semibold text-brand-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {pending
              ? 'Enriching…'
              : `Enrich ${Math.min(count, 25)} — ${Math.min(count, 25)} credit${Math.min(count, 25) === 1 ? '' : 's'}`}
          </button>
        </form>
      )}

      {state?.ok && (
        <span className="text-zinc-600">
          ✓ enriched {state.result.enriched}
          {state.result.failed.length > 0 && `, ${state.result.failed.length} failed`}
          {state.result.creditsRemaining != null && (
            <> · <span className="font-semibold">{state.result.creditsRemaining}</span> credits left</>
          )}
        </span>
      )}
      {state?.ok === false && <span className="text-red-600">{state.error}</span>}
    </div>
  );
}
