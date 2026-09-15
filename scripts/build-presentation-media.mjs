// Rebuilds the short presentation using the existing five source videos.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizePresentationAudio } from './normalize-presentation-audio.mjs';
import { buildPresentationCover } from './build-presentation-cover.mjs';

const root = process.cwd();
const output = join(root, 'public', 'media');
mkdirSync(output, { recursive: true });
const input = [];
const filters = [];
for (let i = 0; i < 5; i++) {
  const file = join(root, 'public', 'galeria', 'videos', `${i + 1}.mp4`);
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  if (Number(metadata.format.duration) < 7 || !metadata.streams.some(stream => stream.codec_type === 'audio')) throw new Error(`A fonte ${file} precisa de áudio e ao menos 7 segundos.`);
  input.push('-i', file);
  filters.push(`[${i}:v]trim=start=0:duration=7,setpts=PTS-STARTPTS,scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}]`);
  filters.push(`[${i}:a]atrim=start=0:duration=7,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.12,afade=t=out:st=6.8:d=0.2[a${i}]`);
}
filters.push(`${Array.from({ length: 5 }, (_, i) => `[v${i}][a${i}]`).join('')}concat=n=5:v=1:a=1[v][a]`);
execFileSync('ffmpeg', ['-y', ...input, '-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '25', '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', join(output, 'soso-apresentacao.mp4')], { stdio: 'pipe' });
normalizePresentationAudio(join(output, 'soso-apresentacao.mp4'));
buildPresentationCover(root);
console.log('Vídeo de apresentação: 35 segundos, 576 × 1024, volume normalizado entre os trechos.');
