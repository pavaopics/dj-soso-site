export const site = {
  name: 'DJ SOSÔ', location: 'São Paulo, Brasil',
  description: 'DJ Sosô, 9 anos. Música para lounges, sunsets, festas, eventos e projetos com marcas. São Paulo. Consulte a disponibilidade com nossa equipe.',
  navigation: [
    { label: 'Resumo', href: '#resumo' },
    { label: 'Vídeos', href: '#videos' }, { label: 'Eventos', href: '#eventos' },
    { label: 'Sofia', href: '#about' }, { label: 'Fotos', href: '#gallery' },
    { label: 'Marcas', href: '#marcas' }, { label: 'Contato', href: '#contact' },
    { label: 'Admin', href: '/admin' },
  ],
  social: { instagram: 'https://www.instagram.com/dj.soso.pavao', tiktok: 'https://www.tiktok.com/@dj.soso.pavao' },
  contact: { manager: 'Bruno Pavão', role: 'Contato da equipe e adulto responsável', email: 'pavaopics@gmail.com', whatsapp: 'https://wa.me/5511943366761?text=Ol%C3%A1!%20Gostaria%20de%20contratar%20a%20DJ%20Sos%C3%B4' }, // TODO: dados de contato reais
  repertoire: ['Afro House', 'Pop Dance', 'Anos 80 · 90 · 2000', 'Melodic House', 'Lounge', 'Sunset'],
  gear: {
    audio: ['Controladora DDJ FLX 4', 'Caixa JBL 320', 'Sintetizador Wave SMK 37', 'Teclado Yamaha E333', 'Mesa de som de 3 canais', 'Pad AMW', 'Interface U-Phoria UM2', 'Tripé para elevar a caixa', 'Controlador de knobs', 'KFX CR9'],
    capture: ['Câmera 360', 'Drone', 'Notebook', 'iPad'],
  },
} as const;
export type SiteConfig = typeof site;
