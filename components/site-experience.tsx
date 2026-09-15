'use client';
/* eslint-disable next/no-img-element, next/no-html-link-for-pages, jsx-a11y/media-has-caption */
// Local WebP assets and music-performance clips use native media controls.
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Download, Megaphone, Menu, MessageCircle, Music2, PartyPopper, Sparkles, Sunset, X } from 'lucide-react';
import type { MediaItem } from '@/data/content';
import type { SiteConfig } from '@/data/site';
import type { SectionImages } from '@/data/section-images';
import { biography, faq, formats, photoLabels, presentationCopy, whatsappLink } from '@/data/presentation';
import { track } from '@/lib/analytics';
import { SectionImage } from '@/components/section-image';

type Props = { site: SiteConfig; gallery: MediaItem[]; sectionImages: SectionImages };
const formatIcons = { lounge: Sunset, events: PartyPopper, brandFormat: Megaphone };

function Brand() {
  return <a className="sx-brand" href="#top" aria-label="DJ Sosô, início"><span>DJ</span> SOSÔ<span className="sx-brand-dot">●</span></a>;
}

function ContactLink({ site, label = 'Consultar disponibilidade', topic, source, light = false }: { site: SiteConfig; label?: string; topic?: string; source: string; light?: boolean }) {
  return <a className={`sx-button ${light ? 'sx-button-light' : ''}`} href={whatsappLink(site.contact.whatsapp, topic)} onClick={() => track('whatsapp_clicked', { source })}><MessageCircle size={17} />{label}<ArrowUpRight size={17} /></a>;
}

function KitLink({ compact = false }: { compact?: boolean }) {
  return <a className={compact ? 'sx-inline-link' : 'sx-button sx-button-outline'} href="/presskit-soso.pdf" download onClick={() => track('presskit_downloaded')}><Download size={17} />Baixar press kit{!compact && <span>PDF</span>}</a>;
}

function VideoCard({ item, index, managed = false, active = false }: { item: MediaItem; index: number; managed?: boolean; active?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || managed) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) video.pause();
    }, { rootMargin: '120px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, [managed]);
  const title = item.title && !/^\d+$/.test(item.title) ? item.title : `Sosô na controladora · ${String(index).padStart(2, '0')}`;
  const caption = item.subtitle === title ? '' : item.subtitle || (item.id === 'intro' ? 'Um primeiro encontro com a sua música.' : 'Dê o play e conheça seu jeito de tocar.');
  return <article className={`sx-video-card ${item.id === 'intro' ? 'sx-video-featured' : ''}${active ? ' is-active' : ''}`} aria-current={active ? 'true' : undefined}>
    <div className="sx-video-frame">
      <video ref={ref} src={item.videoUrl} poster={item.poster} preload="metadata" controls playsInline aria-label={title}
        onPlay={event => { if (!managed) document.querySelectorAll('video').forEach(video => { if (video !== event.currentTarget) video.pause(); }); track('video_played', { id: item.id }); }}
        onEnded={() => track('video_completed', { id: item.id })} />
      <span className="sx-video-badge">{item.id === 'intro' ? 'RESUMO · 35 SEGUNDOS' : `TAKE ${String(index).padStart(2, '0')}`}</span>
    </div>
    <h3>{title}</h3>{caption && <p>{caption}</p>}
  </article>;
}

function Videos({ items }: { items: MediaItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const moveRef = useRef<(direction: number) => void>(() => {});
  const [playback, setPlayback] = useState({ index: 0, enabled: false, message: '' });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const videos = Array.from(el.querySelectorAll('video'));
    const cards = Array.from(el.children) as HTMLElement[];
    let index = 0;
    let enabled = false;
    let visible = false;
    let disposed = false;
    let requestedScroll: number | null = null;
    let scrollTimer: ReturnType<typeof setTimeout>;
    const expectedPauses = new WeakMap<HTMLVideoElement, number>();
    const requestedPlays = new WeakSet<HTMLVideoElement>();

    const sync = (message = '') => setPlayback({ index, enabled, message });
    const pause = (video: HTMLVideoElement) => {
      if (video.paused) return;
      expectedPauses.set(video, (expectedPauses.get(video) || 0) + 1);
      video.pause();
    };
    const pauseAll = () => videos.forEach(pause);
    const stop = (message = '') => { enabled = false; pauseAll(); sync(message); };
    const playCurrent = () => {
      const video = videos[index];
      if (!video || !enabled || !visible || document.hidden || !video.paused) return;
      requestedPlays.add(video);
      void video.play().catch(error => {
        requestedPlays.delete(video);
        if (!disposed && enabled && videos[index] === video && error.name !== 'AbortError') stop('Toque no play para continuar.');
      });
    };
    const select = (next: number) => {
      if (next === index || !videos[next]) return;
      index = next;
      videos.forEach((video, position) => { if (position !== index) pause(video); });
      sync();
      playCurrent();
    };
    const positionOf = (position: number) => Math.min(el.scrollWidth - el.clientWidth, cards[position].offsetLeft - cards[0].offsetLeft);
    moveRef.current = direction => {
      clearTimeout(scrollTimer);
      const next = Math.max(0, Math.min(videos.length - 1, index + direction));
      if (!videos[next]) return;
      select(next);
      const left = positionOf(next);
      requestedScroll = left;
      el.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };

    const onPlay = (event: Event) => {
      const video = event.target as HTMLVideoElement;
      const next = videos.indexOf(video);
      if (next < 0) return;
      if (requestedPlays.has(video)) {
        requestedPlays.delete(video);
        if (!enabled || next !== index) { pause(video); return; }
      } else {
        index = next;
        enabled = true;
      }
      videos.forEach(other => { if (other !== video) pause(other); });
      document.querySelectorAll('video').forEach(other => { if (!el.contains(other)) other.pause(); });
      sync();
    };
    const onPause = (event: Event) => {
      const video = event.target as HTMLVideoElement;
      const expected = expectedPauses.get(video) || 0;
      if (expected) { expectedPauses.set(video, expected - 1); return; }
      if (video.ended) return;
      // Only a user's pause cancels the queue; switching cards pauses internally.
      if (videos[index] === video) stop();
    };
    const onOutsidePlay = (event: Event) => { if (event.target instanceof HTMLVideoElement && !el.contains(event.target)) stop(); };
    const onScroll = () => {
      // Several desktop cards share the final scroll position. Keep the arrow's
      // selected card until a real gesture takes over, including late snap events.
      if (requestedScroll !== null) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const max = el.scrollWidth - el.clientWidth;
        if (max < 2) return;
        if (el.scrollLeft >= max - 2) { select(videos.length - 1); return; }
        const nearest = cards.reduce((best, card, candidate) => Math.abs(card.offsetLeft - cards[0].offsetLeft - el.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - el.scrollLeft) ? candidate : best, 0);
        select(nearest);
      }, 100);
    };
    const interruptScroll = () => { requestedScroll = null; clearTimeout(scrollTimer); };
    const onVisibility = () => { if (document.hidden) pauseAll(); else playCurrent(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) playCurrent(); else pauseAll();
    }, { rootMargin: '120px' });
    observer.observe(el);
    el.addEventListener('play', onPlay, true);
    el.addEventListener('pause', onPause, true);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerdown', interruptScroll, { passive: true });
    el.addEventListener('wheel', interruptScroll, { passive: true });
    el.addEventListener('keydown', interruptScroll);
    document.addEventListener('play', onOutsidePlay, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      clearTimeout(scrollTimer);
      observer.disconnect();
      el.removeEventListener('play', onPlay, true);
      el.removeEventListener('pause', onPause, true);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown', interruptScroll);
      el.removeEventListener('wheel', interruptScroll);
      el.removeEventListener('keydown', interruptScroll);
      document.removeEventListener('play', onOutsidePlay, true);
      document.removeEventListener('visibilitychange', onVisibility);
      pauseAll();
    };
  }, [items.length]);
  return <>
    <div className="sx-video-track" ref={ref}>{items.map((item, index) => <VideoCard key={item.id} item={item} index={index + 1} managed active={playback.index === index} />)}</div>
    <div className="sx-carousel-controls"><span aria-live="polite">{items.length ? `${playback.index + 1} / ${items.length} · ` : ''}{playback.message || (playback.enabled ? 'Play ao navegar' : 'Pausado · dê o play para começar')}</span><div><button onClick={() => moveRef.current(-1)} disabled={playback.index === 0 || !items.length} aria-label="Vídeos anteriores"><ArrowLeft /></button><button onClick={() => moveRef.current(1)} disabled={playback.index >= items.length - 1} aria-label="Próximos vídeos"><ArrowRight /></button></div></div>
  </>;
}

function Lightbox({ items, index, onChange, onClose }: { items: MediaItem[]; index: number; onChange: (index: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const start = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const move = (step: number) => onChange((index + step + items.length) % items.length);
  const item = items[index];
  return <dialog ref={ref} className="sx-lightbox" aria-label="Galeria de fotos" onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } }}>
    <button className="sx-lb-close" onClick={onClose} aria-label="Fechar galeria"><X /></button>
    <button className="sx-lb-prev" onClick={() => move(-1)} disabled={items.length < 2} aria-label="Imagem anterior"><ArrowLeft /></button>
    <div className="sx-lb-media" onTouchStart={e => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - start.current.x; const dy = e.changedTouches[0].clientY - start.current.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1); }}>
      <img src={item.src} alt={item.alt} draggable={false} />
    </div>
    <output className="sx-lb-count" aria-live="polite">{index + 1} / {items.length}</output>
    <button className="sx-lb-next" onClick={() => move(1)} disabled={items.length < 2} aria-label="Próxima imagem"><ArrowRight /></button>
  </dialog>;
}

function MobileMenu({ site, close }: { site: SiteConfig; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el?.showModal(); document.body.style.overflow = 'hidden';
    return () => { el?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="sx-menu" onCancel={e => { e.preventDefault(); close(); }} aria-label="Menu principal"><button onClick={close} aria-label="Fechar menu"><X /></button><nav>{site.navigation.map((link, index) => <a href={link.href} onClick={close} key={link.href}><small>0{index + 1}</small>{link.label}<ArrowUpRight /></a>)}</nav><p>DJ SOSÔ · SÃO PAULO, BRASIL</p></dialog>;
}

export function SiteExperience({ site, gallery, sectionImages }: Props) {
  const [menu, setMenu] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [visiblePhotos, setVisiblePhotos] = useState(4);
  const [fab, setFab] = useState(false);
  useEffect(() => {
    const update = () => setFab(window.scrollY > 500 && (document.getElementById('contact')?.getBoundingClientRect().top ?? Infinity) > window.innerHeight * .6);
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  const order = ['foto-2', 'foto-4', 'foto-1', 'foto-6'];
  const intro: MediaItem = { id: 'intro', type: 'video', videoUrl: '/media/soso-apresentacao.mp4?v=audio-normalizado-1', poster: sectionImages.hero.src, title: 'O melhor da Sosô em 35 segundos', subtitle: 'Cinco momentos, uma personalidade só.', alt: 'Seleção de momentos da DJ Sosô tocando', aspectRatio: '9/16' };
  const photos = gallery.filter(item => item.type === 'foto').map(item => {
    const fileNumber = item.src?.match(/\/(\d+)\.[^/?]+(?:\?|$)/)?.[1];
    const labelKey = fileNumber ? `foto-${fileNumber}` : item.id;
    return { ...item, alt: /^\d+$/.test(item.alt) ? photoLabels[labelKey] || 'DJ Sosô — galeria' : item.alt };
  }).sort((a, b) => {
    const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
    return rank(a.id) - rank(b.id);
  });
  const videos = gallery.filter(item => item.type === 'video').map(item => !item.poster && /^video-[1-5]$/.test(item.id) && /^\d+$/.test(item.title || '') ? { ...item, poster: `/media/${item.id}.jpg` } : item);
  const openPhoto = (index: number) => { setLightbox(index); track('gallery_opened', { id: photos[index].id }); };
  return <div className="showcase" id="top">
    <a className="sx-skip" href="#conteudo">Ir para o conteúdo</a>
    <header className="sx-header"><Brand /><nav aria-label="Navegação principal">{site.navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav><a className="sx-header-book" href="#contact">Vamos conversar <ArrowUpRight size={15} /></a><button className="sx-menu-button" onClick={() => setMenu(true)} aria-label="Abrir menu"><Menu /></button></header>
    {menu && <MobileMenu site={site} close={() => setMenu(false)} />}
    <main id="conteudo">
      <section className="sx-hero sx-hero--portrait-first sx-shell">
        <div className="sx-hero-portrait"><SectionImage imageKey="hero" images={sectionImages} width="1024" height="1536" fetchPriority="high" /></div>
        <div className="sx-hero-copy"><p className="sx-eyebrow"><span className="sx-live-dot" />SÃO PAULO, BRASIL · DJ & CRIADORA</p><p className="sx-hero-lead">9 anos. Personalidade de sobra.<br /><strong>Música para conectar pessoas.</strong></p><p className="sx-intro">{presentationCopy.intro}</p><div className="sx-actions"><ContactLink site={site} source="hero" /><a className="sx-inline-link" href="#resumo" onClick={() => track('hero_watch_clicked')}>Ver o resumo da Sosô <ArrowDown size={17} /></a></div><div className="sx-hero-foot"><span>LOUNGE / SUNSET / EVENTOS / MARCAS</span><KitLink compact /></div></div>
      </section>
      <section className="sx-summary sx-chapter sx-chapter--summary" id="resumo" aria-labelledby="resumo-title">
        <div className="sx-section sx-shell sx-summary-layout">
          <div className="sx-summary-copy">
            <p className="sx-eyebrow">COMECE AQUI / VÍDEO RESUMO</p>
            <h2 id="resumo-title">O melhor da Sosô.<br /><em>Em um só play.</em></h2>
            <p className="sx-summary-lead">35 segundos para sentir a sua energia.</p>
            <p>Cinco momentos na controladora para conhecer a música e a presença da Sosô.</p>
            <a className="sx-inline-link" href="#videos">Explore a galeria de vídeos <ArrowDown size={17} /></a>
          </div>
          <VideoCard item={intro} index={0} />
        </div>
      </section>
      <section className="sx-chapter sx-chapter--videos" id="videos" aria-labelledby="videos-title">
        <div className="sx-section sx-shell"><div className="sx-section-head"><div><p className="sx-eyebrow">01 / GALERIA DE VÍDEOS</p><h2 id="videos-title">Mais música.<br /><em>Mais momentos.</em></h2></div><p>Explore os vídeos da Sosô tocando.<br />Escolha um momento e dê o play.</p></div><Videos items={videos} /></div>
      </section>
      <section className="sx-events sx-chapter sx-chapter--events" id="eventos" aria-labelledby="eventos-title">
        <div className="sx-shell sx-section">
          <div className="sx-section-head"><div><p className="sx-eyebrow">02 / FORMATOS DE CONTRATAÇÃO</p><h2 id="eventos-title">Qual é a sua<br /><em>ocasião?</em></h2></div><p>Três formatos, cada um com seu clima.<br />Encontre o que combina com a sua ideia.</p></div>
          <div className="sx-format-grid">{formats.map((format, index) => {
            const Icon = formatIcons[format.imageSlot];
            return <article className="sx-format" data-format={format.imageSlot} key={format.name}>
              <div className="sx-format-image"><SectionImage imageKey={format.imageSlot} images={sectionImages} loading="lazy" /><span>0{index + 1}</span></div>
              <p className="sx-eyebrow"><Icon size={18} aria-hidden="true" />{format.tag}</p>
              <h3>{format.name}</h3><p>{format.text}</p><small>{format.places}</small>
              <a className="sx-format-cta" href={whatsappLink(site.contact.whatsapp, format.topic)} onClick={() => track('whatsapp_clicked', { source: format.name })}>{index === 2 ? 'Propor uma parceria' : `Consultar ${format.name}`} <ArrowUpRight size={17} /></a>
            </article>;
          })}</div>
          <div className="sx-repertoire"><span>NO REPERTÓRIO</span><ul>{site.repertoire.map(style => <li key={style}>{style}</li>)}</ul></div>
        </div>
      </section>
      <section className="sx-chapter sx-chapter--about" id="about" aria-labelledby="about-title">
        <div className="sx-section sx-shell">
          <div className="sx-section-head"><div><p className="sx-eyebrow">03 / CONHEÇA A SOFIA</p><h2 id="about-title">Pequena na idade.<br /><em>Grande na curiosidade.</em></h2></div></div>
          <div className="sx-about"><div className="sx-about-image"><SectionImage imageKey="about" images={sectionImages} width="1024" height="1536" loading="lazy" /><span className="sx-photo-label">CURIOSA POR NATUREZA ✳</span></div><div><p className="sx-body-lead">{biography}</p><p>{presentationCopy.aboutStory}</p><p>{presentationCopy.aboutEnergy}</p><div className="sx-about-note"><Music2 /><span>Uma história em construção.<br /><strong>Um ritmo que já é só dela.</strong></span></div><a className="sx-inline-link" href={site.social.instagram} onClick={() => track('instagram_clicked')}>Acompanhe a Sosô no Instagram <ArrowUpRight size={17} /></a></div></div>
        </div>
      </section>
      <section className="sx-chapter sx-chapter--gallery" id="gallery" aria-labelledby="gallery-title">
        <div className="sx-section sx-shell"><div className="sx-section-head"><div><p className="sx-eyebrow">04 / GALERIA DE FOTOS</p><h2 id="gallery-title">Além do <em>play.</em></h2></div><p>Retratos, música e personalidade.<br />Toque em uma foto para ver de perto.</p></div><div className="sx-photo-grid" id="photos-grid">{photos.slice(0, visiblePhotos).map((photo, index) => <button key={photo.id} className="sx-photo" onClick={() => openPhoto(index)} aria-label={`Ampliar: ${photo.alt}`}><img src={photo.src} alt={photo.alt} loading="lazy" /><span>{String(index + 1).padStart(2, '0')}<ArrowUpRight size={20} /></span></button>)}</div>{visiblePhotos < photos.length && <button className="sx-button sx-button-outline sx-more" aria-controls="photos-grid" onClick={() => { setVisiblePhotos(count => Math.min(count + 4, photos.length)); track('gallery_more_clicked'); }}>Mostrar mais fotos <ArrowDown size={17} /></button>}</div>
      </section>
      <section className="sx-brands sx-chapter sx-chapter--brands" id="marcas" aria-labelledby="marcas-title"><div className="sx-shell sx-section sx-brand-layout"><div><p className="sx-eyebrow">05 / PROJETOS & PARCERIAS</p><h2 id="marcas-title">DJ SOSÔ<br /><em>+ sua marca.</em></h2><p className="sx-body-lead">Música e conteúdo<br />com a personalidade da Sosô.</p><p>{presentationCopy.partnership}</p><ul className="sx-brand-services"><li><Sparkles size={18} />Conteúdo para redes e campanhas</li><li><Music2 size={18} />Apresentações em ativações de marca</li><li><ArrowUpRight size={18} />Projetos e experiências personalizados</li></ul><ContactLink site={site} source="brands" label="Propor uma parceria" topic="um projeto com minha marca" /><p className="sx-fine">{presentationCopy.partnershipBrief}</p></div><div className="sx-brand-art"><SectionImage imageKey="brands" images={sectionImages} loading="lazy" /><span>MÚSICA.<br />IDEIAS.<br />CONEXÕES.</span></div></div></section>
      <section className="sx-chapter sx-chapter--equipment" id="equipamentos" aria-labelledby="equipamentos-title">
        <div className="sx-section sx-shell">
          <div className="sx-section-head"><div><p className="sx-eyebrow">06 / ESTRUTURA & SERVIÇOS</p><h2 id="equipamentos-title">O som.<br />E tudo <em>ao redor.</em></h2></div><p>Apresentação, equipamentos e registro.<br />Nossa equipe ajuda a planejar a estrutura do seu evento.</p></div>
          <div className="sx-setup-grid"><article><span>01</span><h3>DJ & Performance</h3><p>Sets com a Sosô, com duração e repertório definidos para a ocasião.</p></article><article><span>02</span><h3>Áudio & Equipamentos</h3><p>Locação avulsa ou junto da apresentação. Nossa equipe avalia a estrutura necessária para o espaço.</p></article><article><span>03</span><h3>Foto & Vídeo</h3><p>Registro do show ou do evento, como serviço adicional. Pacotes de 4h, 8h ou mais, a combinar.</p></article></div>
          <details className="sx-details"><summary>Equipamentos disponíveis <span>Ver detalhes técnicos +</span></summary><div className="sx-tech"><div><h3>Áudio & Performance</h3><ul>{site.gear.audio.map(item => <li key={item}>{item}</li>)}</ul></div><div><h3>Captura</h3><ul>{site.gear.capture.map(item => <li key={item}>{item}</li>)}</ul></div></div></details>
          <div className="sx-setup-bottom"><p>Já tem som no local? Nossa equipe avalia a estrutura com você.</p><ContactLink site={site} source="equipment" label="Conversar sobre a estrutura" topic="a estrutura para meu evento" /></div>
        </div>
      </section>
      <section className="sx-contact sx-chapter sx-chapter--contact" id="contact" aria-labelledby="contact-title"><div className="sx-shell sx-section"><p className="sx-eyebrow">07 / VAMOS CONVERSAR</p><div className="sx-contact-layout"><div><h2 id="contact-title">Seu próximo evento.<br /><em>Um novo ritmo.</em></h2><p>{presentationCopy.contact}</p><ContactLink site={site} source="contact" light /><div className="sx-manager"><span>FALE COM NOSSA EQUIPE</span><strong>{site.contact.manager}</strong><a href={`mailto:${site.contact.email}`}>{site.contact.email} <ArrowUpRight size={15} /></a><small>{site.contact.role} · {site.location}</small></div></div><aside className="sx-kit"><Download size={28} /><p className="sx-eyebrow">PARA LEVAR COM VOCÊ</p><h3>Tudo sobre a Sosô.<br />Em um só lugar.</h3><p>Apresentação, formatos, repertório e contato. Um material para compartilhar com sua equipe.</p><KitLink /><a className="sx-inline-link" href="/presskit">Ver versão online <ArrowUpRight size={16} /></a></aside></div><div className="sx-faq"><h3>Dúvidas antes de contratar?</h3><p>Veja como nossa equipe organiza apresentações e parcerias.</p>{faq.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></div></section>
    </main>
    <footer className="sx-footer sx-shell"><Brand /><p>Música para conectar pessoas.<br /><small>© {new Date().getFullYear()} DJ SOSÔ · São Paulo, Brasil</small></p><div><a href={site.social.instagram} onClick={() => track('instagram_clicked')}>Instagram <ArrowUpRight size={15} /></a><a href={site.social.tiktok} onClick={() => track('tiktok_clicked')}>TikTok <ArrowUpRight size={15} /></a><a href="/admin" className="sx-admin-link">Área da equipe</a></div></footer>
    {fab && !menu && lightbox === null && <a className="sx-fab" href={whatsappLink(site.contact.whatsapp)} onClick={() => track('whatsapp_fab_clicked')} aria-label="Conversar com nossa equipe no WhatsApp"><MessageCircle size={21} /><span>Vamos conversar</span></a>}
    {lightbox !== null && photos.length > 0 && <Lightbox items={photos} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}
  </div>;
}
