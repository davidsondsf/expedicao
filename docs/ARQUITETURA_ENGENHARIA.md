# Arquitetura e Engenharia do Projeto Expedicao

## 1. Objetivo e escopo
Este projeto implementa um sistema de controle de estoque com autenticação, autorização por perfil, gestão de itens/categorias, movimentações e auditoria.

## 2. Stack técnica
- Frontend: React 18 + TypeScript + Vite
- UI: Tailwind CSS + shadcn/ui + Radix UI
- Estado assíncrono: TanStack Query
- Roteamento: React Router DOM
- Backend/BaaS: Supabase (Postgres, Auth, Storage, Edge Functions)
- Testes: Vitest
- Qualidade: ESLint + TypeScript (`tsc --noEmit`)

## 3. Arquitetura em camadas
- `src/pages`: telas/rotas de negócio
- `src/components`: componentes de layout e UI reutilizável
- `src/hooks`: integração com Supabase e regras de acesso por feature
- `src/contexts`: contexto global de autenticação (`AuthContext`)
- `src/integrations/supabase`: cliente e tipagem gerada/atualizada
- `supabase/migrations`: versionamento de mudanças de banco/RLS/policies
- `supabase/functions`: lógica administrativa sensível no backend

## 4. Fluxo de autenticação e autorização
- Login via `supabase.auth.signInWithPassword`.
- `AuthContext` compõe usuário da aplicação a partir de:
  - `profiles` (`name`, `email`, `active`)
  - `user_roles` (`ADMIN`, `OPERATOR`, `VIEWER`)
- Rotas protegidas por `ProtectedRoute`, com suporte a `requiredRoles`.
- Conta inativa (`profiles.active = false`) deve ser tratada como bloqueada no frontend e backend administrativo.

## 5. Domínio de estoque
Entidades principais:
- `items`
- `categories`
- `movements`
- `profiles`
- `user_roles`
- `audit_logs`

Decisão de engenharia aplicada:
- Movimentação de estoque passou para operação atômica no banco via RPC `register_movement`.
- Motivo: evitar inconsistência entre gravação de movimento e atualização de quantidade em operações concorrentes.

Migration relacionada:
- `supabase/migrations/20260224201000_register_movement_rpc.sql`

## 6. Segurança aplicada (hardening)
### 6.1 Storage `item-photos`
- Uploads em namespace por usuário: `<auth.uid()>/<itemId>/<timestamp>.<ext>`.
- Policies de `storage.objects` para `item-photos` restringindo `INSERT/UPDATE/DELETE` ao próprio namespace.

Migration relacionada:
- `supabase/migrations/20260224204500_harden_item_photos_policies.sql`

### 6.2 Administração de usuários (Edge Function)
- Função: `supabase/functions/admin-manage-user/index.ts`
- Regras:
  - somente `ADMIN`
  - validação forte de payload
  - trilha de auditoria em `audit_logs`
  - controle de ativação/inativação com reflexo no Auth

## 7. Performance e build
Melhorias aplicadas:
- Lazy loading de páginas no `App.tsx` (`React.lazy` + `Suspense`).
- `manualChunks` no `vite.config.ts` para separar bundles:
  - `vendor-react`
  - `vendor-supabase`
  - `vendor-radix`
  - `vendor-charts`
  - `vendor-misc`

Resultado:
- redução de acoplamento de bundle único e build mais saudável para deploy.

## 8. Padrão de validação técnica
Checklist padrão antes de commit/PR:
```bash
npm run lint
npx --no-install tsc --noEmit
npm test
npm run build
```

Status esperado:
- sem erros
- warnings de `react-refresh/only-export-components` podem existir e não bloqueiam merge

## 9. Estratégia de branches e integração
Fluxo recomendado:
1. `main` sempre estável
2. desenvolvimento em `feat/*`, `fix/*`, `chore/*`
3. merge em `main` preferencialmente por PR
4. após merge: deletar branch local/remota (histórico permanece no Git)

Integração com Lovable:
- Lovable sincroniza com Git; por isso `main` deve permanecer limpa e rastreável.
- Alterações locais devem voltar por PR para manter rastreabilidade.

## 10. Riscos e débitos técnicos atuais
- `npm audit` ainda reporta vulnerabilidades moderadas ligadas a cadeia `vite/esbuild` que exigem possível upgrade major.
- warnings de Fast Refresh em arquivos de UI compartilhada.
- aviso de `browserslist` desatualizado (não bloqueante).
