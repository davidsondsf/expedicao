# Validacao Prod/Staging

## 1) Auth e conta inativa
- Fazer login com usuario ativo: deve entrar normalmente.
- Inativar usuario via painel admin.
- Tentar login novamente: deve bloquear acesso nas rotas protegidas com mensagem de conta inativa.

## 2) Movimentacao atomica de estoque
- Criar `ENTRY` valida e confirmar:
  - movimento criado em `movements`
  - `items.quantity` atualizado na mesma operacao
- Criar `EXIT` com quantidade maior que o estoque:
  - deve falhar com erro de estoque insuficiente
  - sem gravar movimento parcial
- Em dois navegadores/sessoes, enviar movimentacoes simultaneas no mesmo item:
  - nao pode gerar quantidade negativa
  - sem divergencia entre `movements` e `items.quantity`

## 3) Storage item-photos
- Usuario A faz upload de foto: deve funcionar.
- Usuario B tenta atualizar/deletar arquivo do Usuario A:
  - deve falhar por policy.
- Leitura publica da foto deve continuar funcionando (bucket publico).

## 4) Admin manage user
- Criar usuario com payload valido: sucesso.
- Criar usuario com payload invalido (email/senha/role): deve retornar 400.
- Atualizar usuario sem campos de alteracao: deve retornar 400.
- Reset de senha com senha curta: deve retornar 400.

## 5) Regressao rapida UI
- Viewer nao deve ver botoes de criar/editar/deletar item, criar movimentacao e gerenciar categorias.
- Operator deve criar/editar item e criar movimentacao, sem deletar item.
- Admin deve manter acesso total.
