// Placeholder for workflow sections not yet built — keeps the nav complete and
// documents the planned scope (CLAUDE.md §7) so it's clear what's next.
export function ComingSoon({
  title,
  section,
  blurb,
  planned,
}: {
  title: string;
  section: string;
  blurb: string;
  planned: string[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <span className="rounded bg-lime/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-lime-700">
          building next
        </span>
      </div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{section}</p>
      <p className="mt-3 max-w-xl text-zinc-600">{blurb}</p>

      <div className="mt-6 rounded-xl border border-dashed border-black/15 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Planned</div>
        <ul className="space-y-1.5">
          {planned.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
              <span className="mt-0.5 text-lime">○</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
