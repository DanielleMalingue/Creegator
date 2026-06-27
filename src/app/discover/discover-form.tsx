'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { discoverAction, type DiscoverState } from './actions';

const SUGGESTED = ['ugccreator', 'ugccommunity', 'ugcportfolio', 'ugcjourney'];

export function DiscoverForm() {
  const [state, formAction, pending] = useActionState<DiscoverState, FormData>(
    discoverAction,
    null,
  );

  return (
    <div>
      <form action={formAction} className="rounded-xl border border-black/10 p-5">
        <label className="mb-1 block text-sm font-medium" htmlFor="hashtag">
          Hashtag
        </label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-l-lg border border-r-0 border-black/15 bg-zinc-50 px-3 text-zinc-400">
            #
          </span>
          <input
            id="hashtag"
            name="hashtag"
            defaultValue="ugccreator"
            placeholder="ugccreator"
            className="flex-1 rounded-r-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand px-5 font-semibold text-brand-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? 'Discovering…' : 'Discover'}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <span key={s} className="rounded-full bg-lime/15 px-2 py-0.5 text-xs text-lime-700">
              #{s}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-zinc-600">
          <label className="flex items-center gap-2">
            Max creators
            <input
              name="limit"
              type="number"
              defaultValue={20}
              min={1}
              max={50}
              className="w-16 rounded border border-black/15 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2" title="Replay a cached response instead of spending a credit">
            <input name="useCache" type="checkbox" className="accent-brand" />
            Use cached response (0 credits)
          </label>
        </div>
      </form>

      {state?.ok === false && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state?.ok && <Results state={state} />}
    </div>
  );
}

function Results({ state }: { state: Extract<DiscoverState, { ok: true }> }) {
  const r = state.result;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Stat label="Found" value={r.found} />
        <Stat label="Inserted" value={r.inserted} accent />
        <Stat label="Already had" value={r.skippedExisting} />
        <Stat label="Credits left" value={r.creditsRemaining ?? '—'} />
        <Link href="/creators" className="ml-auto font-semibold text-brand-dark hover:underline">
          View in CRM →
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-black/5 rounded-xl border border-black/10">
        {r.candidates.map((c) => (
          <li key={c.dedupe_key} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-10 text-center font-bold text-brand-dark">{c.fit_score}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                @{c.handle}
                {c.niche && <span className="ml-2 text-xs text-zinc-400">{c.niche}</span>}
              </div>
              <div className="truncate text-xs text-zinc-500">{c.bio}</div>
            </div>
            {c.email ? (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand-dark">
                {c.email}
              </span>
            ) : (
              <span className="text-xs text-zinc-300">no email</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <span className="rounded-lg border border-black/10 px-3 py-1.5">
      <span className="text-zinc-500">{label}: </span>
      <span className={`font-semibold tabular-nums ${accent ? 'text-brand-dark' : ''}`}>{value}</span>
    </span>
  );
}
