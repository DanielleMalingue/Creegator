import Anthropic from '@anthropic-ai/sdk';

// Claude-drafted outreach openers (§7.5) — the single biggest lever on reply
// rate. Server-only: uses ANTHROPIC_API_KEY. Model: claude-sonnet-4-6.

const MODEL = 'claude-sonnet-4-6';

export function isAnthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY. Add it to .env.local.');
  }
  return new Anthropic();
}

export type OpenerInput = {
  displayName: string | null;
  handle: string | null;
  niche: string | null;
  bio: string | null;
  fitNotes: string | null;
  followerCount: number | null;
  platform: string;
  brand: string | null;
  campaign: string | null;
};

export type GeneratedOpener = { subject: string; opener: string };

const OPENER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: { type: 'string', description: 'Short, specific email subject line (≤ 8 words). No emoji.' },
    opener: {
      type: 'string',
      description:
        '2–3 sentence cold-email opener addressed to the creator. References something concrete from their bio/niche. Warm, specific, not salesy. No emoji, no "Hope this finds you well".',
    },
  },
  required: ['subject', 'opener'],
} as const;

const SYSTEM = `You write the opening of cold outreach emails to UGC (user-generated content) creators on behalf of a brand.

The opener is the single biggest lever on reply rate, so it must feel personal and specific — like the sender actually looked at the creator's profile.

Rules:
- Reference something concrete from the creator's bio or niche. Never generic flattery.
- 2–3 sentences. Conversational, warm, peer-to-peer — not corporate.
- No emoji. No clichés ("Hope this finds you well", "I came across your profile", "your content is amazing").
- Don't pitch rates or deliverables yet — this is just the opener that earns a reply.
- Subject line: short, specific, lowercase-ish, curiosity without clickbait.`;

export async function generateOpener(input: OpenerInput): Promise<GeneratedOpener> {
  const profile = [
    `Creator: ${input.displayName ?? input.handle ?? 'unknown'} (${input.handle ?? ''}, ${input.platform})`,
    input.niche ? `Niche: ${input.niche}` : null,
    input.followerCount ? `Followers: ${input.followerCount.toLocaleString()}` : null,
    input.bio ? `Bio: "${input.bio}"` : null,
    input.fitNotes ? `Why they're a fit: ${input.fitNotes}` : null,
    input.brand ? `Brand reaching out: ${input.brand}` : null,
    input.campaign ? `Campaign: ${input.campaign}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: OPENER_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `Write the outreach opener for this creator:\n\n${profile}`,
      },
    ],
  });

  const parsed = response.parsed_output as GeneratedOpener | null;
  if (!parsed) throw new Error('Could not parse opener from model response.');
  return parsed;
}
