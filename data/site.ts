export const site = {
  name: 'DJ SOSÔ', location: 'São Paulo, Brazil',
  description: 'DJ, music lover and 9-year-old explorer of decks, synths, loops and sound.',
  navigation: [
    { label: 'About', href: '#about' }, { label: 'Watch', href: '#watch' },
    { label: 'Music Lab', href: '#music-lab' }, { label: 'Gallery', href: '#gallery' },
    { label: 'Contact', href: '#contact' },
  ],
  social: { instagram: '#', tiktok: '#', youtube: '#' }, // TODO: official URLs
  contact: { manager: 'Bruno Pavão', role: 'Manager / Responsible Adult', email: 'booking@example.com', whatsapp: '#' }, // TODO: real contact details
} as const;
export type SiteConfig = typeof site;
