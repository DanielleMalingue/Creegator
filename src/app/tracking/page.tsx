import { ComingSoon } from '@/components/coming-soon';

export default function TrackingPage() {
  return (
    <ComingSoon
      title="Tracking"
      section="Results · §7.6"
      blurb="One place for who's where in the pipeline, the content they posted, its engagement, and payment status."
      planned={[
        'Content tracking — links to posted deliverables',
        'Engagement tracking — pull metrics via ScrapeCreators',
        'Payment tracking via Stripe Connect (startup → Creegator 1.5% → creator)',
        'Full per-creator history in one record',
      ]}
    />
  );
}
