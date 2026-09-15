import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, extname, join, normalize } from 'node:path';

const root = process.cwd();
const galeria = join(root, 'public', 'galeria');
const descriptionsFile = join(galeria, 'descriptions.json');
const sectionImagesFile = join(root, 'data', 'section-images.json');

const SAFE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const FOLDERS = new Set(['fotos', 'videos']);
const UPLOAD_FOLDERS = new Set([...FOLDERS, 'secoes']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const POSITIONS = new Set(['50% 0%', '50% 25%', '50% 35%', '50% 50%', '50% 100%']);

function loadSectionImages() {
  return JSON.parse(readFileSync(sectionImagesFile, 'utf8'));
}

function saveSectionImages(images) {
  const temp = `${sectionImagesFile}.tmp`;
  writeFileSync(temp, `${JSON.stringify(images, null, 2)}\n`);
  renameSync(temp, sectionImagesFile);
}

function validSectionSource(src, sections) {
  if (typeof src !== 'string') return false;
  const path = src.split('?')[0];
  const galleryPath = /^\/galeria\/(fotos|secoes)\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path);
  const originalPath = /^\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path) && Object.values(sections).some(image => image.src.split('?')[0] === path);
  return (galleryPath || originalPath) && IMAGE_EXTS.has(extname(path).toLowerCase()) && existsSync(join(root, 'public', path.slice(1)));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function pipeBody(req, dest) {
  return new Promise((resolve, reject) => {
    const ws = createWriteStream(dest);
    req.on('error', reject);
    ws.on('error', reject);
    ws.on('close', resolve);
    req.pipe(ws);
  });
}

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function loadDescriptions() {
  if (!existsSync(descriptionsFile)) return {};
  try {
    return JSON.parse(readFileSync(descriptionsFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveDescriptions(data) {
  mkdirSync(galeria, { recursive: true });
  writeFileSync(descriptionsFile, `${JSON.stringify(data, null, 2)}\n`);
}

function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
}

function safePath(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = normalize(raw.split('?')[0]).replace(/^\/+/, '');
  const parts = clean.split('/');
  if (parts.length !== 2) return null;
  const [folder, rawName] = parts;
  if (!UPLOAD_FOLDERS.has(folder)) return null;
  const name = slugify(rawName);
  if (!name || !SAFE_RE.test(name) || name.toLowerCase().endsWith('.json')) return null;
  return { folder, file: name };
}

export function adminApiPlugin() {
  return {
    name: 'admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/admin/')) return next();
        if (!req.method) return next();
        console.log(`[admin] ${req.method} ${url.pathname}${url.search}`);
        try {
          if (url.pathname === '/api/admin/sections' && req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-store');
            return sendJson(res, 200, { images: loadSectionImages() });
          }

          if (url.pathname === '/api/admin/sections' && req.method === 'POST') {
            const { id, src, alt, position } = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            const images = loadSectionImages();
            if (typeof id !== 'string' || !Object.hasOwn(images, id)) return sendJson(res, 400, { error: 'seção inválida' });
            if (!validSectionSource(src, images)) return sendJson(res, 400, { error: 'escolha uma imagem existente ou envie uma nova foto' });
            if (typeof alt !== 'string' || !alt.trim() || alt.length > 500) return sendJson(res, 400, { error: 'descreva a imagem em até 500 caracteres' });
            if (!POSITIONS.has(position)) return sendJson(res, 400, { error: 'enquadramento inválido' });
            images[id] = { ...images[id], src, alt: alt.trim(), position };
            saveSectionImages(images);
            return sendJson(res, 200, { ok: true, images });
          }

          if (url.pathname === '/api/admin/save' && req.method === 'POST') {
            const target = safePath(url.searchParams.get('path'));
            if (!target || extname(target.file).toLowerCase() === '.json') {
              return sendJson(res, 400, { error: 'path inválido' });
            }
            const allowed = target.folder === 'videos' ? VIDEO_EXTS : IMAGE_EXTS;
            if (!allowed.has(extname(target.file).toLowerCase())) return sendJson(res, 400, { error: 'formato de mídia inválido' });
            const folder = join(galeria, target.folder);
            mkdirSync(folder, { recursive: true });
            const dest = join(folder, target.file);
            if (existsSync(dest)) {
              return sendJson(res, 409, { error: `"${target.file}" já existe. Escolha outro número ou remova o arquivo antes.` });
            }
            await pipeBody(req, dest);
            return sendJson(res, 200, { ok: true, path: `${target.folder}/${target.file}` });
          }

          if (url.pathname === '/api/admin/cover' && req.method === 'POST') {
            const name = url.searchParams.get('name');
            if (!name || !SAFE_RE.test(name)) return sendJson(res, 400, { error: 'nome inválido' });
            const body = await readBody(req);
            writeFileSync(join(galeria, 'videos', `${basename(name, extname(name))}.jpg`), body);
            return sendJson(res, 200, { ok: true, path: `videos/${basename(name, extname(name))}.jpg` });
          }

          if (url.pathname === '/api/admin/clear-cover' && req.method === 'POST') {
            const name = url.searchParams.get('name');
            if (!name || !SAFE_RE.test(name)) return sendJson(res, 400, { error: 'nome inválido' });
            const base = basename(name, extname(name));
            let removed = 0;
            for (const cand of [`${base}.jpg`, `${base}.png`, `${base}.webp`]) {
              const p = join(galeria, 'videos', cand);
              if (existsSync(p)) {
                unlinkSync(p);
                removed++;
              }
            }
            const c = join(galeria, 'videos', 'covers', `${base}.jpg`);
            if (existsSync(c)) {
              unlinkSync(c);
              removed++;
            }
            return sendJson(res, 200, { ok: true, removed });
          }

          if (url.pathname === '/api/admin/describe' && req.method === 'POST') {
            const payload = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            const path = payload.path;
            const description = typeof payload.description === 'string' ? payload.description : '';
            const limit = Number(payload.limit) || 120;
            const key = String(path);
            const parts = key.split('/');
            if (parts.length !== 2 || !FOLDERS.has(parts[0])) {
              return sendJson(res, 400, { error: 'path inválido' });
            }
            if (description.length > limit) {
              return sendJson(res, 400, { error: `máximo de ${limit} caracteres` });
            }
            const data = loadDescriptions();
            for (const storedKey of Object.keys(data)) {
              if (storedKey.toLowerCase() === key.toLowerCase()) delete data[storedKey];
            }
            if (description.trim()) data[key] = description.trim();
            else delete data[key];
            saveDescriptions(data);
            return sendJson(res, 200, { ok: true });
          }

          if (url.pathname === '/api/admin/generate' && req.method === 'POST') {
            const out = execFileSync('node', [join(root, 'scripts', 'generate-gallery.mjs'), '--json'], {
              encoding: 'utf8',
              cwd: root,
            });
            const match = out.match(/\[[\s\S]*\]\s*$/);
            const items = match ? JSON.parse(match[0]) : [];
            return sendJson(res, 200, { ok: true, items });
          }

          if (url.pathname === '/api/admin/remove' && req.method === 'POST') {
            const target = safePath(url.searchParams.get('path'));
            if (!target) return sendJson(res, 400, { error: 'path inválido' });
            const source = `/galeria/${target.folder}/${target.file}`;
            const file = join(galeria, target.folder, target.file);
            const images = loadSectionImages();
            const usedBy = Object.entries(images).filter(([, image]) => image.src.split('?')[0] === source);
            if (usedBy.length) {
              if (target.folder !== 'fotos') return sendJson(res, 409, { error: 'Troque a imagem da seção antes de remover este arquivo.' });
              const sectionDir = join(galeria, 'secoes');
              mkdirSync(sectionDir, { recursive: true });
              const name = `galeria-${randomUUID()}${extname(target.file)}`;
              copyFileSync(file, join(sectionDir, name));
              for (const [id, image] of usedBy) images[id] = { ...image, src: `/galeria/secoes/${name}` };
              saveSectionImages(images);
            }
            if (existsSync(file)) unlinkSync(file);
            const base = basename(target.file, extname(target.file));
            if (target.folder === 'videos') {
              for (const cand of [`${base}.jpg`, `${base}.png`, `${base}.webp`]) {
                const p = join(galeria, 'videos', cand);
                if (existsSync(p)) unlinkSync(p);
              }
              const c = join(galeria, 'videos', 'covers', `${base}.jpg`);
              if (existsSync(c)) unlinkSync(c);
            }
            const data = loadDescriptions();
            for (const key of Object.keys(data)) {
              if (key.toLowerCase() === `${target.folder}/${target.file}`.toLowerCase()) delete data[key];
            }
            saveDescriptions(data);
            return sendJson(res, 200, { ok: true, preservedSections: usedBy.map(([, image]) => image.label) });
          }

          return sendJson(res, 404, { error: 'endpoint desconhecido' });
        } catch (e) {
          console.error('[admin] error:', e && e.message ? e.message : e);
          return sendJson(res, 500, { error: String(e && e.message ? e.message : e) });
        }
      });
    },
  };
}
