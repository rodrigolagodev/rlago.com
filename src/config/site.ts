export const site = {
  name: 'Rodrigo Lago',
  givenName: 'Rodrigo',
  familyName: 'Lago',
  role: 'UX Engineer',
  title: 'Rodrigo Lago — UX Engineer',
  shortName: 'Rodrigo Lago',
  description:
    "Rodrigo Lago — UX Engineer building interfaces for SaaS and e-commerce. He works alongside designers and developers to ship products that work for real people.",
  url: 'https://rlago.com',
  location: {
    city: 'Mar del Plata',
    region: 'Buenos Aires',
    country: 'AR',
    countryName: 'Argentina',
  },
  nationality: 'Argentine',
  lang: 'en',
  locale: 'en_US',
  themeColor: '#F0F0EB',
  ogImage: '/images/og.png',
  ogImageAlt: 'Rodrigo Lago — UX Engineer',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  avatar: '/images/photo.webp',
  knowsAbout: [
    'User Experience Design',
    'Front End Engineering',
    'Design Systems',
    'TypeScript',
    'React',
    'Astro',
    'Web Components',
    'Accessibility',
    'Design Tokens',
    'AI Tooling',
  ],
} as const;

export const contact = {
  email: 'rodrigo.n.lago@gmail.com',
  mailto: 'mailto:rodrigo.n.lago@gmail.com',
} as const;

export const social = {
  linkedin: {
    label: 'LinkedIn',
    handle: 'rodrigolago',
    url: 'https://linkedin.com/in/rnlago',
  },
  github: {
    label: 'GitHub',
    handle: 'rodrigolagodev',
    url: 'https://github.com/rodrigolagodev',
  },
} as const;

// Token map for content/*.json strings. Lets JSON files reference
// centralized URLs/handles without hardcoding them.
const tokens: Record<string, string> = {
  contactEmail: contact.email,
  contactMailto: contact.mailto,
  linkedinUrl: social.linkedin.url,
  linkedinLabel: social.linkedin.label,
  linkedinHandle: social.linkedin.handle,
  githubUrl: social.github.url,
  githubLabel: social.github.label,
  githubHandle: social.github.handle,
  siteName: site.name,
  siteUrl: site.url,
};

export function fillTokens(input: string): string {
  return input.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    tokens[key] !== undefined ? tokens[key] : `{{${key}}}`,
  );
}
