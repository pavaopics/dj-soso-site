import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, extname, join, normalize } from 'node:path';

const root = process.cwd();
const galeria = join(root, 'public', 'galeria');
const descriptionsFile = join(galeria, 'descriptions.json');

const SAFE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const FOLDERS = new Set(['fotos', 'videos']);

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
  if (!FOLDERS.has(folder)) return null;
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
          if (url.pathname === '/api/admin/save' && req.method === 'POST') {
            const target = safePath(url.searchParams.get('path'));
            if (!target || extname(target.file).toLowerCase() === '.json') {
              return sendJson(res, 400, { error: 'path inválido' });
            }
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
            const file = join(galeria, target.folder, target.file);
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
            delete data[`${target.folder}/${target.file}`];
            saveDescriptions(data);
            return sendJson(res, 200, { ok: true });
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