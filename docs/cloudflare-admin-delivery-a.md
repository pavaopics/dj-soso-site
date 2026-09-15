# Cloudflare Admin - Entrega A

Esta entrega prepara a base de produção para D1/R2 sem alterar o fluxo de escrita do admin.

## Escopo desta entrega

- Declara bindings Cloudflare para D1 e R2.
- Cria migration inicial do D1.
- Adiciona camada de leitura pública com feature flag `CONTENT_SOURCE`.
- Mantém fallback local integral.
- Prepara staging.
- Não implementa upload, escrita do admin, Cloudflare Access ou migração definitiva.

## Fonte de conteúdo

A decisão efetiva vem sempre do ambiente do Worker:

```txt
CONTENT_SOURCE=local
CONTENT_SOURCE=cloud
```

Regras:

- `local`: usa integralmente os arquivos versionados atuais (`data/*` e `public/*`).
- `cloud`: usa integralmente D1/R2.
- Nunca mistura D1/R2 com conteúdo local silenciosamente.
- Se `CONTENT_SOURCE=cloud` e D1/R2 estiver indisponível ou incompleto, a aplicação deve falhar de forma explícita.

O valor `site_settings.content_source` no D1 existe apenas como informação administrativa e histórico operacional. Ele não decide o runtime porque rollback precisa funcionar mesmo se D1 estiver indisponível.

## Rollback

Rollback para conteúdo local:

```bash
wrangler deploy --var CONTENT_SOURCE:local
```

Ou ajuste a variável `CONTENT_SOURCE` no ambiente/deploy da Cloudflare para `local` e publique uma nova versão.

Ativação futura do conteúdo cloud:

```bash
wrangler deploy --var CONTENT_SOURCE:cloud
```

Os arquivos locais não devem ser apagados nesta fase. Eles continuam sendo o rollback seguro.

## R2

Leitura pública deve usar:

```txt
https://media.djsoso.com.br/{r2_key}
```

O app deriva a URL em runtime:

```txt
R2_PUBLIC_BASE_URL + r2_key
```

Não salvamos `public_url` no D1 para evitar URLs obsoletas se o domínio de mídia mudar.

Upload futuro deve usar o endpoint S3-compatible do R2 para gerar presigned URLs. O domínio público `media.djsoso.com.br` não deve ser usado como endpoint de upload presigned.

## Recursos staging

Criar manualmente na Cloudflare:

- D1 staging: `dj-soso-db-staging`
- R2 staging: `dj-soso-media-staging`
- Variável staging: `CONTENT_SOURCE=local`
- Variável staging: `R2_PUBLIC_BASE_URL=https://media.djsoso.com.br`

Depois de criar o D1, substituir `REPLACE_WITH_STAGING_D1_DATABASE_ID` em `wrangler.jsonc`.

Aplicar migration staging:

```bash
npx wrangler d1 migrations apply dj-soso-db-staging --env staging --remote
```

## Recursos produção

Criar manualmente na Cloudflare:

- D1 produção: `dj-soso-db`
- R2 produção: `dj-soso-media`
- Domínio público: `djsoso.com.br`
- Domínio de mídia: `media.djsoso.com.br`
- Variável produção: `CONTENT_SOURCE=local` inicialmente
- Variável produção: `R2_PUBLIC_BASE_URL=https://media.djsoso.com.br`

Depois de criar o D1, substituir `REPLACE_WITH_PRODUCTION_D1_DATABASE_ID` em `wrangler.jsonc`.

Aplicar migration produção:

```bash
npx wrangler d1 migrations apply dj-soso-db --remote
```

## Upload sessions

`upload_sessions.media_id` aponta para `media_items.id`.

Estratégia futura obrigatória:

1. Criar primeiro `media_items` com `status='pending'` e chave R2 gerada pelo servidor.
2. Criar `upload_sessions` apontando para esse `media_id`.
3. Browser sobe o arquivo direto ao R2 por presigned URL curta.
4. Commit valida objeto e muda `media_items.status` para `active`.
5. Sessões expiradas continuam rastreáveis para limpeza de objetos órfãos.

## Próximas entregas

- Entrega B: autenticação Access validada no servidor, rotas admin, escrita, presigned upload, edição e exclusão recuperável.
- Entrega C: script de migração, testes em staging, ativação `CONTENT_SOURCE=cloud` e rollback validado.
