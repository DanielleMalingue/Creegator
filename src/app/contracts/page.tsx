import { ComingSoon } from '@/components/coming-soon';

export default function ContractsPage() {
  return (
    <ComingSoon
      title="Contracts"
      section="Deals · §7.3 / §7.4"
      blurb="One template + per-creator variables auto-generates a personalized contract for every creator — built on the five pricing models."
      planned={[
        'Five pricing models: flat · +usage/whitelisting · bundle · performance · hybrid',
        'Rate guidance so payments aren’t left on the table',
        'Contract builder: template + variables → generated copy per creator',
        'Reusable "non-negotiable terms" letter, stored once, auto-attached on send',
      ]}
    />
  );
}
