import images from './section-images.json';

export type SectionImageKey = keyof typeof images;
export type SectionImageConfig = { label: string; src: string; alt: string; position: string };
export type SectionImages = Record<SectionImageKey, SectionImageConfig>;
export const sectionImages: SectionImages = images;
