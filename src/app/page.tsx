export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-lime-bright/15 via-background to-background px-6 py-24">
      <main className="flex w-full max-w-3xl flex-col items-center gap-10 text-center sm:items-start sm:text-left">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground text-xl font-black shadow-sm">
            C
          </span>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-brand">Cree</span>
            <span className="text-lime">gator</span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 sm:items-start">
          <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            UGC creator outreach,{" "}
            <span className="bg-gradient-to-r from-brand to-lime bg-clip-text text-transparent">
              built for real startups
            </span>
            .
          </h1>
          <p className="max-w-md text-lg leading-8 text-foreground/70">
            Discover creators, enrich and score them, and run personalized
            outreach end-to-end — without the incumbent price tag.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-semibold sm:flex-row">
          <a
            className="flex h-12 items-center justify-center rounded-full bg-brand px-6 text-brand-foreground transition-colors hover:bg-brand-dark"
            href="/dashboard"
          >
            Open the dashboard
          </a>
          <a
            className="flex h-12 items-center justify-center rounded-full border-2 border-lime px-6 text-foreground transition-colors hover:bg-lime/10"
            href="/waitlist"
          >
            Join the waitlist
          </a>
        </div>
      </main>
    </div>
  );
}
