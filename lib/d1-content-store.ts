import type { MediaItem } from '@/data/content';
import { sectionImages as fallbackSectionImages, type SectionImageConfig, type SectionImageKey, type SectionImages } from '@/data/section-images';

type MediaRow = {
  id: string;
  type: 'photo' | 'video';
  title: string | null;
  description: string | null;
  r2_key: string;
  poster_r2_key: string | null;
  aspect_ratio: MediaItem['aspectRatio'];
  display_order: number;
};

type SectionRow = {
  id: SectionImageKey;
  label: string;
  image_alt: string | null;
  image_position: string;
  r2_key: string | null;
};

export type CloudPublicContent = {
  gallery: MediaItem[];
  sectionImages: SectionImages;
};

function publicAssetUrl(baseUrl: string, r2Key: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${r2Key.replace(/^\/+/, '')}`;
}

function requirePublicBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl) throw new Error('R2_PUBLIC_BASE_URL não configurado para CONTENT_SOURCE=cloud.');
  return baseUrl;
}

function mediaRowToItem(row: MediaRow, baseUrl: string): MediaItem {
  const title = row.title || row.description || (row.type === 'photo' ? 'Foto' : 'Vídeo');
  const description = row.description || title;
  if (row.type === 'video') {
    return {
      id: row.id,
      type: 'video',
      videoUrl: publicAssetUrl(baseUrl, row.r2_key),
      poster: row.poster_r2_key ? publicAssetUrl(baseUrl, row.poster_r2_key) : undefined,
      alt: description,
      title,
      subtitle: description,
      aspectRatio: row.aspect_ratio || '9/16',
    };
  }
  return {
    id: row.id,
    type: 'foto',
    src: publicAssetUrl(baseUrl, row.r2_key),
    alt: description,
    title,
    aspectRatio: row.aspect_ratio || '3/4',
  };
}

export async function readCloudPublicContent(db: D1Database | undefined, publicBaseUrl: string | undefined): Promise<CloudPublicContent> {
  if (!db) throw new Error('CONTENT_DB não configurado para CONTENT_SOURCE=cloud.');
  const baseUrl = requirePublicBaseUrl(publicBaseUrl);

  const media = await db.prepare(
    `SELECT id, type, title, description, r2_key, poster_r2_key, aspect_ratio, display_order
     FROM media_items
     WHERE status = 'active' AND type IN ('photo', 'video')
     ORDER BY display_order ASC, created_at ASC`,
  ).all<MediaRow>();

  const sections = await db.prepare(
    `SELECT s.id, s.label, s.image_alt, s.image_position, m.r2_key
     FROM section_content s
     LEFT JOIN media_items m ON m.id = s.image_media_id AND m.status = 'active'
     WHERE s.status = 'active'
     ORDER BY s.id ASC`,
  ).all<SectionRow>();

  const gallery = (media.results || []).map(row => mediaRowToItem(row, baseUrl));
  const nextSections: Partial<SectionImages> = {};

  for (const row of sections.results || []) {
    if (!Object.hasOwn(fallbackSectionImages, row.id)) continue;
    if (!row.r2_key) throw new Error(`Seção ${row.id} sem imagem ativa no D1.`);
    nextSections[row.id] = {
      label: row.label,
      src: publicAssetUrl(baseUrl, row.r2_key),
      alt: row.image_alt || fallbackSectionImages[row.id].alt,
      position: row.image_position || '50% 50%',
    } satisfies SectionImageConfig;
  }

  for (const key of Object.keys(fallbackSectionImages) as SectionImageKey[]) {
    if (!nextSections[key]) throw new Error(`Seção ${key} ausente no D1 com CONTENT_SOURCE=cloud.`);
  }

  return { gallery, sectionImages: nextSections as SectionImages };
}
