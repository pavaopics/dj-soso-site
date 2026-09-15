export const formats = [
  { name: 'Lounge & Sunset', tag: 'PARA CRIAR ATMOSFERA', text: 'Música para acompanhar o pôr do sol, receber convidados e criar o clima do encontro. Repertório pensado para o ambiente e a ocasião.', places: 'Vinícolas · rooftops · lounges · recepções', image: 'foto-4', imageSlot: 'lounge', topic: 'um set Lounge ou Sunset' },
  { name: 'Festas & Eventos', tag: 'PARA CELEBRAR', text: 'Pop e música eletrônica para dar personalidade à festa. Nossa equipe combina o formato e o repertório com você, de acordo com o público.', places: 'Eventos privados · corporativos · casas de eventos', image: 'foto-2', imageSlot: 'events', topic: 'uma apresentação em evento' },
  { name: 'Marcas & Conteúdo', tag: 'PARA CONTAR HISTÓRIAS', text: 'Apresentações, ativações e conteúdo para redes e campanhas. Projetos que unem a música e a personalidade da Sosô à proposta da sua marca.', places: 'Campanhas · ativações · projetos especiais', image: 'foto-6', imageSlot: 'brandFormat', topic: 'um projeto com minha marca' },
] as const;

export const biography = 'Sofia tem 9 anos e explora a música com curiosidade e personalidade. Entre controladoras, teclados e sintetizadores, desenvolve seu repertório e seu jeito de tocar.';

// Shared copy keeps the site, online press kit and PDF consistent.
export const presentationCopy = {
  intro: 'Sets para lounges e sunsets, apresentações em festas e eventos e projetos de conteúdo com marcas.',
  aboutStory: 'Entre mixagens, loops e vocais, Sofia explora o Ableton e combina referências do pop e da música eletrônica.',
  aboutEnergy: 'Cada apresentação é uma oportunidade de descobrir novas músicas, experimentar e compartilhar essa energia com o público.',
  partnership: 'Nossa equipe conversa com você para criar projetos que combinem a personalidade da Sosô com os objetivos da sua marca.',
  partnershipBrief: 'Conte a ideia do projeto, as datas, os canais e as entregas desejadas.',
  contact: 'Envie a data, a cidade, o local e o tipo de evento. Nossa equipe ajuda a definir o formato, o repertório e a estrutura.',
  services: 'Apresentação da DJ, locação de equipamentos e cobertura de foto e vídeo são serviços definidos na proposta, juntos ou separadamente.',
  personalizedSets: 'Nossa equipe combina a seleção musical com você, conforme o público e a ocasião. Para sets com músicas escolhidas por você, fale conosco com pelo menos 7 dias corridos de antecedência.',
  travel: 'Nossa base é São Paulo. Atendemos a capital e a região, com deslocamentos por terra de até 200 km. Viagens aéreas são combinadas durante as férias escolares, com consulta antecipada.',
} as const;

export const faq = [
  { question: 'Como consultar uma data?', answer: 'Envie a data, a cidade, o local e o tipo de evento pelo WhatsApp. Nossa equipe conversa com você sobre disponibilidade, formato e proposta.' },
  { question: 'O repertório pode ser personalizado?', answer: presentationCopy.personalizedSets },
  { question: 'A estrutura de som está incluída?', answer: `${presentationCopy.services} Nossa equipe avalia o espaço e o som disponível no local para definir o que será necessário.` },
  { question: 'Qual é a duração da apresentação?', answer: 'Nossa equipe combina a duração e os horários com você, de acordo com o formato e a programação do evento.' },
  { question: 'A Sosô atende fora de São Paulo?', answer: presentationCopy.travel },
  { question: 'Como funcionam parcerias e publicidade?', answer: 'Envie a ideia da campanha, as datas, os canais, as entregas e o período de uso do conteúdo. Nossa equipe avalia o projeto e prepara uma proposta.' },
] as const;

export function whatsappLink(base: string, topic = 'a disponibilidade da DJ Sosô') {
  const url = new URL(base);
  url.searchParams.set('text', `Olá! Gostaria de consultar ${topic}.\nData:\nCidade/local:\nTipo de evento ou projeto:`);
  return url.toString();
}

export const photoLabels: Record<string, string> = {
  'foto-1': 'Sosô na controladora, com os convidados ao redor',
  'foto-2': 'Sosô tocando e compartilhando a música com o público',
  'foto-3': 'Sofia de fones e jaqueta dourada',
  'foto-4': 'Sofia curtindo a música, em retrato com fundo turquesa',
  'foto-5': 'Retrato criativo de Sosô com moldura de rede social',
  'foto-6': 'Retrato de Sosô com óculos de flores e fundo amarelo',
  'foto-7': 'Retrato de Sosô com luzes coloridas',
};
