import { ComingSoon } from '@/components/coming-soon';

export default function OutreachPage() {
  return (
    <ComingSoon
      title="Outreach"
      section="Pipeline · §7.5"
      blurb="Queue-based, semi-automated cold email with a human review step. The Claude-drafted personalized opener is the single biggest lever on reply rate."
      planned={[
        'Claude-drafted opener per creator, referencing their actual content',
        'Message templates with personalization tokens + auto-filled headers',
        'Contract + non-negotiable letter auto-attached to each send',
        'Verify emails before send; throttle ~15–20/inbox/day from warmed domains',
        'Review queue → send → track opens/replies back into the CRM',
      ]}
    />
  );
}
