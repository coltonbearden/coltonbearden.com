export interface Project {
  slug: string;
  title: string;
  docNumber: string;
  status: 'active' | 'in-development' | 'classified';
  summary: string;
  details: string[];
  link?: { href: string; label: string };
}

export const projects: Project[] = [
  {
    slug: 'severed-floor',
    title: 'The Severed Floor',
    docNumber: 'FC-CW-001',
    status: 'in-development',
    summary:
      'This website: a Severance-parody 3D world served from the edge, staffed by AI agents running on basement hardware, built in public.',
    details: [
      'Astro Surface deployed as Cloudflare Workers static assets.',
      'AI innies: Cloudflare Agents SDK (Durable Objects) fronting vLLM on an NVIDIA DGX Spark via Cloudflare Tunnel, with Workers AI covering outages.',
      'World: React Three Fiber + Theatre.js, arriving one room at a time.',
    ],
    link: { href: 'https://github.com/coltonbearden/coltonbearden.com', label: 'Repository' },
  },
  {
    slug: 'fleet',
    title: 'The Fleet',
    docNumber: 'FC-CW-002',
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
    docNumber: 'FC-CW-003',
    status: 'classified',
    summary:
      'A commercial platform for Claude Code plugins, in development. Details are severed until launch.',
    details: [
      'Front door and billing design are decided; the work is documented in decision logs, not press releases.',
      'When it nears sellable, the Chronicle will say so.',
    ],
  },
];
