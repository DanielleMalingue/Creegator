import { ComingSoon } from '@/components/coming-soon';

export default function MetricsPage() {
  return (
    <ComingSoon
      title="Metrics"
      section="Results · §7.7"
      blurb="Funnel analytics so targeting, personalization, and volume can be tuned over time to lift collab and payment rates."
      planned={[
        'Funnel: sent → opened → replied → collab rate',
        'Pricing visibility to raise payments',
        'Fit-scoring + personalization quality vs. reply-rate correlation',
      ]}
    />
  );
}
