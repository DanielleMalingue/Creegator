import type { CreatorStatus, PipelineStage, EmailStatus } from '@/lib/database.types';

// Compact follower counts: 48200 -> "48.2K", 1340000 -> "1.3M".
export function compact(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function pct(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

export function money(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// Tailwind classes for badges. Brand greens carry the "good" end of each scale.
export const creatorStatusStyle: Record<CreatorStatus, string> = {
  new: 'bg-zinc-100 text-zinc-700',
  enriched: 'bg-sky-100 text-sky-700',
  qualified: 'bg-lime/20 text-lime-700',
  active: 'bg-brand/15 text-brand-dark',
  archived: 'bg-zinc-100 text-zinc-500',
  do_not_contact: 'bg-red-100 text-red-700',
};

export const stageStyle: Record<PipelineStage, string> = {
  new: 'bg-zinc-100 text-zinc-700',
  contacted: 'bg-sky-100 text-sky-700',
  replied: 'bg-lime/20 text-lime-700',
  negotiating: 'bg-amber-100 text-amber-700',
  contracted: 'bg-brand/15 text-brand-dark',
  live: 'bg-brand/25 text-brand-dark',
  paid: 'bg-emerald-600 text-white',
};

export const emailStatusStyle: Record<EmailStatus, string> = {
  unverified: 'bg-zinc-100 text-zinc-600',
  valid: 'bg-brand/15 text-brand-dark',
  invalid: 'bg-red-100 text-red-700',
  risky: 'bg-amber-100 text-amber-700',
  unknown: 'bg-zinc-100 text-zinc-600',
};

export const titleize = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
