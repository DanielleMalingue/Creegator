import { ComingSoon } from '@/components/coming-soon';

export default function BriefsPage() {
  return (
    <ComingSoon
      title="Briefs & Scripts"
      section="Creative · §7.2"
      blurb="Reusable creative so you're not writing briefs and scripts from scratch every time."
      planned={[
        'Reusable brief + script templates',
        'Claude-assisted script generation tailored to creator/niche',
        'Asset library — attach sourced reference images to a script',
        'Reusable rules / recommendations library (write once, reuse everywhere)',
      ]}
    />
  );
}
