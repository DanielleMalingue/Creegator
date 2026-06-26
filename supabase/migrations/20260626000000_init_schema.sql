-- ============================================================================
-- Creegator — initial schema (the contract)
-- ----------------------------------------------------------------------------
-- Internal single-tenant model: every authenticated team member can access
-- everything. Server-side workers (discovery, enrichment, sending) use the
-- service_role key and bypass RLS entirely. Multi-tenant `org_id` columns can
-- be added additively later when the marketplace arrives (see CLAUDE.md §10).
--
-- Maps to CLAUDE.md §7 (product domains) and §9 (data model).
-- ============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "moddatetime" schema extensions;  -- updated_at trigger

-- ============================================================================
-- ENUMS
-- ============================================================================

create type platform        as enum ('instagram', 'tiktok', 'youtube', 'other');
create type team_role        as enum ('owner', 'member');
create type source_type      as enum ('discovery_query', 'hashtag', 'serp', 'inbound', 'manual');
-- A creator's own lifecycle in our system, independent of any campaign.
create type creator_status   as enum ('new', 'enriched', 'qualified', 'active', 'archived', 'do_not_contact');
-- §7.6 pipeline stages — these live per-campaign on campaign_creators.
create type pipeline_stage   as enum ('new', 'contacted', 'replied', 'negotiating', 'contracted', 'live', 'paid');
create type campaign_status  as enum ('draft', 'active', 'paused', 'archived');
-- §7.3 five pricing models that cover ~95% of UGC deals
create type pricing_model    as enum ('flat_per_deliverable', 'deliverable_plus_usage', 'bundle', 'performance', 'hybrid');
create type contract_status  as enum ('draft', 'sent', 'signed', 'declined', 'void');
-- email verification before every send (§8)
create type email_status     as enum ('unverified', 'valid', 'invalid', 'risky', 'unknown');
create type message_direction as enum ('outbound', 'inbound');
create type message_status   as enum ('draft', 'queued', 'scheduled', 'sent', 'opened', 'replied', 'bounced', 'failed');
create type payment_status   as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type asset_type       as enum ('image', 'video', 'document', 'link');
create type document_kind    as enum ('non_negotiable_terms', 'rules', 'other');

-- ============================================================================
-- HELPERS
-- ============================================================================

-- True for any signed-in team member. Internal single-tenant: this is the
-- whole access rule. Swap the body for an org-membership check when the
-- marketplace needs tenant isolation.
create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated';
$$;

-- ============================================================================
-- PROFILES — team members (mirrors auth.users)  (§5 ownership)
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        team_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- SOURCES — where a creator came from  (§7.1, §9)
-- ============================================================================

create table public.sources (
  id          uuid primary key default gen_random_uuid(),
  type        source_type not null,
  label       text not null,              -- "#ugccreator", "inbound waitlist", a query
  platform    platform,
  query       text,                       -- the hashtag / search string
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- CREATORS — the core CRM record  (§7.1, §9)
-- ============================================================================

create table public.creators (
  id              uuid primary key default gen_random_uuid(),
  -- dedupe key (e.g. 'tiktok:@handle') — guarantees we never store a dup (§7.1)
  dedupe_key      text not null unique,
  display_name    text,
  handle          text,
  primary_platform platform not null default 'tiktok',
  handles         jsonb not null default '{}'::jsonb,   -- { instagram: '@x', youtube: '...' }
  niche           text,
  bio             text,
  email           text,
  email_status    email_status not null default 'unverified',
  link_in_bio     text,                                 -- Linktree etc. (§7.1)
  rate_card       jsonb,                                -- parsed rate card from link-in-bio
  follower_count  integer,
  engagement_rate numeric(6,4),                         -- e.g. 0.0345 = 3.45%
  -- enrichment output (§4 build): Claude fit scoring + classification
  fit_score       integer check (fit_score between 0 and 100),
  fit_notes       text,
  -- creator's own lifecycle status, independent of campaign pipeline stages
  status          creator_status not null default 'new',
  tags            text[] not null default '{}',
  enrichment      jsonb not null default '{}'::jsonb,   -- structured Claude output
  raw             jsonb not null default '{}'::jsonb,   -- raw ScrapeCreators payload
  source_id       uuid references public.sources (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index creators_email_idx   on public.creators (email);
create index creators_status_idx  on public.creators (status);
create index creators_niche_idx   on public.creators (niche);
create index creators_fit_idx     on public.creators (fit_score desc);
create index creators_tags_idx    on public.creators using gin (tags);

-- ============================================================================
-- CAMPAIGNS — a brand / outreach push  (§9)
-- ============================================================================

create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand       text,
  status      campaign_status not null default 'draft',
  description text,
  settings    jsonb not null default '{}'::jsonb,   -- sending domain, throttle, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- CAMPAIGN_CREATORS — enrollment + pipeline position  (§7.6)
-- ----------------------------------------------------------------------------
-- The pipeline stage lives here, not on creators: a creator can be in several
-- campaigns at different stages. Outreach, contracts, deliverables and payments
-- all hang off this enrollment.
-- ============================================================================

create table public.campaign_creators (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creator_id  uuid not null references public.creators (id) on delete cascade,
  stage       pipeline_stage not null default 'new',
  priority    integer not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create index campaign_creators_campaign_idx on public.campaign_creators (campaign_id);
create index campaign_creators_creator_idx  on public.campaign_creators (creator_id);
create index campaign_creators_stage_idx    on public.campaign_creators (stage);

-- ============================================================================
-- BRIEFS & SCRIPTS — creative  (§7.2)
-- ----------------------------------------------------------------------------
-- is_template = true  → reusable library item (campaign_id / creator_id null)
-- is_template = false → a concrete instance for a campaign and/or creator
-- ============================================================================

create table public.briefs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_template boolean not null default false,
  body        text,
  rules       text,                                  -- reusable rules/recommendations
  campaign_id uuid references public.campaigns (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.scripts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  is_template     boolean not null default false,
  body            text,
  generated_by_ai boolean not null default false,    -- Claude-assisted (§7.2)
  brief_id        uuid references public.briefs (id) on delete set null,
  campaign_id     uuid references public.campaigns (id) on delete set null,
  creator_id      uuid references public.creators (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Asset library (§7.2): sourced reference images attachable to scripts.
create table public.assets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        asset_type not null default 'image',
  url         text not null,                          -- Supabase Storage / external
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.script_assets (
  script_id   uuid not null references public.scripts (id) on delete cascade,
  asset_id    uuid not null references public.assets (id) on delete cascade,
  primary key (script_id, asset_id)
);

-- ============================================================================
-- DOCUMENTS — reusable letters (non-negotiable terms, etc.)  (§7.4)
-- ----------------------------------------------------------------------------
-- The "non-negotiable terms" letter is stored once and auto-attached on send.
-- ============================================================================

create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        document_kind not null default 'other',
  body        text not null,
  is_default  boolean not null default false,         -- auto-attach this one
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- CONTRACT TEMPLATES & CONTRACTS  (§7.3, §7.4)
-- ----------------------------------------------------------------------------
-- Template: one body with {{variables}} + a default pricing model.
-- Contract: per-creator variables filled in → generated_body. `pricing` holds
-- the model-specific numbers (flat amount, usage add-on, bundle items,
-- commission %, base+performance split) shaped by `pricing_model`.
-- ============================================================================

create table public.contract_templates (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  body                  text not null,                -- contains {{variables}}
  default_pricing_model pricing_model not null default 'flat_per_deliverable',
  default_pricing       jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  campaign_creator_id uuid not null references public.campaign_creators (id) on delete cascade,
  template_id         uuid references public.contract_templates (id) on delete set null,
  pricing_model       pricing_model not null default 'flat_per_deliverable',
  pricing             jsonb not null default '{}'::jsonb,   -- model-specific numbers
  variables           jsonb not null default '{}'::jsonb,   -- per-creator fill-ins
  generated_body      text,
  status              contract_status not null default 'draft',
  sent_at             timestamptz,
  signed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index contracts_cc_idx     on public.contracts (campaign_creator_id);
create index contracts_status_idx on public.contracts (status);

-- ============================================================================
-- MESSAGES — outreach + replies  (§7.5, §4 replies loop back)
-- ----------------------------------------------------------------------------
-- One unified email log per enrollment. direction distinguishes the cold send
-- from the creator's reply. Contract + non-negotiable letter auto-attach via
-- the `attachments` jsonb. Never send from the primary domain — `from_address`
-- records the warmed lookalike domain used (§7.5, §8).
-- ============================================================================

create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  campaign_creator_id uuid not null references public.campaign_creators (id) on delete cascade,
  direction           message_direction not null,
  status              message_status not null default 'draft',
  subject             text,
  body                text,
  ai_opener           text,                           -- Claude-drafted opener (§7.5)
  from_address        text,                           -- warmed lookalike domain
  to_address          text,
  headers             jsonb not null default '{}'::jsonb,
  attachments         jsonb not null default '[]'::jsonb,   -- contract + letter refs
  contract_id         uuid references public.contracts (id) on delete set null,
  provider_message_id text,                           -- id from sending provider
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  opened_at           timestamptz,
  replied_at          timestamptz,
  bounced_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index messages_cc_idx        on public.messages (campaign_creator_id);
create index messages_status_idx    on public.messages (status);
create index messages_direction_idx on public.messages (direction);

-- ============================================================================
-- TRACKING — deliverables, engagement, payments  (§7.6, §7.7)
-- ============================================================================

-- Posted content + its engagement snapshot (pulled via ScrapeCreators).
create table public.deliverables (
  id                  uuid primary key default gen_random_uuid(),
  campaign_creator_id uuid not null references public.campaign_creators (id) on delete cascade,
  content_url         text,
  platform            platform,
  posted_at           timestamptz,
  views               bigint,
  likes               bigint,
  comments            bigint,
  shares              bigint,
  metrics_synced_at   timestamptz,
  metrics             jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index deliverables_cc_idx on public.deliverables (campaign_creator_id);

-- Payments via Stripe Connect (startup → Creegator 1.5% fee → creator) (§3, §7.6)
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  campaign_creator_id      uuid not null references public.campaign_creators (id) on delete cascade,
  contract_id              uuid references public.contracts (id) on delete set null,
  amount_cents             integer not null,
  fee_cents                integer not null default 0,   -- our 1.5%
  currency                 text not null default 'usd',
  status                   payment_status not null default 'unpaid',
  stripe_payment_intent_id text,
  stripe_transfer_id       text,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index payments_cc_idx     on public.payments (campaign_creator_id);
create index payments_status_idx on public.payments (status);

-- ============================================================================
-- WAITLIST_SIGNUPS — inbound, high-intent source  (§7.1)
-- ----------------------------------------------------------------------------
-- The only table the public (anon) can write to: the inbound waitlist form.
-- ============================================================================

create table public.waitlist_signups (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  handle              text,
  platform            platform,
  niche               text,
  message             text,
  converted_creator_id uuid references public.creators (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ============================================================================
-- updated_at TRIGGERS
-- ============================================================================

create trigger set_updated_at before update on public.profiles            for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.creators            for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.campaigns           for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.campaign_creators   for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.briefs              for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.scripts             for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.documents           for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.contract_templates  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.contracts           for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.messages            for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.deliverables        for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.payments            for each row execute function extensions.moddatetime (updated_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Internal single-tenant: any authenticated team member → full access.
-- service_role (workers) bypasses RLS automatically. The single exception is
-- waitlist_signups, which anon may INSERT into (the public form).
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.sources            enable row level security;
alter table public.creators           enable row level security;
alter table public.campaigns          enable row level security;
alter table public.campaign_creators  enable row level security;
alter table public.briefs             enable row level security;
alter table public.scripts            enable row level security;
alter table public.assets             enable row level security;
alter table public.script_assets      enable row level security;
alter table public.documents          enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contracts          enable row level security;
alter table public.messages           enable row level security;
alter table public.deliverables       enable row level security;
alter table public.payments           enable row level security;
alter table public.waitlist_signups   enable row level security;

-- Full access for authenticated team members on every internal table.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','sources','creators','campaigns','campaign_creators',
    'briefs','scripts','assets','script_assets','documents',
    'contract_templates','contracts','messages','deliverables','payments'
  ]
  loop
    execute format(
      'create policy "team_all" on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member());',
      t
    );
  end loop;
end $$;

-- Waitlist: public form may insert; team can read and manage.
create policy "anon_can_signup"   on public.waitlist_signups for insert to anon          with check (true);
create policy "team_read_waitlist" on public.waitlist_signups for select to authenticated using (public.is_team_member());
create policy "team_manage_waitlist" on public.waitlist_signups for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy "team_delete_waitlist" on public.waitlist_signups for delete to authenticated using (public.is_team_member());
