import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outFile = join(root, 'data', 'gallery.generated.ts');

const original = readFileSync(outFile, 'utf8');

execFileSync('node', ['scripts/generate-gallery.mjs'], { cwd: root, stdio: 'pipe' });
const first = readFileSync(outFile, 'utf8');

if (original !== first) {
  throw new Error('data/gallery.generated.ts estava desatualizado: rode npm run gallery e versione o resultado.');
}

execFileSync('node', ['scripts/generate-gallery.mjs'], { cwd: root, stdio: 'pipe' });
const second = readFileSync(outFile, 'utf8');

if (first !== second) {
  throw new Error('scripts/generate-gallery.mjs não é determinístico: a segunda execução modificou data/gallery.generated.ts.');
}

console.log('gallery up-to-date and deterministic: ok');
