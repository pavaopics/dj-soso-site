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

Rotas úteis:

- `/` — site principal
- `/admin` — painel da equipe
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

## Cloudflare Produção

A base D1/R2 de produção está documentada em `docs/cloudflare-admin-delivery-a.md`.

Nesta fase, `CONTENT_SOURCE=local` mantém o site usando integralmente o conteúdo versionado atual. `CONTENT_SOURCE=cloud` só deve ser ativado depois da migração e validação em staging.
