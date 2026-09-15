/* eslint-disable next/no-img-element, next/no-html-link-for-pages */
// Native images also render directly in the downloadable print edition.
import type { Metadata } from 'next';
import { site } from '@/data/site';
import { biography, formats, presentationCopy, whatsappLink } from '@/data/presentation';
import { SectionImage } from '@/components/section-image';
import './presskit.css';

export const metadata: Metadata = { title: 'DJ Sosô | Press kit', description: 'Conheça a Sosô, os formatos de apresentação e os projetos com marcas. Planeje seu evento com nossa equipe.', alternates: { canonical: '/presskit' } };

export default function PressKit() {
  return <main className="pk-document">
    <nav className="pk-nav" aria-label="Press kit"><a href="/">← Voltar ao site</a><a href="/presskit-soso.pdf" download>Baixar press kit (PDF) ↓</a></nav>
    <section className="pk-page pk-cover">
      <div className="pk-top"><b>DJ SOSÔ</b><span>PRESS KIT · EVENTOS & MARCAS</span></div>
      <div className="pk-cover-grid"><div><p className="pk-label">SÃO PAULO, BRASIL</p><h1><small>DJ</small>SOSÔ</h1><h2>9 anos.<br />Personalidade de sobra.</h2><p>Música para conectar pessoas.<br />{presentationCopy.intro}</p></div><SectionImage imageKey="presskitCover" /></div>
      <div className="pk-bottom"><span>MÚSICA · PERSONALIDADE · CONEXÃO</span><span>01 / 03</span></div>
    </section>
    <section className="pk-page">
      <div className="pk-top"><b>DJ SOSÔ</b><span>SOFIA & SUA MÚSICA</span></div>
      <div className="pk-bio"><SectionImage imageKey="presskitBio" /><div><p className="pk-label">CONHEÇA A SOFIA</p><h2>Pequena na idade.<br />Grande na curiosidade.</h2><p>{biography}</p><p>{presentationCopy.aboutStory}</p></div></div>
      <h2 className="pk-section-title">Formatos de contratação.</h2>
      <div className="pk-formats">{formats.map(format => <article key={format.name}><p className="pk-label">{format.tag}</p><h3>{format.name}</h3><p>{format.text}</p><small>{format.places}</small></article>)}</div>
      <div className="pk-repertoire"><b>REPERTÓRIO</b><p>{site.repertoire.join(' · ')}</p></div>
      <p className="pk-link"><a href="https://dj-soso-official.bruno-pavao.chatgpt.site/#resumo">Veja o resumo da Sosô no site →</a></p>
      <div className="pk-bottom"><span>DJ SOSÔ · APRESENTAÇÃO COMERCIAL</span><span>02 / 03</span></div>
    </section>
    <section className="pk-page">
      <div className="pk-top"><b>DJ SOSÔ</b><span>PROJETOS & CONTRATAÇÃO</span></div>
      <p className="pk-label">PARA EVENTOS E MARCAS</p><h2 className="pk-big">Vamos conversar<br />sobre sua ideia?</h2>
      <p className="pk-lead">Nossa equipe prepara a proposta com você, conforme o evento ou projeto, o público e os serviços desejados.</p>
      <div className="pk-columns">
        <div><h3>Estrutura & serviços</h3><p>{presentationCopy.services}</p><p>Controladora DDJ FLX 4, JBL 320, sintetizador, teclado, mesa de som e recursos de captura. <a href="https://dj-soso-official.bruno-pavao.chatgpt.site/#equipamentos">Veja a estrutura no site →</a></p><h3>Para preparar a proposta</h3><p>Envie a data, a cidade, o local, o tipo de evento e a duração desejada. Para marcas, conte a ideia, os canais e as entregas.</p></div>
        <div><h3>Onde atendemos</h3><p>{presentationCopy.travel}</p><h3>Repertório personalizado</h3><p>{presentationCopy.personalizedSets}</p></div>
      </div>
      <div className="pk-contact"><p className="pk-label">FALE COM NOSSA EQUIPE</p><h3>{site.contact.manager}</h3><p>{site.contact.role}</p><a href={whatsappLink(site.contact.whatsapp)}>Consultar disponibilidade no WhatsApp →</a><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></div>
      <div className="pk-social"><a href={site.social.instagram}>Instagram: @dj.soso.pavao</a><a href={site.social.tiktok}>TikTok: @dj.soso.pavao</a></div>
      <div className="pk-bottom"><span>DJ SOSÔ · MÚSICA PARA CONECTAR PESSOAS</span><span>03 / 03</span></div>
    </section>
  </main>;
}
