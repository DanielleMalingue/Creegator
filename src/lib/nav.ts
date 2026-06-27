// Sidebar navigation, grouped by the CLAUDE.md §7 workflow domains.
export type NavItem = { href: string; label: string; icon: string; soon?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: '◧' }],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/discover', label: 'Discover', icon: '⌕' },
      { href: '/creators', label: 'Creators', icon: '☺' },
      { href: '/campaigns', label: 'Campaigns', icon: '◇' },
      { href: '/outreach', label: 'Outreach', icon: '✉' },
    ],
  },
  {
    label: 'Creative & Deals',
    items: [
      { href: '/briefs', label: 'Briefs & Scripts', icon: '✎', soon: true },
      { href: '/contracts', label: 'Contracts', icon: '§', soon: true },
    ],
  },
  {
    label: 'Results',
    items: [
      { href: '/tracking', label: 'Tracking', icon: '◎', soon: true },
      { href: '/metrics', label: 'Metrics', icon: '▤', soon: true },
    ],
  },
  {
    label: 'Inbound',
    items: [{ href: '/waitlist', label: 'Waitlist', icon: '➜' }],
  },
];

// Routes that render WITHOUT the dashboard chrome (public marketing/forms).
export const PUBLIC_ROUTES = ['/', '/waitlist'];
