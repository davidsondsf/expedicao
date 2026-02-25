# Checkpoint: Fallback de variáveis Supabase no Vite

## Data de referência
2026-02-25

## Problema
- Erro fatal em runtime: `supabaseUrl is required` causando tela branca.
- O arquivo `.env` é auto-gerado pela plataforma, mas as variáveis `VITE_SUPABASE_*` não estavam sendo injetadas corretamente no runtime do Vite dev server.

## Solução aplicada
- Adicionada propriedade `define` no `vite.config.ts` com fallback hardcoded para as três variáveis:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
- Os valores usam `process.env.*` como fonte primária e caem para o valor literal caso a variável de ambiente não esteja disponível.

## Arquivo alterado
- `vite.config.ts`

## Risco conhecido
- Se as credenciais do projeto Supabase mudarem, os valores de fallback precisam ser atualizados manualmente no `vite.config.ts`.
- Esses valores são **chaves públicas (anon key)** — não há exposição de segredos.

## Validação
- Build aprovado sem erros.
- Tela de login deve carregar normalmente após reload do preview.
