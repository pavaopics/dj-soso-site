/* eslint-disable no-html-link-for-pages, next/no-img-element, jsx-a11y/media-has-caption */
'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Film, Image as ImageIcon, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import type { MediaItem } from '@/data/content';
import type { SectionImageConfig, SectionImageKey, SectionImages } from '@/data/section-images';

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

// Runs entirely in the browser; only the smaller result is uploaded.
async function compressPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Para otimizar a foto, escolha um arquivo JPG, PNG ou WebP.');
  }
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  try {
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível iniciar o compressor local.');
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
    if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador não suporta compressão WebP.');
    if (blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: blob.type });
  } finally {
    image.close();
    canvas.width = canvas.height = 0;
  }
}

export function AdminClient() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [removing, setRemoving] = useState<MediaItem | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [removeNotice, setRemoveNotice] = useState('');
  const [sectionRevision, setSectionRevision] = useState(0);

  const [photo, setPhoto] = useState({ file: null as File | null, num: '', desc: '' });
  const [photoResult, setPhotoResult] = useState('');
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
      return true;
    } catch {
      setApiOk(false);
      return false;
    }
  };

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const photos = items.filter((i) => i.type === 'foto');
  const videos = items.filter((i) => i.type === 'video');
  const photoCount = photos.length;
  const videoCount = videos.length;

  const baseName = (numRaw: string, file: File) => {
    const i = file.name.lastIndexOf('.');
    const ext = i > 0 ? file.name.slice(i + 1).toLowerCase() : 'bin';
    const base = slugify(numRaw) || slugify(file.name.slice(0, i > 0 ? i : file.name.length)) || 'midia';
    return `${base}.${ext}`;
  };

  const expandDesc = (label: string, fallback: string) => {
    if (fallback.trim()) return fallback.trim();
    const t = label.trim();
    if (t && !/^\d+$/.test(t)) return t;
    return fallback;
  };

  const uploadFile = async (folder: 'fotos' | 'videos', file: File, name: string, description: string) => {
    const r = await fetch(`/api/admin/save?path=${encodeURIComponent(`${folder}/${name}`)}`, { method: 'POST', body: file });
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
    setMsg('Otimizando a foto localmente…');
    setPhotoResult('');
    try {
      const optimized = await compressPhoto(file);
      setMsg('Salvando a foto otimizada…');
      await uploadFile('fotos', optimized, baseName(photo.num, optimized), expandDesc(photo.num, photo.desc));
      await refresh();
      setPhoto({ file: null, num: '', desc: '' });
      const saved = Math.round((1 - optimized.size / file.size) * 100);
      setPhotoResult(`${formatSize(file.size)} → ${formatSize(optimized.size)} (${saved}% menor). Salva em public/galeria/fotos/${baseName(photo.num, optimized)}${optimized === file ? ' — o original já era menor e foi mantido.' : '.'}`);
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
      setVideoUrl(URL.createObjectURL(file));
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
    setBusy(true);
    setRemoveError('');
    setRemoveNotice('');
    try {
      const r = await fetch(`/api/admin/remove?path=${encodeURIComponent(path)}`, { method: 'POST' });
      const data = (await r.json()) as { error?: string; preservedSections?: string[] };
      if (!r.ok) throw new Error(data.error || 'falha ao remover');
      if (editing?.id === item.id) setEditing(null);
      setItems(current => current.filter(media => cleanPath(media.src || media.videoUrl || '') !== path));
      setRemoving(null);
      if (data.preservedSections?.length) setSectionRevision(current => current + 1);
      const refreshed = await refresh();
      setRemoveNotice(`"${item.alt}" removido da galeria.${data.preservedSections?.length ? ` Uma cópia continua nas seções: ${data.preservedSections.join(', ')}.` : ''}${refreshed ? '' : ' Não foi possível atualizar o índice do site; clique em atualizar para tentar novamente.'}`);
    } catch (e) {
      setRemoveError(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm adm--wide">
      <style>{`${admCss}`}</style>

      <header className="adm-top">
        <div>
          <h1 className="adm-title">Painel · DJ SOSÔ</h1>
          <p className="adm-sub">{photoCount} fotos · {videoCount} vídeos · Painel local de desenvolvimento. As alterações precisam ser validadas, versionadas e publicadas.</p>
        </div>
        <div className="adm-tools">
          {apiOk === false && <span className="adm-warn">API local indisponível (use o <code>npm run dev</code>)</span>}
          <label className="adm-limit">
            <span>máx.</span>
            <input type="number" min={10} max={500} value={limit} onChange={(e) => setLimit(Number(e.target.value) || DEFAULT_LIMIT)} />
            <span>caracteres</span>
          </label>
          <button className="adm-btn adm-btn--ghost" onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> atualizar</button>
          <a className="adm-back" href="/">ver site <ArrowUpRight size={13} /></a>
        </div>
      </header>

      {msg && (
        <output className="adm-msg">
          <span>{msg}</span>
          <button className="adm-close" onClick={() => setMsg('')} aria-label="Fechar aviso"><X size={13} /></button>
        </output>
      )}

      <nav className="adm-tabs" aria-label="Seções do painel">
        <a className="adm-btn adm-btn--ghost" href="#enviar">Enviar fotos e vídeos</a>
        <a className="adm-btn adm-btn--ghost" href="#imagens-secoes">Imagens das seções</a>
        <a className="adm-btn adm-btn--ghost" href="#midia-publicada">Mídia e descrições</a>
      </nav>

      <section className="adm-grid" id="enviar">
        <div className="adm-card">
          <h2>Enviar foto</h2>
          <label className="adm-drop">
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => setPhoto({ ...photo, file: e.target.files?.[0] || null })} />
            <ImageIcon size={22} />
            <span>{photo.file ? photo.file.name : 'Escolher imagem'} <small>{photo.file ? formatSize(photo.file.size) : 'jpg, png, webp'}</small></span>
          </label>
          <input className="adm-input" value={photo.num} onChange={(e) => setPhoto({ ...photo, num: e.target.value })} placeholder="Nº da ordem ou nome do arquivo (opcional)" inputMode="text" />
          <label className="adm-field">
            <textarea className="adm-textarea" maxLength={limit} value={photo.desc} onChange={(e) => setPhoto({ ...photo, desc: e.target.value })} placeholder="Descrição (opcional)" />
            <span className="adm-count">{photo.desc.length} / {limit}</span>
          </label>
          <p className="adm-note">Compressão local automática em WebP de alta qualidade (92%), mantendo resolução e transparência. Há recompressão com perdas, priorizando a qualidade visual. Se o resultado ficar maior, mantemos o original.</p>
          <button className="adm-btn adm-btn--dark" onClick={() => void submitPhoto()} disabled={busy || !photo.file}>{busy ? 'Processando…' : 'Otimizar e enviar foto'} <ArrowUpRight size={14} /></button>
          {photoResult && <output className="adm-note">{photoResult}</output>}
        </div>

        <div className="adm-card">
          <h2>Enviar vídeo</h2>
          <label className="adm-drop">
            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.m4v" disabled={busy} onChange={(e) => setVid({ ...vid, file: e.target.files?.[0] || null })} />
            <Film size={22} />
            <span>{vid.file ? vid.file.name : 'Escolher vídeo'} <small>{vid.file ? formatSize(vid.file.size) : 'mp4, webm, mov, m4v'}</small></span>
          </label>
          <input className="adm-input" value={vid.num} onChange={(e) => setVid({ ...vid, num: e.target.value })} placeholder="Nº da ordem ou nome do arquivo (opcional)" inputMode="text" />
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

      <SectionImagesPanel photos={photos} revision={sectionRevision} />

      <section className="adm-card adm-card--full" id="midia-publicada">
        <h2>Mídia publicada <span className="adm-total">{items.length}</span></h2>
        {removeNotice && <output className="adm-msg">{removeNotice}</output>}
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
              <button className="adm-btn adm-btn--danger" onClick={() => { setRemoving(i); setRemoveError(''); setRemoveNotice(''); }} disabled={busy}><Trash2 size={14} /> remover</button>
              {removing?.id === i.id && <div className="adm-remove-confirm">
                <p>Remover &ldquo;{i.alt}&rdquo; da galeria e apagar sua descrição?</p>
                {i.type === 'foto' && <p className="adm-note">Se esta foto estiver em uma seção, uma cópia será mantida nela.</p>}
                <div className="adm-row">
                  <button className="adm-btn adm-btn--danger" onClick={() => void removeItem(i)} disabled={busy}>{busy ? 'Removendo…' : 'Confirmar remoção'}</button>
                  <button className="adm-btn adm-btn--ghost" onClick={() => { setRemoving(null); setRemoveError(''); }} disabled={busy}>Cancelar</button>
                </div>
                {removeError && <p className="adm-err" role="alert">{removeError}</p>}
              </div>}
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

function SectionImagesPanel({ photos, revision }: { photos: MediaItem[]; revision: number }) {
  const [images, setImages] = useState<SectionImages | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/sections', { cache: 'no-store' });
      if (!response.ok) throw new Error('Para editar as seções, abra o site local com npm run dev.');
      const data = await response.json() as { images: SectionImages };
      setImages(data.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [revision]);

  return <section className="adm-sections" id="imagens-secoes">
    <h2>Imagens das seções</h2>
    <p className="adm-hint">Troque cada foto por uma nova imagem otimizada ou escolha uma da galeria. Edite a descrição e o enquadramento, depois salve a seção.</p>
    <p className="adm-note">Os arquivos e as escolhas ficam salvos neste projeto local. As imagens do press kit online são editáveis aqui; o PDF já gerado precisa ser exportado novamente após alterações.</p>
    {error && <p className="adm-err" role="alert">{error} <button className="adm-btn adm-btn--ghost" onClick={() => void load()}>Tentar novamente</button></p>}
    {!images && !error && <output>Carregando imagens…</output>}
    <div className="adm-grid">
      {images && (Object.entries(images) as [SectionImageKey, SectionImageConfig][]).map(([id, image]) => <SectionImageEditor key={id} id={id} image={image} photos={photos} onSaved={updated => setImages(previous => previous ? { ...previous, [id]: updated } : previous)} />)}
    </div>
  </section>;
}

function SectionImageEditor({ id, image, photos, onSaved }: {
  id: SectionImageKey;
  image: SectionImageConfig;
  photos: MediaItem[];
  onSaved: (image: SectionImageConfig) => void;
}) {
  const [sourceOverride, setSrc] = useState<string | null>(null);
  const src = sourceOverride ?? image.src;
  const [alt, setAlt] = useState(image.alt);
  const [position, setPosition] = useState(image.position);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const save = async () => {
    setBusy(true);
    setError('');
    setStatus(file ? 'Otimizando a foto localmente…' : 'Salvando…');
    try {
      let source = src;
      let result = '';
      if (file) {
        const optimized = await compressPhoto(file);
        const extension = optimized.name.split('.').pop()?.toLowerCase() || 'webp';
        const name = `${id.toLowerCase()}-${crypto.randomUUID()}.${extension}`;
        const upload = await fetch(`/api/admin/save?path=${encodeURIComponent(`secoes/${name}`)}`, { method: 'POST', body: optimized });
        const data = await upload.json() as { error?: string };
        if (!upload.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
        source = `/galeria/secoes/${name}`;
        result = ` ${formatSize(file.size)} → ${formatSize(optimized.size)}.`;
        setSrc(source);
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
      }
      const response = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, src: source, alt, position }),
      });
      const data = await response.json() as { error?: string; images: SectionImages };
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a seção.');
      onSaved(data.images[id]);
      setSrc(null);
      setStatus(`Seção salva!${result}`);
    } catch (e) {
      setStatus('');
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return <article className="adm-card adm-section-image" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{image.label}</h3>
    <div className="adm-section-preview"><img src={file && preview ? preview : src} alt={alt || image.label} style={{ objectPosition: position }} loading="lazy" /></div>
    <label className="adm-drop">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
        const selected = event.target.files?.[0];
        if (selected) { setFile(selected); setPreview(URL.createObjectURL(selected)); setAlt(''); setStatus(''); setError(''); }
      }} />
      <ImageIcon size={20} /><span>{file ? file.name : 'Enviar nova foto'}<small>JPG, PNG ou WebP · compressão automática</small></span>
    </label>
    <label className="adm-field" htmlFor={`${id}-gallery`}>Ou escolher da galeria</label>
    <select id={`${id}-gallery`} className="adm-input" disabled={busy} value={file ? '' : src} onChange={event => {
      const value = event.target.value;
      if (!value) return;
      setSrc(value); setFile(null); setStatus(''); setError('');
      if (fileInput.current) fileInput.current.value = '';
      const selected = photos.find(photo => photo.src === value);
      setAlt(selected?.subtitle || selected?.alt || image.alt);
    }}>
      {file && <option value="">Nova foto selecionada</option>}
      {!photos.some(photo => photo.src === src) && <option value={src}>Imagem atual / selecionada</option>}
      {photos.filter(photo => photo.src).map(photo => <option key={photo.src} value={photo.src}>{photo.subtitle || photo.alt}</option>)}
    </select>
    <label className="adm-field" htmlFor={`${id}-description`}>Descrição da imagem (acessibilidade)</label>
    <textarea id={`${id}-description`} className="adm-textarea" maxLength={500} value={alt} disabled={busy} onChange={event => setAlt(event.target.value)} placeholder="Descreva a foto desta seção" />
    <label className="adm-field" htmlFor={`${id}-position`}>Enquadramento</label>
    <select id={`${id}-position`} className="adm-input" value={position} disabled={busy} onChange={event => setPosition(event.target.value)}>
      <option value="50% 0%">Priorizar o topo</option>
      <option value="50% 25%">Topo intermediário</option>
      <option value="50% 35%">Centro superior</option>
      <option value="50% 50%">Centralizar</option>
      <option value="50% 100%">Priorizar a parte de baixo</option>
    </select>
    <button className="adm-btn adm-btn--dark" onClick={() => void save()} disabled={busy || !alt.trim()}>{busy ? 'Salvando…' : 'Salvar seção'} <Check size={14} /></button>
    {status && <output className="adm-note" aria-live="polite">{status}</output>}
    {error && <p className="adm-err" role="alert">{error}</p>}
  </article>;
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
.adm *{box-sizing:border-box}
.adm-tabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px}
.adm-sections{margin-block:32px;scroll-margin-top:24px}
.adm-sections>h2{font-size:22px;margin:0 0 12px}
.adm-sections>.adm-note{display:block;margin-bottom:20px}
.adm-section-image{min-width:0}
.adm-section-image h3{margin:0;font-size:15px}
.adm-section-image .adm-field{font-size:12px;color:#aaa9a2}
.adm-section-preview{aspect-ratio:4/3;background:#111210;border-radius:10px;overflow:hidden}
.adm-section-preview img{display:block;width:100%;height:100%;object-fit:cover}
.adm-section-image .adm-drop{min-width:0}
.adm-section-image output{color:#baf5cf}
.adm-section-image .adm-btn{white-space:normal}
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
.adm-item{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:#111210;border:1px solid rgba(239,237,231,.1);border-radius:10px;padding:8px 12px}
.adm-remove-confirm{flex-basis:100%;display:flex;flex-direction:column;gap:12px;padding:12px 0;border-top:1px solid #ffffff20;font-size:13px}
.adm-remove-confirm p{margin:0}
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
