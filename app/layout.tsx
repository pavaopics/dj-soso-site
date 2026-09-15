import type { Metadata, Viewport } from 'next';
import { site } from '@/data/site';
import './globals.css';
import './showcase.css';
import './sections.css';
export const metadata:Metadata={metadataBase:new URL('https://dj-soso-official.bruno-pavao.chatgpt.site'),title:'DJ Sosô | Eventos, Sunsets & Marcas',description:site.description,alternates:{canonical:'/'},openGraph:{title:'DJ SOSÔ — Música para conectar pessoas',description:'Conheça a Sofia, veja os vídeos e converse com nossa equipe sobre eventos e projetos com marcas.',type:'website',locale:'pt_BR',images:[{url:'/soso-social.jpg',width:1200,height:630,alt:'DJ Sosô — 9 anos, personalidade de sobra. Eventos, sunsets e marcas.'}]},twitter:{card:'summary_large_image',title:'DJ SOSÔ — Música para conectar pessoas',description:site.description,images:['/soso-social.jpg']}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#111210'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
