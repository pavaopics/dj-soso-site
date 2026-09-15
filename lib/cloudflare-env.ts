import { env } from 'cloudflare:workers';

export type ContentSource = 'local' | 'cloud';

export type CloudflareBindings = {
  CONTENT_SOURCE?: string;
  R2_PUBLIC_BASE_URL?: string;
  CONTENT_DB?: D1Database;
  MEDIA_BUCKET?: R2Bucket;
};

export function getCloudflareEnv(): CloudflareBindings {
  return env as CloudflareBindings;
}

export function getContentSource(bindings: CloudflareBindings = getCloudflareEnv()): ContentSource {
  return bindings.CONTENT_SOURCE === 'cloud' ? 'cloud' : 'local';
}
