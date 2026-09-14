export type MediaItem = {
  id: string;
  type: 'foto' | 'video';
  src?: string;
  videoUrl?: string;
  poster?: string;
  alt: string;
  title?: string;
  subtitle?: string;
  aspectRatio: '9/16' | '3/4' | '1/1' | '16/9';
  featured?: boolean;
};

export { gallery } from './gallery.generated';