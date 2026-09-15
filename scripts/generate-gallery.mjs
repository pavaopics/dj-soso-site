import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

const root = process.cwd();
const fotoDir = join(root, 'public', 'galeria', 'fotos');
const videoDir = join(root, 'public', 'galeria', 'videos');
const coverDir = join(videoDir, 'covers');
const outFile = join(root, 'data', 'gallery.generated.ts');

const numericKey = (name) => {
  const match = name.match(/^(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const sortAscending = (a, b) => {
  const na = numericKey(a);
  const nb = numericKey(b);
  if (na !== nb) return na - nb;
  return a.localeCompare(b, 'pt', { numeric: true });
};

const contentHash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);

const listFiles = (dir, exts) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => exts.has(extname(f).toLowerCase()) && !f.startsWith('.'))
    .sort(sortAscending);
};

const hasFfmpeg = () => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

const durationOf = (file) => {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
      { encoding: 'utf8' },
    );
    const d = parseFloat(out.trim());
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
};

const extractCover = (file, base) => {
  const videoPath = join(videoDir, file);
  const videoHash = contentHash(videoPath);
  const manual = [...PHOTO_EXTS]
    .map((e) => join(videoDir, `${base}${e}`))
    .find((p) => existsSync(p));
  if (manual) {
    return `/galeria/videos/${basename(manual)}?v=${contentHash(manual)}`;
  }
  if (!hasFfmpeg()) return null;

  const outPath = join(coverDir, `${base}.jpg`);
  if (existsSync(outPath)) return `/galeria/videos/covers/${base}.jpg?v=${videoHash}`;

  const coverTimes = {};
  const timesFile = join(videoDir, '.cover-times.json');
  if (existsSync(timesFile)) Object.assign(coverTimes, JSON.parse(readFileSync(timesFile, 'utf8')));

  const duration = durationOf(videoPath);
  const wanted = typeof coverTimes[file] === 'number' ? coverTimes[file] : duration
    ? Math.min(Math.max(duration * 0.1, 0.5), Math.max(0, duration - 0.5))
    : 0;

  mkdirSync(coverDir, { recursive: true });
  try {
    execFileSync(
      'ffmpeg',
      ['-y', '-ss', String(wanted), '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPath],
      { stdio: 'pipe' },
    );
    return `/galeria/videos/covers/${base}.jpg?v=${videoHash}`;
  } catch {
    return null;
  }
};

const photos = listFiles(fotoDir, PHOTO_EXTS);
const videos = listFiles(videoDir, VIDEO_EXTS);

const descriptionsFile = join(root, 'public', 'galeria', 'descriptions.json');
let descriptions = {};
if (existsSync(descriptionsFile)) {
  try {
    descriptions = JSON.parse(readFileSync(descriptionsFile, 'utf8'));
  } catch {
    descriptions = {};
  }
}
const descriptionOf = (folder, file) => {
  const key = `${folder}/${file}`;
  const storedKey = Object.keys(descriptions).find(path => path.toLowerCase() === key.toLowerCase());
  return descriptions[key] ?? (storedKey ? descriptions[storedKey] : undefined);
};

const photoItems = photos.map((file, i) => {
  const base = basename(file, extname(file));
  const subtitle = descriptionOf('fotos', file);
  return {
    id: `foto-${i + 1}`,
    type: 'foto',
    src: `/galeria/fotos/${file}?v=${contentHash(join(fotoDir, file))}`,
    alt: subtitle || base,
    title: subtitle || base,
    ...(subtitle ? { subtitle } : {}),
    aspectRatio: '3/4',
  };
});

const videoItems = videos.map((file, i) => {
  const base = basename(file, extname(file));
  const poster = extractCover(file, base);
  const subtitle = descriptionOf('videos', file);
  return {
    id: `video-${i + 1}`,
    type: 'video',
    videoUrl: `/galeria/videos/${file}?v=${contentHash(join(videoDir, file))}`,
    ...(poster ? { poster } : {}),
    alt: subtitle || base,
    title: subtitle || base,
    ...(subtitle ? { subtitle } : {}),
    aspectRatio: '9/16',
  };
});

const items = [...videoItems, ...photoItems];
const lines = items.length
  ? `export const gallery: MediaItem[] = [\n${items
      .map((it) => `  ${JSON.stringify(it)},`)
      .join('\n')}\n];`
  : 'export const gallery: MediaItem[] = [];';
const content = `/* Gerado automaticamente por scripts/generate-gallery.mjs. Nao edite manualmente. */\nimport type { MediaItem } from './content';\n\n${lines}\n`;

writeFileSync(outFile, content);
console.log(`galeria: ${items.length} itens (${videoItems.length} videos, ${photoItems.length} fotos) -> ${outFile}`);

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(items)}`);
}
