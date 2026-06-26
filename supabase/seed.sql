-- ============================================================================
-- Creegator — seed data (§5: fake creators on day one so the CRM can be built
-- in parallel before the real discovery pipeline produces data).
-- Runs via `supabase db reset` with elevated privileges (RLS not in the way).
-- ============================================================================

-- Sources ---------------------------------------------------------------------
insert into public.sources (id, type, label, platform, query) values
  ('11111111-1111-1111-1111-111111111111', 'hashtag',         '#ugccreator',     'tiktok',    '#ugccreator'),
  ('22222222-2222-2222-2222-222222222222', 'hashtag',         '#ugcportfolio',   'instagram', '#ugcportfolio'),
  ('33333333-3333-3333-3333-333333333333', 'discovery_query', 'beauty ugc',      'tiktok',    'beauty ugc creator'),
  ('44444444-4444-4444-4444-444444444444', 'inbound',         'inbound waitlist', null,       null);

-- Creators --------------------------------------------------------------------
insert into public.creators
  (dedupe_key, display_name, handle, primary_platform, handles, niche, bio, email, email_status, link_in_bio, follower_count, engagement_rate, fit_score, fit_notes, status, tags, source_id)
values
  ('tiktok:@mayamakesugc', 'Maya R.',   '@mayamakesugc', 'tiktok',
    '{"instagram":"@mayamakes"}', 'beauty', 'UGC creator | skincare + makeup | DM for rates',
    'maya@example.com', 'valid', 'https://linktr.ee/mayamakesugc', 48200, 0.0612, 88,
    'Strong skincare niche fit, posts authentic talking-head reviews, rate card public.', 'active', '{"beauty","skincare"}',
    '11111111-1111-1111-1111-111111111111'),

  ('tiktok:@thefitcreator', 'Devon K.', '@thefitcreator', 'tiktok',
    '{"youtube":"@devonkfit"}', 'fitness', 'Fitness + supplement UGC. 200+ brand videos.',
    'devon@example.com', 'valid', 'https://linktr.ee/thefitcreator', 91500, 0.0431, 81,
    'High output, supplement experience. Slightly broad niche.', 'qualified', '{"fitness","supplements"}',
    '11111111-1111-1111-1111-111111111111'),

  ('instagram:@cozyhomereels', 'Priya S.', '@cozyhomereels', 'instagram',
    '{}', 'home', 'Home + lifestyle reels. UGC portfolio in bio.',
    'priya@example.com', 'unverified', 'https://priyas.myportfolio.com', 22300, 0.0529, 74,
    'Good aesthetic for home goods; email not yet verified.', 'enriched', '{"home","lifestyle"}',
    '22222222-2222-2222-2222-222222222222'),

  ('tiktok:@snackbreakreviews', 'Marcus T.', '@snackbreakreviews', 'tiktok',
    '{"instagram":"@snackbreak"}', 'food', 'Food + snack reviews. Fast, punchy edits.',
    'marcus@example.com', 'risky', 'https://linktr.ee/snackbreak', 134000, 0.0378, 69,
    'Big reach but catch-all email flagged risky — verify before send.', 'active', '{"food","reviews"}',
    '33333333-3333-3333-3333-333333333333'),

  ('youtube:@glowwithtara', 'Tara L.', '@glowwithtara', 'youtube',
    '{"instagram":"@glowwithtara","tiktok":"@glowwithtara"}', 'beauty', 'Long-form skincare reviews + GRWM.',
    'tara@example.com', 'valid', 'https://beacons.ai/glowwithtara', 67800, 0.0488, 85,
    'Multi-platform, polished. Higher rates likely.', 'active', '{"beauty","skincare"}',
    '33333333-3333-3333-3333-333333333333'),

  ('tiktok:@budgetmomhacks', 'Renee W.', '@budgetmomhacks', 'tiktok',
    '{}', 'parenting', 'Mom hacks + budget finds. Relatable UGC.',
    null, 'unverified', 'https://linktr.ee/budgetmomhacks', 58900, 0.0701, 77,
    'Excellent engagement, no email found yet — needs enrichment pass.', 'new', '{"parenting","budget"}',
    '11111111-1111-1111-1111-111111111111'),

  ('instagram:@techunboxd', 'Sam P.', '@techunboxd', 'instagram',
    '{"youtube":"@techunboxd"}', 'tech', 'Gadget unboxings + honest UGC reviews.',
    'sam@example.com', 'valid', 'https://techunboxd.com', 41200, 0.0356, 72,
    'Niche may be pricey for UGC; solid production.', 'qualified', '{"tech","gadgets"}',
    '22222222-2222-2222-2222-222222222222'),

  ('inbound:hello@jordanmakes.co', 'Jordan M.', '@jordanmakesco', 'tiktok',
    '{"instagram":"@jordanmakes"}', 'fashion', 'Applied via waitlist. Fashion + accessories UGC.',
    'hello@jordanmakes.co', 'valid', 'https://jordanmakes.co', 15600, 0.0822, 90,
    'Inbound = high intent. Top engagement, clear UGC offering.', 'active', '{"fashion","inbound"}',
    '44444444-4444-4444-4444-444444444444');

-- A campaign and enrollments across the pipeline ------------------------------
insert into public.campaigns (id, name, brand, status, description) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Addison Spring UGC Push', 'Addison', 'active',
   'Customer-zero campaign: source + outreach for spring product line.');

insert into public.campaign_creators (campaign_id, creator_id, stage, priority, notes)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', c.id, v.stage::pipeline_stage, v.priority, v.notes
from (values
  ('tiktok:@mayamakesugc',        'replied',     10, 'Replied, interested — send rates.'),
  ('youtube:@glowwithtara',       'contacted',    8, 'Opener sent from warmed domain.'),
  ('inbound:hello@jordanmakes.co','negotiating',  9, 'Inbound, negotiating usage rights.'),
  ('tiktok:@thefitcreator',       'new',          5, null),
  ('instagram:@cozyhomereels',    'new',          4, 'Verify email first.'),
  ('tiktok:@snackbreakreviews',   'contacted',    3, 'Verify risky email before next send.')
) as v(dedupe_key, stage, priority, notes)
join public.creators c on c.dedupe_key = v.dedupe_key;

-- Reusable non-negotiable terms letter (§7.4) ---------------------------------
insert into public.documents (name, kind, body, is_default) values
  ('Standard Non-Negotiable Terms', 'non_negotiable_terms',
   'All deliverables include a 14-day revision window. Usage rights are limited to '
   'the agreed channels and duration. Payment via Stripe within 7 days of approval. '
   'Creator retains the right to be credited.', true);

-- A contract template across the flat pricing model (§7.3) --------------------
insert into public.contract_templates (name, body, default_pricing_model, default_pricing) values
  ('Flat Per-Deliverable v1',
   'This agreement is between {{brand}} and {{creator_name}} for {{deliverable_count}} '
   'UGC deliverable(s) at {{rate}} each, total {{total}}. {{non_negotiable_terms}}',
   'flat_per_deliverable',
   '{"rate_cents": 25000, "deliverable_count": 2, "currency": "usd"}'::jsonb);
