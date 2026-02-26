
-- 1. Enum for maleta status
CREATE TYPE public.maleta_status AS ENUM ('aberta', 'devolvida', 'atrasada');

-- 2. Main table: maletas_tecnicas
CREATE TABLE public.maletas_tecnicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  data_emprestimo TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_prevista_devolucao TIMESTAMPTZ NOT NULL,
  data_devolucao TIMESTAMPTZ,
  status maleta_status NOT NULL DEFAULT 'aberta',
  observacoes TEXT,
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Maleta items table
CREATE TABLE public.maleta_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maleta_id UUID NOT NULL REFERENCES public.maletas_tecnicas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  numero_serie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.maletas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maleta_itens ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for maletas_tecnicas
-- Admins and operators can view all
CREATE POLICY "Non-viewers can view all maletas"
  ON public.maletas_tecnicas FOR SELECT
  USING (NOT public.has_role(auth.uid(), 'VIEWER'));

-- Viewers can only see their own
CREATE POLICY "Viewers can view own maletas"
  ON public.maletas_tecnicas FOR SELECT
  USING (public.has_role(auth.uid(), 'VIEWER') AND auth.uid() = usuario_id);

-- Only non-viewers can insert
CREATE POLICY "Non-viewers can insert maletas"
  ON public.maletas_tecnicas FOR INSERT
  WITH CHECK (NOT public.has_role(auth.uid(), 'VIEWER'));

-- Only non-viewers can update (for devolução)
CREATE POLICY "Non-viewers can update maletas"
  ON public.maletas_tecnicas FOR UPDATE
  USING (NOT public.has_role(auth.uid(), 'VIEWER'));

-- 6. RLS policies for maleta_itens
CREATE POLICY "Non-viewers can view all maleta_itens"
  ON public.maleta_itens FOR SELECT
  USING (NOT public.has_role(auth.uid(), 'VIEWER'));

CREATE POLICY "Viewers can view own maleta_itens"
  ON public.maleta_itens FOR SELECT
  USING (
    public.has_role(auth.uid(), 'VIEWER') AND
    EXISTS (
      SELECT 1 FROM public.maletas_tecnicas mt
      WHERE mt.id = maleta_id AND mt.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Non-viewers can insert maleta_itens"
  ON public.maleta_itens FOR INSERT
  WITH CHECK (NOT public.has_role(auth.uid(), 'VIEWER'));

-- 7. Updated_at trigger for maletas_tecnicas
CREATE TRIGGER update_maletas_tecnicas_updated_at
  BEFORE UPDATE ON public.maletas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_maletas_tecnicas_usuario ON public.maletas_tecnicas(usuario_id);
CREATE INDEX idx_maletas_tecnicas_status ON public.maletas_tecnicas(status);
CREATE INDEX idx_maleta_itens_maleta ON public.maleta_itens(maleta_id);
CREATE INDEX idx_maleta_itens_item ON public.maleta_itens(item_id);

-- 9. RPC: Create maleta atomically (insert maleta + items + movements + update stock)
CREATE OR REPLACE FUNCTION public.create_maleta(
  _usuario_id UUID,
  _data_prevista_devolucao TIMESTAMPTZ,
  _observacoes TEXT,
  _criado_por UUID,
  _itens JSONB -- array of {item_id, quantidade, numero_serie?}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _maleta_id UUID;
  _item JSONB;
  _item_id UUID;
  _qty INTEGER;
  _serial TEXT;
  _current_qty INTEGER;
BEGIN
  -- Validate caller is not VIEWER
  IF public.has_role(_criado_por, 'VIEWER') THEN
    RAISE EXCEPTION 'Sem permissão para criar maleta técnica.';
  END IF;

  -- Create maleta
  INSERT INTO public.maletas_tecnicas (usuario_id, data_prevista_devolucao, observacoes, criado_por)
  VALUES (_usuario_id, _data_prevista_devolucao, _observacoes, _criado_por)
  RETURNING id INTO _maleta_id;

  -- Process each item
  FOR _item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _item_id := (_item->>'item_id')::UUID;
    _qty := (_item->>'quantidade')::INTEGER;
    _serial := _item->>'numero_serie';

    IF _qty <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser maior que zero.';
    END IF;

    -- Check available stock
    SELECT quantity INTO _current_qty FROM public.items WHERE id = _item_id FOR UPDATE;
    IF _current_qty IS NULL THEN
      RAISE EXCEPTION 'Item não encontrado: %', _item_id;
    END IF;
    IF _current_qty < _qty THEN
      RAISE EXCEPTION 'Saldo insuficiente para o item. Disponível: %, Solicitado: %', _current_qty, _qty;
    END IF;

    -- Check serial number uniqueness in open maletas
    IF _serial IS NOT NULL AND _serial != '' THEN
      IF EXISTS (
        SELECT 1 FROM public.maleta_itens mi
        JOIN public.maletas_tecnicas mt ON mt.id = mi.maleta_id
        WHERE mi.numero_serie = _serial AND mt.status = 'aberta'
      ) THEN
        RAISE EXCEPTION 'Número de série já emprestado em maleta aberta: %', _serial;
      END IF;
    END IF;

    -- Insert maleta item
    INSERT INTO public.maleta_itens (maleta_id, item_id, quantidade, numero_serie)
    VALUES (_maleta_id, _item_id, _qty, _serial);

    -- Create EXIT movement (EMPRESTIMO)
    INSERT INTO public.movements (item_id, user_id, type, quantity, note)
    VALUES (_item_id, _criado_por, 'EXIT', _qty,
      'Empréstimo - Maleta Técnica #' || _maleta_id::TEXT);

    -- Update stock
    UPDATE public.items SET quantity = quantity - _qty WHERE id = _item_id;
  END LOOP;

  RETURN _maleta_id;
END;
$$;

-- 10. RPC: Return maleta atomically
CREATE OR REPLACE FUNCTION public.return_maleta(
  _maleta_id UUID,
  _user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _status maleta_status;
  _item RECORD;
BEGIN
  -- Validate caller is not VIEWER
  IF public.has_role(_user_id, 'VIEWER') THEN
    RAISE EXCEPTION 'Sem permissão para registrar devolução.';
  END IF;

  -- Check maleta exists and is open
  SELECT status INTO _status FROM public.maletas_tecnicas WHERE id = _maleta_id FOR UPDATE;
  IF _status IS NULL THEN
    RAISE EXCEPTION 'Maleta não encontrada.';
  END IF;
  IF _status = 'devolvida' THEN
    RAISE EXCEPTION 'Maleta já devolvida.';
  END IF;

  -- Return each item
  FOR _item IN SELECT item_id, quantidade FROM public.maleta_itens WHERE maleta_id = _maleta_id
  LOOP
    -- Create ENTRY movement (DEVOLUCAO)
    INSERT INTO public.movements (item_id, user_id, type, quantity, note)
    VALUES (_item.item_id, _user_id, 'ENTRY', _item.quantidade,
      'Devolução - Maleta Técnica #' || _maleta_id::TEXT);

    -- Update stock
    UPDATE public.items SET quantity = quantity + _item.quantidade WHERE id = _item.item_id;
  END LOOP;

  -- Update maleta status
  UPDATE public.maletas_tecnicas
  SET status = 'devolvida', data_devolucao = now()
  WHERE id = _maleta_id;
END;
$$;

-- 11. Function to auto-update overdue status (can be called periodically or on select)
CREATE OR REPLACE FUNCTION public.update_maletas_atrasadas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.maletas_tecnicas
  SET status = 'atrasada'
  WHERE status = 'aberta' AND data_prevista_devolucao < now();
$$;
