// Two-pass loudness matching for the five 7-second edits in the presentation.
// Works from the assembled video, even when gallery originals have been replaced.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const segmentSeconds = 7;
const segmentCount = 5;
// -18 LUFS leaves room for the most dynamic excerpt without flattening its music.
const target = { integrated: -18, truePeak: -2, range: 11 };
const loudnessFilter = `loudnorm=I=${target.integrated}:TP=${target.truePeak}:LRA=${target.range}`;
const trim = index => `atrim=start=${index * segmentSeconds}:duration=${segmentSeconds},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo`;

function measure(file, index) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-sn', '-dn', '-af', `${trim(index)},${loudnessFilter}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  const match = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw new Error(`Não foi possível medir o áudio do trecho ${index + 1}.`);
  const measured = JSON.parse(match[0]);
  for (const key of ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']) {
    if (!Number.isFinite(Number(measured[key]))) throw new Error(`O trecho ${index + 1} não contém áudio mensurável.`);
  }
  return measured;
}

function videoHash(file) {
  return execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { encoding: 'utf8' }).trim();
}

export function normalizePresentationAudio(file = join(process.cwd(), 'public', 'media', 'soso-apresentacao.mp4')) {
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  if (Math.abs(Number(metadata.format.duration) - segmentCount * segmentSeconds) > 0.1 || !metadata.streams.some(stream => stream.codec_type === 'audio')) {
    throw new Error('Esta normalização espera a montagem de 35 segundos, com cinco trechos de 7 segundos e áudio.');
  }
  const outputDir = join(process.cwd(), 'outputs');
  mkdirSync(outputDir, { recursive: true });
  const work = mkdtempSync(join(outputDir, 'presentation-audio-'));
  const original = join(work, 'original.mp4');
  const normalized = join(work, 'normalized.mp4');
  copyFileSync(file, original);

  const before = Array.from({ length: segmentCount }, (_, index) => measure(original, index));
  const filters = before.map((measured, index) => `[0:a:0]${trim(index)},${loudnessFilter}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,aresample=48000,apad,atrim=duration=${segmentSeconds}[a${index}]`);
  filters.push(`${before.map((_, index) => `[a${index}]`).join('')}concat=n=${segmentCount}:v=0:a=1[audio]`);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-nostats', '-i', original, '-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[audio]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-t', String(segmentCount * segmentSeconds), '-movflags', '+faststart', normalized], { stdio: 'pipe' });

  const after = before.map((_, index) => measure(normalized, index));
  const levels = after.map(measured => Number(measured.input_i));
  if (Math.max(...levels) - Math.min(...levels) > 1 || after.some(measured => Math.abs(Number(measured.input_i) - target.integrated) > 1 || Number(measured.input_tp) > -1)) {
    throw new Error(`A verificação de volume falhou. Os arquivos para revisão estão em ${work}.`);
  }
  if (videoHash(original) !== videoHash(normalized)) throw new Error('A faixa de vídeo não foi preservada.');
  const report = { target, segmentSeconds, segmentCount, videoUnchanged: true, segments: before.map((measured, index) => ({ segment: index + 1, beforeLUFS: Number(measured.input_i), afterLUFS: Number(after[index].input_i), afterTruePeakDBTP: Number(after[index].input_tp) })) };
  writeFileSync(join(work, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  renameSync(normalized, file);
  console.table(report.segments);
  console.log(`Resumo normalizado: 35 segundos, alvo ${target.integrated} LUFS, vídeo preservado. Original e relatório: ${work}`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) normalizePresentationAudio();
