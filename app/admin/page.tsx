/* eslint-disable no-html-link-for-pages, next/no-img-element, jsx-a11y/media-has-caption */
'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Film, Image as ImageIcon, Lock, LogOut, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import type { MediaItem } from '@/data/content';

const DEFAULT_LIMIT = 120;

const cleanPath = (url: string) => url.replace('/galeria/', '').split('?')[0];

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);

  const [photo, setPhoto] = useState({ file: null as File | null, num: '', desc: '' });
  const [vid, setVid] = useState({ file: null as File | null, num: '', desc: '' });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [coverDone, setCoverDone] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  const refresh = async () => {
    try {
      const r = await fetch('/api/admin/generate', { method: 'POST' });
      if (!r.ok) throw new Error('api indisponível');
      const j = (await r.json()) as { items?: MediaItem[] };
      setItems(j.items || []);
      setApiOk(true);
    } catch {
      setApiOk(false);
    }
  };

  useEffect(() => {
    if (authed) setTimeout(refresh, 0);
  }, [authed]);

  const photos = items.filter((i) => i.type === 'foto');
  const videos = items.filter((i) => i.type === 'video');
  const photoCount = photos.length;
  const videoCount = videos.length;

  const baseName = (numRaw: string, file: File) => {
    const i = file.name.lastIndexOf('.');
    const ext = i > 0 ? file.name.slice(i + 1) : 'bin';
    const base = slugify(numRaw) || slugify(file.name.slice(0, i > 0 ? i : file.name.length)) || 'midia';
    return `${base}.${ext}`;
  };

  const expandDesc = (label: string, fallback: string) => {
    const t = label.trim();
    if (t && !/^\d+$/.test(t)) return t;
    return fallback;
  };

  const uploadFile = async (folder: 'fotos' | 'videos', file: File, name: string, description: string) => {
    const r = await fetch(`/api/admin/save?path=${folder}/${name}`, { method: 'POST', body: file });
    if (!r.ok) {
      let err = 'falha no upload';
      try {
        const j = (await r.json()) as { error?: string };
        if (j && j.error) err = j.error;
      } catch { /* keep default */ }
      throw new Error(err);
    }
    const dr = await fetch('/api/admin/describe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${folder}/${name}`, description, limit }),
    });
    if (!dr.ok) throw new Error('falha ao salvar descrição');
  };

  const submitPhoto = async () => {
    if (!photo.file) return;
    const file = photo.file;
    setBusy(true);
    setMsg('');
    try {
      await uploadFile('fotos', file, baseName(photo.num, file), expandDesc(photo.num, photo.desc));
      await refresh();
      setPhoto({ file: null, num: '', desc: '' });
      setMsg('Foto enviada!');
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const submitVideo = async () => {
    if (!vid.file) return;
    const file = vid.file;
    setBusy(true);
    setMsg('');
    try {
      const name = baseName(vid.num, file);
      await uploadFile('videos', file, name, expandDesc(vid.num, vid.desc));
      setUploadedName(name);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setCoverDone(false);
      await refresh();
      setVid({ file: null, num: '', desc: '' });
      setMsg('Vídeo enviado! Agora defina a capa ou pule.');
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const applyCover = async () => {
    const v = videoRef.current;
    if (!v) return;
    setBusy(true);
    setMsg('');
    try {
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d')!.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('não foi possível capturar o quadro');
      const base = uploadedName.replace(/\.[^.]+$/, '');
      const r = await fetch(`/api/admin/cover?name=${encodeURIComponent(base)}`, { method: 'POST', body: blob });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error || 'falha ao salvar capa');
      }
      setCoverDone(true);
      await refresh();
      setMsg('Capa definida!');
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const skipCover = async () => {
    setBusy(true);
    setMsg('');
    try {
      const base = uploadedName.replace(/\.[^.]+$/, '');
      await fetch(`/api/admin/clear-cover?name=${encodeURIComponent(base)}`, { method: 'POST' });
      setCoverDone(true);
      await refresh();
      setMsg('Capa automática ativada.');
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (item: MediaItem) => {
    const raw = item.type === 'foto' ? item.src || '' : item.videoUrl || '';
    const path = cleanPath(raw);
    if (!path) return;
    if (!confirm(`Remover "${item.alt}" e sua descrição?`)) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch(`/api/admin/remove?path=${encodeURIComponent(path)}`, { method: 'POST' });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error || 'falha ao remover');
      }
      if (editing?.id === item.id) setEditing(null);
      await refresh();
      setMsg('Removido.');
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    setAuthed(false);
    setPass('');
    setItems([]);
    setEditing(null);
    setCoverDone(false);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  if (!authed) {
    return (
      <div className="adm">
        <style>{`${admCss}`}</style>
        <div className="adm-login">
          <div className="adm-card">
            <h1>Área Admin</h1>
            <p className="adm-hint">Acesso restrito a quem administra o site da DJ Sosô.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAuthed(true);
              }}
              className="adm-row"
            >
              <input className="adm-input" value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Senha" />
              <button className="adm-btn adm-btn--dark">Entrar <Lock size={15} /></button>
            </form>
            <p className="adm-note">Senha ainda não configurada: qualquer texto entra por enquanto.</p>
            <a className="adm-back" href="/"><ArrowLeft size={13} /> voltar ao site</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adm adm--wide">
      <style>{`${admCss}`}</style>

      <header className="adm-top">
        <div>
          <h1 className="adm-title">Painel · DJ SOSÔ</h1>
          <p className="adm-sub">{photoCount} fotos · {videoCount} vídeos</p>
        </div>
        <div className="adm-tools">
          {apiOk === false && <span className="adm-warn">API local indisponível (use o <code>npm run dev</code>)</span>}
          <label className="adm-limit">
            <span>máx.</span>
            <input type="number" min={10} max={500} value={limit} onChange={(e) => setLimit(Number(e.target.value) || DEFAULT_LIMIT)} />
            <span>caracteres</span>
          </label>
          <button className="adm-btn adm-btn--ghost" onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> atualizar</button>
          <button className="adm-btn adm-btn--ghost" onClick={logout} disabled={busy}><LogOut size={14} /> sair</button>
          <a className="adm-back" href="/">ver site <ArrowUpRight size={13} /></a>
        </div>
      </header>

      {msg && (
        <div className="adm-msg">
          <span>{msg}</span>
          <button className="adm-close" onClick={() => setMsg('')} aria-label="Fechar aviso"><X size={13} /></button>
        </div>
      )}

      <section className="adm-grid">
        <div className="adm-card">
          <h2>Enviar foto</h2>
          <label className="adm-drop">
            <input type="file" accept="image/*" onChange={(e) => setPhoto({ ...photo, file: e.target.files?.[0] || null })} />
            <ImageIcon size={22} />
            <span>{photo.file ? photo.file.name : 'Escolher imagem'} <small>{photo.file ? formatSize(photo.file.size) : 'jpg, png, webp, gif'}</small></span>
          </label>
          <input className="adm-input" value={photo.num} onChange={(e) => setPhoto({ ...photo, num: e.target.value })} placeholder="Nº da ordem ou nome (opcional, vira descrição)" inputMode="text" />
          <label className="adm-field">
            <textarea className="adm-textarea" maxLength={limit} value={photo.desc} onChange={(e) => setPhoto({ ...photo, desc: e.target.value })} placeholder="Descrição (opcional)" />
            <span className="adm-count">{photo.desc.length} / {limit}</span>
          </label>
          <button className="adm-btn adm-btn--dark" onClick={() => void submitPhoto()} disabled={busy || !photo.file}>{busy ? 'Enviando…' : 'Enviar foto'} <ArrowUpRight size={14} /></button>
        </div>

        <div className="adm-card">
          <h2>Enviar vídeo</h2>
          <label className="adm-drop">
            <input type="file" accept="video/*" onChange={(e) => setVid({ ...vid, file: e.target.files?.[0] || null })} />
            <Film size={22} />
            <span>{vid.file ? vid.file.name : 'Escolher vídeo'} <small>{vid.file ? formatSize(vid.file.size) : 'mp4, webm, mov, m4v'}</small></span>
          </label>
          <input className="adm-input" value={vid.num} onChange={(e) => setVid({ ...vid, num: e.target.value })} placeholder="Nº da ordem ou nome (opcional, vira descrição)" inputMode="text" />
          <label className="adm-field">
            <textarea className="adm-textarea" maxLength={limit} value={vid.desc} onChange={(e) => setVid({ ...vid, desc: e.target.value })} placeholder="Descrição (opcional)" />
            <span className="adm-count">{vid.desc.length} / {limit}</span>
          </label>
          <button className="adm-btn adm-btn--dark" onClick={() => void submitVideo()} disabled={busy || !vid.file}>{busy ? 'Enviando…' : 'Enviar vídeo'} <ArrowUpRight size={14} /></button>
        </div>
      </section>

      {videoUrl && !coverDone && (
        <section className="adm-card adm-card--full">
          <h2>Escolher a capa do vídeo <em>(arraste na timeline e pare no quadro)</em></h2>
          <video key={videoUrl} ref={videoRef} src={videoUrl} controls playsInline preload="auto" />
          <div className="adm-row">
            <button className="adm-btn adm-btn--green" onClick={() => void applyCover()} disabled={busy}><Check size={14} /> Usar este quadro</button>
            <button className="adm-btn adm-btn--ghost" onClick={() => void skipCover()} disabled={busy}>Pular (capa automática)</button>
          </div>
        </section>
      )}

      <section className="adm-card adm-card--full">
        <h2>Mídia publicada <span className="adm-total">{items.length}</span></h2>
        <div className="adm-list">
          {items.map((i) => (
            <div className="adm-item" key={i.id}>
              <div className="adm-thumb">
                {i.type === 'foto' ? (
                  i.src ? <img src={i.src} alt={i.alt} loading="lazy" /> : <ImageIcon size={16} />
                ) : i.poster ? (
                  <img src={i.poster} alt={i.alt} loading="lazy" />
                ) : (
                  <Film size={16} />
                )}
              </div>
              <div className="adm-item-info">
                <p className="adm-item-name">{i.alt} <span className="adm-tag">{i.type}</span>{i.featured && <span className="adm-tag">destaque</span>}</p>
                <p className="adm-item-sub">{i.subtitle || 'sem descrição'}</p>
              </div>
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(i)} disabled={busy}><Pencil size={14} /> editar</button>
              <button className="adm-btn adm-btn--danger" onClick={() => void removeItem(i)} disabled={busy}><Trash2 size={14} /> remover</button>
            </div>
          ))}
          {items.length === 0 && <p className="adm-empty">Nenhuma mídia ainda. Envie a primeira foto ou vídeo acima.</p>}
        </div>
      </section>

      {editing && (
        <dialog
          open
          className="adm-veil"
          aria-label="Editar mídia"
        >
          <div className="adm-modal">
            <EditPanel
              key={editing.id}
              item={editing}
              limit={limit}
              onClose={() => setEditing(null)}
              onSaved={async () => {
                setEditing(null);
                await refresh();
              }}
              onMsg={setMsg}
            />
          </div>
        </dialog>
      )}
    </div>
  );
}

function EditPanel({ item, limit, onClose, onSaved, onMsg }: {
  item: MediaItem;
  limit: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onMsg: (m: string) => void;
}) {
  const [desc, setDesc] = useState(item.subtitle || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const videoEl = useRef<HTMLVideoElement>(null);

  const path = cleanPath(item.type === 'foto' ? item.src || '' : item.videoUrl || '');
  const base = path.split('/')[1]?.replace(/\.[^.]+$/, '') || '';

  const saveDesc = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, description: desc, limit }),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setErr(j.error || 'falha ao salvar');
        return;
      }
      onMsg('Descrição salva!');
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const captureFrame = async () => {
    const v = videoEl.current;
    if (!v) return;
    setBusy(true);
    setErr('');
    try {
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d')!.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('não foi possível capturar o quadro');
      const r = await fetch(`/api/admin/cover?name=${encodeURIComponent(base)}`, { method: 'POST', body: blob });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error || 'falha ao salvar a capa');
      }
      onMsg('Capa trocada!');
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const autoCover = async () => {
    setBusy(true);
    setErr('');
    try {
      await fetch(`/api/admin/clear-cover?name=${encodeURIComponent(base)}`, { method: 'POST' });
      onMsg('Capa automática ativada.');
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-modal-body">
      <div className="adm-modal-head">
        <h2>Editar <span className="adm-tag">{item.type}</span> · {item.alt}</h2>
        <button className="adm-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
      </div>

      <div className="adm-prev">
        {item.type === 'foto' && item.src ? <img src={item.src} alt={item.alt} /> : item.poster ? <img src={item.poster} alt={item.alt} /> : <Film size={22} />}
      </div>

      {err && <p className="adm-err">{err}</p>}

      <label className="adm-field">
        <textarea className="adm-textarea" maxLength={limit} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`Descrição (máx ${limit} caracteres)`} />
        <span className="adm-count">{desc.length} / {limit}</span>
      </label>

      <div className="adm-row">
        <button className="adm-btn adm-btn--dark" onClick={() => void saveDesc()} disabled={busy}>Salvar descrição <Check size={14} /></button>
      </div>

      {item.type === 'video' && (
        <>
          <h2 className="adm-sub-head">Trocar capa <em>(arraste na timeline e pare no quadro)</em></h2>
          <video key={item.videoUrl} ref={videoEl} src={item.videoUrl} controls playsInline preload="auto" />
          <div className="adm-row">
            <button className="adm-btn adm-btn--green" onClick={() => void captureFrame()} disabled={busy}>Usar este quadro <Check size={14} /></button>
            <button className="adm-btn adm-btn--ghost" onClick={() => void autoCover()} disabled={busy}>Usar capa automática</button>
          </div>
        </>
      )}
    </div>
  );
}

const admCss = `
.adm{min-height:100svh;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#111210;color:#efede7}
.adm--wide{max-width:1000px;margin:0 auto}
.adm-login{min-height:80svh;display:grid;place-items:center}
.adm-login .adm-card{width:min(420px,100%)}
.adm-top{display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;gap:16px;margin-bottom:20px}
.adm-title{font-size:26px;margin:0 0 4px;letter-spacing:-.03em}
.adm-sub{margin:0;color:#aaa9a2;font-size:13px}
.adm-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.adm-limit{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#aaa9a2;background:#1a1b19;border:1px solid rgba(239,237,231,.16);border-radius:999px;padding:7px 12px}
.adm-limit input{width:52px;background:#111210;border:1px solid rgba(239,237,231,.18);color:#efede7;border-radius:8px;padding:5px 8px;font:inherit}
.adm-card{background:#1a1b19;border:1px solid rgba(239,237,231,.14);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px}
.adm-card h2{font-size:15px;margin:0}
.adm-card h2 em{color:#aaa9a2;font-style:normal;font-size:12px}
.adm-card--full{grid-column:1/-1}
.adm-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.adm-input,.adm-textarea{background:#111210;border:1px solid rgba(239,237,231,.18);border-radius:10px;color:#efede7;padding:11px 12px;font:inherit;font-size:13px;width:100%}
.adm-field{position:relative;display:block}
.adm-textarea{min-height:74px;resize:vertical;padding-right:64px}
.adm-count{position:absolute;right:10px;bottom:9px;font-size:10px;color:#aaa9a2;background:#111210;padding:2px 6px;border-radius:6px}
.adm-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%}
.adm-row .adm-input{flex:1}
.adm-btn{border:0;border-radius:999px;padding:11px 18px;font:inherit;font-size:12px;font-weight:700;letter-spacing:.05em;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;transition:opacity .15s}
.adm-btn--dark{background:#efede7;color:#111210}
.adm-btn--ghost{background:transparent;border:1px solid rgba(239,237,231,.3);color:#efede7}
.adm-btn--green{background:#25d366;color:#0b140e}
.adm-btn--danger{background:transparent;border:1px solid rgba(255,80,80,.4);color:#ff8a8a}
.adm-btn:hover{opacity:.85}
.adm-btn:disabled{opacity:.4;cursor:not-allowed}
.adm-drop{display:flex;align-items:center;justify-content:flex-start;gap:12px;border:1px dashed rgba(239,237,231,.3);border-radius:12px;padding:18px;cursor:pointer;font-size:13px;color:#c7a869}
.adm-drop input{display:none}
.adm-drop svg{flex:none}
.adm-drop span{display:flex;flex-direction:column;gap:2px;min-width:0;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.adm-drop small{color:#aaa9a2;font-size:11px}
.adm-msg{background:#18251c;border:1px solid #25d366;color:#baf5cf;border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.adm-close{background:none;border:0;color:inherit;cursor:pointer;display:grid;place-items:center;padding:0}
.adm-warn{color:#ffb26b;font-size:12px}
.adm-warn code{background:rgba(255,178,107,.15);border-radius:4px;padding:1px 5px}
.adm-list{display:flex;flex-direction:column;gap:8px}
.adm-item{display:flex;align-items:center;gap:12px;background:#111210;border:1px solid rgba(239,237,231,.1);border-radius:10px;padding:8px 12px}
.adm-thumb{width:46px;height:46px;border-radius:8px;overflow:hidden;background:#262;display:grid;place-items:center;flex:none}
.adm-thumb img{width:100%;height:100%;object-fit:cover}
.adm-item-info{flex:1;min-width:0}
.adm-item-name{margin:0;font-size:13px;font-weight:700}
.adm-item-sub{margin:2px 0 0;font-size:11px;color:#aaa9a2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adm-tag{font-size:9px;background:rgba(239,237,231,.12);border-radius:4px;padding:2px 6px;margin-left:6px;text-transform:uppercase;font-weight:400}
.adm-total{font-size:11px;color:#aaa9a2;margin-left:6px}
.adm-empty{color:#aaa9a2;font-size:13px;margin:4px 0}
.adm-note{color:#888;font-size:11px;margin:-4px 0 0}
.adm-back{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#aaa9a2;letter-spacing:.04em;border-bottom:1px solid rgba(239,237,231,.25);padding-bottom:3px}
.adm-back:hover{color:#efede7}
.adm-hint{color:#aaa9a2;font-size:13px;margin:0 0 6px}
.adm-veil{position:fixed;inset:0;margin:0;background:rgba(8,9,8,.72);backdrop-filter:blur(4px);z-index:60;display:grid;place-items:center;padding:20px;border:0;width:100vw;height:100svh;max-width:none;max-height:none}
.adm-modal{width:min(640px,100%);max-height:88svh;overflow:auto;background:#1a1b19;border:1px solid rgba(239,237,231,.14);border-radius:16px}
.adm-modal-body{display:flex;flex-direction:column;gap:14px;padding:22px}
.adm-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.adm-modal-head h2{margin:0;font-size:16px}
.adm-sub-head{font-size:14px;margin:4px 0 0}
.adm-prev{height:140px;border-radius:10px;overflow:hidden;background:#111210;display:grid;place-items:center}
.adm-prev img{width:100%;height:100%;object-fit:cover}
.adm-modal video{width:100%;border-radius:10px;background:#000;max-height:48svh}
.adm-err{color:#ff8a8a;font-size:12px;margin:0}
@media(max-width:760px){.adm-grid{grid-template-columns:1fr}.adm-top{align-items:start}.adm-item{flex-wrap:wrap}.adm-item .adm-btn{margin-left:auto}}
`;