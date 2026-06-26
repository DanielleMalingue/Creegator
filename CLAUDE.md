# CLAUDE.md — Creegator

Lean UGC-creator outreach platform for startups. Built first as an internal tool
(customer zero = Addison's own UGC pipeline), with a creator marketplace grown
on top once the tool proves its value.

---

## 1. What this is & why

The whole platform exists to replace a painful manual workflow (see §7) with a
fast, organized system. The thesis: **discovery is the moat** the expensive tools
charge for, and in 2026 you can rent that capability for pennies instead of paying
their packaged price.

- **Undercut the incumbents.** Sideshift starts at $199.99; HFC is ~$50/mo + you
  pay creators + 3%. Target self-cost is closer to a ~$9.99/mo philosophy — assemble
  cheap primitives instead of buying the packaged product.
- **Customer zero is us.** It pays for itself through Addison's UGC growth whether
  or not the marketplace takes off. No need for outside product-market fit to start.
- **Sequence:** internal platform-side tool first → marketplace accretes later.
  A marketplace is a two-sided cold-start problem; an internal tool is just software
  we control.

---

## 2. Operating principles

- **Build the brain, rent the commodity edges.** We build enrichment, the CRM,
  contracts, and payment logic. We rent only data-in (discovery) and email-out (sending).
- **The schema is the contract.** Agree table shapes first; migrations are the
  single source of truth. This is what lets two people build in parallel.
- **Own surfaces end-to-end.** Divide by seam, not by interleaving the same files.
- **Neat over clever.** Simple, sectioned, maintainable long-term. Every feature
  maps back to a real workflow pain (§7).
- **Compliance is designed in, not bolted on** (see §8).

---

## 3. Stack & tooling decisions

| Layer | Choice | Notes |
|---|---|---|
| Data + auth | **Supabase** (Postgres + RLS) | Source of truth; generate TS types from schema |
| App | **Next.js 15 / TypeScript / Tailwind** | |
| Hosting + cron | **Vercel** | |
| Discovery / enrichment data | **ScrapeCreators** | Chosen. Pay-as-you-go, credits don't expire, IG/TikTok/YouTube + Linktree endpoint |
| Web / link-in-bio search | SERP API (Serper) | Google CSE is closed to new signups — use a SERP API instead |
| AI enrichment | **Anthropic API (Claude)** | Extract, classify, score, draft — same stack as Godspeed/Clearance |
| Email verification | NeverBounce / ZeroBounce | Run before every send |
| Sending (later) | Instantly / Smartlead / Saleshandy | + warmed lookalike domains |
| Payments (later) | **Stripe Connect** | Routes startup → Creegator (our 1.5% fee) → creator |
| Verified creator metrics (marketplace phase) | Phyllo | Consent/OAuth-based; post-onboarding only |

**Rejected:** Modash API ($16.2k/yr) and Influencers.club ($249/mo) — good but not
startup-budget. Revisit once there's revenue.

---

## 4. Architecture — build vs rent

Pipeline flows top to bottom; replies loop back into the CRM.

```
[Outbound discovery]   [Inbound waitlist]     ← sources
   (rent: ScrapeCreators, SERP)  (build)
            \            /
          [ Enrichment ]                       ← build (Claude on rented API)
       extract · classify · score
                |
        [ Supabase + CRM ]                      ← build  ◄─── replies loop back
       dedupe · store · track
                |
        [ Cold email outreach ]                ← rent (warmed domains, throttled)
                |
        [ Contracts + payments ]               ← build (Stripe Connect, our 1.5%)
```

- **Build (our IP):** enrichment logic, Supabase + CRM, contract builder, payment
  logic, all UI. Sits on rented engines (Claude, Stripe) but the logic is ours.
- **Rent (commodity):** discovery APIs, email-sending infrastructure.

---

## 5. Team & ownership

| Owner | Domain |
|---|---|
| **Danielle** — product + architecture lead | CRM UI, inbound/marketplace pages, contract builder, outreach UX, prioritization, and the *definitions* of "good UGC fit" / "good opener" that drive enrichment. Final call on core decisions. |
| **Collaborator** — backend / data / infra | Discovery worker, enrichment pipeline plumbing, data layer (migrations, RLS, dedupe, job queue), sending infra (warmup, throttle, bounce/verify), deployment. |

**The seam is the Supabase schema.** Agree it together first (~90 min). Collaborator
owns migrations as source of truth and **seeds fake `creators` rows on day one** so the
UI can be built in parallel before the real pipeline produces data.

**One thing not to let fall in a crack:** the collaborator owns the *plumbing* of the
Claude calls; Danielle owns *what flows through them* (fit criteria, opener quality).
They build the pipe — Danielle tunes the water. Settle this explicitly.

---

## 6. Build order (first sprint)

1. Lock the schema together (90 min).
2. Collaborator: stand up Supabase → write migrations → seed fake data → start the
   discovery worker.
3. Danielle: scaffold the Next.js app → build CRM list + detail views against the seed.
4. End of week 1: wire the real pipeline to the UI.
5. Then, in order: enrichment → outreach → contracts → (payments + marketplace later).

---

## 7. The product, by domain

Each section replaces a step from the manual workflow. The pain is listed so the
feature's reason for existing stays visible.

### 7.1 Discovery — searching for creators
**Replaces:** hours scrolling TikTok through 1k+ accounts by hand to find a niche.
- ScrapeCreators pulls profiles, bios, and Linktree (where rate cards + emails live)
  across IG, TikTok, YouTube.
- SERP API surfaces creator landing/link-in-bio pages from the open web.
- **Hashtag-based discovery** (`#ugccreator`, `#ugccommunity`, `#ugcportfolio`) —
  higher-signal than broad scraping; these people are advertising that they do paid UGC.
- Niche filter + fit score, auto-populate the `creators` table, dedupe.
- Inbound waitlist page = compliant, high-intent, *cheaper-as-you-scale* source.

### 7.2 Briefing & creative
**Replaces:** writing briefs and scripts from scratch every time, sourcing images,
re-making rules per creator.
- Reusable brief + script templates.
- Claude-assisted script generation tailored to creator/niche.
- Asset library — attach sourced reference images to a script.
- Reusable rules / recommendations library (write once, reuse everywhere).

### 7.3 Compensation — pricing
**Replaces:** ad-hoc pricing and low payments.
- Five pricing models cover ~95% of UGC deals: flat per-deliverable; per-deliverable
  + usage-rights/whitelisting add-on (where the real money is); bundles;
  performance/affiliate (commission/CPA); hybrid base + performance.
- Rate guidance so payments aren't left on the table.
- Pricing feeds directly into the contract (§7.4).

### 7.4 Legals — contracts
**Replaces:** making a unique contract for each creator, copy-pasting different
contracts into each email, and re-personalizing by hand.
- Contract builder: one template + per-creator variables → auto-generates a
  personalized contract for every creator.
- Built on the five pricing models above.
- **Reusable "non-negotiable terms" letter** stored once and auto-attached every
  send — no more re-sending it manually each time.
- Contract + letter auto-attach to the outreach; nothing is pasted by hand.

### 7.5 Outreach — email
**Replaces:** copy-pasting emails, copy-pasting headers, emailing creators one by
one, manually attaching contracts and letters.
- Verified creator emails already stored from enrichment.
- Templated messages with personalization tokens; headers auto-filled.
- Claude-drafted personalized opener per creator referencing their actual content
  (the opener is the single biggest lever on reply rate).
- Contract + non-negotiable letter auto-attached.
- Queue-based, semi-automated send with a human review step.
- **Deliverability (non-negotiable):** never send from the primary domain. Use warmed
  lookalike domains, throttle to ~15–20 emails per inbox/day, verify before send.
  Cold reply rates run ~1–3%, so volume + targeting + personalization are the game.

### 7.6 Tracking — pipeline & performance
**Replaces:** manually tracking who's been emailed and their stage, plus content,
engagement, and payment.
- **Pipeline stages:** new → contacted → replied → negotiating → contracted → live → paid.
- Content tracking (links to posted deliverables).
- Engagement tracking (pull metrics via ScrapeCreators).
- Payment tracking (via Stripe Connect).
- Full per-creator history in one record.

### 7.7 Metrics — improving outcomes
**Addresses:** low collaboration rates and low payments.
- Funnel analytics: sent → opened → replied → collab rate, so targeting,
  personalization, and volume can be tuned over time.
- Pricing visibility (§7.3) raises payments; better fit-scoring + personalization
  raise collab rates.

---

## 8. Compliance & guardrails

- **Public data only.** Consuming a third-party API (ScrapeCreators) shifts the
  platform-ToS exposure to the vendor; scraping public data has favorable court
  precedent. (Not legal advice — confirm the outreach-compliance piece.)
- **Never cold-email from the primary domain.** Warmed lookalike domains, throttled.
- **CAN-SPAM:** every outreach email needs a real physical postal address
  (Stable mailbox) + a clear opt-out. GDPR applies to any EU creators.
- **Verify emails before sending** — every bounce damages domain reputation.

---

## 9. Data model (high-level — full schema is the first build artifact)

- `creators` — profile, niche, handles, verified email, fit score, source, dedupe key
- `sources` — where a creator came from (discovery query, hashtag, inbound)
- `campaigns` — a brand/outreach push
- `briefs` / `scripts` — reusable + per-creator creative, with attached assets
- `contracts` — template + variables, pricing model, generated copy
- `outreach` / `messages` — email content, status, headers, attachments, timestamps
- `tracking` — content links, engagement metrics, payment status

---

## 10. Long-term

This is dogfood for Addison's UGC strategy and, eventually, a way to lower the
barrier for other real startups as UGC keeps rising. The marketplace is the only
discovery source that gets *cheaper* as it scales — so it grows around the proven
internal tool rather than being built cold up front.
