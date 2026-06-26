import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Database, Platform } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'other'];

// Anon insert — exercises the `anon_can_signup` RLS policy on waitlist_signups.
async function submit(formData: FormData) {
  'use server';
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const email = String(formData.get('email') ?? '').trim();
  if (!email) return;

  const platform = String(formData.get('platform') ?? '') as Platform;
  const payload: Database['public']['Tables']['waitlist_signups']['Insert'] = {
    email,
    handle: String(formData.get('handle') ?? '').trim() || null,
    niche: String(formData.get('niche') ?? '').trim() || null,
    platform: PLATFORMS.includes(platform) ? platform : null,
    message: String(formData.get('message') ?? '').trim() || null,
  };
  // Cast: hand-written types omit Supabase's Relationships metadata, which
  // narrows insert() to `never`. Drop when types are CLI-generated.
  await supabase.from('waitlist_signups').insert(payload as never);

  redirect('/waitlist?done=1');
}

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-brand-dark hover:underline">
        ← Creegator
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Join the <span className="text-brand">creator</span>{' '}
        <span className="text-lime">waitlist</span>
      </h1>
      <p className="mt-2 text-zinc-500">
        Do paid UGC? Get on the list for brand collabs — high-intent, no spam.
      </p>

      {done ? (
        <div className="mt-8 rounded-xl border-2 border-brand bg-brand/5 p-6 text-center">
          <p className="text-lg font-semibold text-brand-dark">You&apos;re on the list 🎉</p>
          <p className="mt-1 text-sm text-zinc-600">We&apos;ll reach out when there&apos;s a fit.</p>
        </div>
      ) : (
        <form action={submit} className="mt-8 space-y-4">
          <Field name="email" label="Email" type="email" required placeholder="you@example.com" />
          <Field name="handle" label="Handle" placeholder="@yourhandle" />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="platform">
              Main platform
            </label>
            <select
              id="platform"
              name="platform"
              className="w-full rounded-lg border border-black/15 px-3 py-2 capitalize outline-none focus:border-brand"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
            </select>
          </div>
          <Field name="niche" label="Niche" placeholder="beauty, fitness, food…" />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="message">
              Anything else?
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="h-12 w-full rounded-full bg-brand font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
          >
            Join the waitlist
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={name}>
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
      />
    </div>
  );
}
