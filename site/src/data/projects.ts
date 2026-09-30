export interface Project {
  slug: string;
  title: string;
  status: 'active' | 'in-development';
  summary: string;
  details: string[];
  link?: { href: string; label: string };
}

export const projects: Project[] = [
  {
    slug: 'coltonbearden-com',
    title: 'coltonbearden.com',
    status: 'active',
    summary:
      'This site and its domain, run from one public repository: a static Astro site plus the email, DNS and security setup behind it.',
    details: [
      'Astro site deployed as Cloudflare Workers static assets; every change goes through a pull request, and the deploy runs the same checks.',
      'Email on the domain with SPF, DKIM, DMARC, MTA-STS and TLS reporting in place.',
      'Security headers with an enforced Content-Security-Policy, and a committed DNS snapshot with a drift check.',
    ],
    link: { href: 'https://github.com/coltonbearden/coltonbearden.com', label: 'Repository' },
  },
  {
    slug: 'fleet',
    title: 'The Fleet',
    status: 'active',
    summary:
      'A six-machine homelab spanning Windows and Ubuntu, joined by a Tailscale mesh, sized for AI inference, containers, and administration.',
    details: [
      'NVIDIA DGX Spark for model serving and local generative pipelines.',
      'AMD 9950X workstation, ThinkPad T14, ASUS NUC 15 Pro+, and two Minisforum nodes with assigned roles.',
      'MagicDNS everywhere; the mesh is the management plane, and stays private.',
    ],
  },
  {
    slug: 'plugin-platform',
    title: 'Claude Code Plugin Platform',
    status: 'in-development',
    summary:
      'A commercial platform for Claude Code plugins, in development. Details will follow when it launches.',
    details: [
      'Front door and billing design are decided; the work is documented in decision logs, not press releases.',
      'When it nears launch, Notes will say so.',
    ],
  },
];
