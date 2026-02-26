# Checkpoint: Módulo Maleta Técnica

## Data de referência
2026-02-25

## Resumo
Módulo de empréstimo temporário de itens do estoque (Maleta Técnica) com controle completo de ciclo de vida.

## Estrutura de Dados

### Tabelas criadas
- `maletas_tecnicas` — registro principal do empréstimo (usuário, datas, status, observações)
- `maleta_itens` — itens vinculados a cada maleta (item, quantidade, número de série)

### Enum
- `maleta_status`: `aberta`, `devolvida`, `atrasada`

### RPCs (transações atômicas)
- `create_maleta` — cria maleta + itens + movimentações EXIT + atualiza saldo
- `return_maleta` — devolve maleta + movimentações ENTRY + restaura saldo
- `update_maletas_atrasadas` — marca como `atrasada` quando `data_prevista_devolucao < now()`

## Segurança (RLS)
- Admin/Operador: acesso completo (CRUD)
- Visualizador: apenas SELECT nos próprios registros (`usuario_id = auth.uid()`)

## Arquivos criados

### Tipos
- `src/types/maleta.ts`

### Hooks
- `src/hooks/useMaletas.ts` — queries e mutations para maletas

### Páginas
- `src/pages/Maletas.tsx` — listagem com filtros por status e busca
- `src/pages/MaletaCreate.tsx` — stepper de 3 etapas (usuário → itens → confirmação)
- `src/pages/MaletaDetail.tsx` — detalhe com itens e botão de devolução

### Componentes
- `src/components/dashboard/MaletaStatsCard.tsx` — card de stats no dashboard

## Arquivos modificados
- `src/App.tsx` — rotas `/maletas`, `/maletas/new`, `/maletas/:id`
- `src/components/Sidebar.tsx` — item de menu "Maleta Técnica"
- `src/pages/Dashboard.tsx` — card de estatísticas de maletas

## Regras de negócio implementadas
1. Validação de saldo antes do empréstimo
2. Bloqueio de número de série duplicado em maletas abertas
3. Movimentações automáticas (EXIT no empréstimo, ENTRY na devolução)
4. Status automático de "atrasada"
5. Permissão: apenas Admin/Operador criam e devolvem maletas
6. Visualizador pode apenas consultar suas próprias maletas
