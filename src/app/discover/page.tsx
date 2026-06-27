import Link from 'next/link';
import { DiscoverForm } from './discover-form';

export const dynamic = 'force-dynamic';

export default function DiscoverPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-brand">Cree</span>
            <span className="text-lime">gator</span>
            <span className="ml-2 font-normal text-zinc-400">/ Discover</span>
          </h1>
          <p className="text-sm text-zinc-500">
            Find paid-UGC creators by hashtag — bio &amp; email pulled, deduped into the CRM.
          </p>
        </div>
        <Link
          href="/creators"
          className="rounded-full border-2 border-lime px-4 py-2 text-sm font-semibold hover:bg-lime/10"
        >
          Creators
        </Link>
      </div>

      <DiscoverForm />
    </div>
  );
}
