# DJ Sosô Site

Site comercial da DJ Sosô com página principal, galeria, press kit online/PDF e painel de equipe para gestão de fotos e vídeos.

## Desenvolvimento

Requisitos:

- Node.js 22.13+
- npm

Comandos principais:

```bash
npm install
npm run dev
```

O site local abre em `http://localhost:3000`.

Rotas úteis no desenvolvimento local:

- `/` — site principal
- `/admin` — painel local de desenvolvimento
- `/presskit` — press kit online

## Qualidade

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Conteúdo

- Imagens das seções: `data/section-images.json`
- Galeria gerada: `data/gallery.generated.ts`
- Fotos e vídeos públicos: `public/galeria/`
- Press kit PDF: `public/presskit-soso.pdf`

Ao rodar `npm run dev` ou `npm run build`, a galeria é atualizada automaticamente pelo script `scripts/generate-gallery.mjs`.

## Fluxo De Publicação

O conteúdo é versionado no Git. O painel admin funciona somente localmente em `npm run dev`; em produção, `/admin` responde 404.

Fluxo recomendado:

1. Rodar `npm run dev`.
2. Usar `/admin` localmente para alterar fotos, vídeos, descrições e imagens de seção.
3. Revisar o site local em `http://localhost:3000`.
4. Rodar `npm run verify`.
5. Conferir `git diff`.
6. Fazer commit e push somente após aprovação.
