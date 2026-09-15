// The downloadable cover follows the hero chosen in the admin.
// The site's player uses that hero directly, so changes appear immediately.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildPresentationCover(root = process.cwd()) {
  const { hero } = JSON.parse(readFileSync(join(root, 'data', 'section-images.json'), 'utf8'));
  const source = join(root, 'public', hero.src.split('?')[0].slice(1));
  const output = join(root, 'public', 'media');
  mkdirSync(output, { recursive: true });
  const staged = join(output, 'soso-apresentacao.tmp.jpg');
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', source,
    '-vf', 'scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2:color=0x111210,setsar=1',
    '-frames:v', '1', '-q:v', '2', staged], { stdio: 'pipe' });
  renameSync(staged, join(output, 'soso-apresentacao.jpg'));
  console.log(`Capa do resumo atualizada a partir de ${hero.src}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildPresentationCover();
