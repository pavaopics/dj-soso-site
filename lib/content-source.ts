import type { MediaItem } from '@/data/content';
import type { SectionImages } from '@/data/section-images';
import { getCloudflareEnv, getContentSource, type ContentSource } from '@/lib/cloudflare-env';
import { localPublicContent } from '@/lib/content-fallback';
import { readCloudPublicContent } from '@/lib/d1-content-store';

export type PublicContent = {
  source: ContentSource;
  gallery: MediaItem[];
  sectionImages: SectionImages;
};

export async function getPublicContent(): Promise<PublicContent> {
  const bindings = getCloudflareEnv();
  const source = getContentSource(bindings);

  if (source === 'local') {
    return { source, ...localPublicContent };
  }

  const content = await readCloudPublicContent(bindings.CONTENT_DB, bindings.R2_PUBLIC_BASE_URL);
  return { source, ...content };
}
