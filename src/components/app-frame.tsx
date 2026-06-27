'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, PUBLIC_ROUTES } from '@/lib/nav';

// Wraps app pages with the dashboard sidebar. Public routes (landing, waitlist)
// render bare so they keep their own full-bleed layout.
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  if (isPublic) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/10 bg-zinc-50/60 p-4 sm:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground text-base font-black">
          C
        </span>
        <span className="text-lg font-black tracking-tight">
          <span className="text-brand">Cree</span>
          <span className="text-lime">gator</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.label}>
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                        active
                          ? 'bg-brand/12 font-semibold text-brand-dark'
                          : 'text-zinc-600 hover:bg-black/5'
                      }`}
                    >
                      <span className="w-4 text-center text-zinc-400">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.soon && (
                        <span className="ml-auto rounded bg-lime/20 px-1.5 text-[9px] font-semibold uppercase text-lime-700">
                          soon
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-black/10 pt-3 px-2 text-[11px] text-zinc-400">
        Customer zero · internal
      </div>
    </aside>
  );
}
