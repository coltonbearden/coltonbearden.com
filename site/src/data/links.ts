export interface SocialLink {
  label: string;
  href: string;
  handle: string;
  goodFor: string;
}

// The site's social links: the footer, /contact/ and /about/ all render from this list.
export const links: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/coltonbearden',
    handle: 'coltonbearden',
    goodFor: "Code, issues, and this site's own repository.",
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/colton-b-0582ab172/',
    handle: 'colton-b-0582ab172',
    goodFor: 'Professional contact.',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/coltonbearden16/',
    handle: '@coltonbearden16',
    goodFor: 'Personal account.',
  },
];
