
CREATE OR REPLACE FUNCTION public.create_movement_and_adjust_stock(
  p_item_id uuid,
  p_type text,
  p_quantity integer,
  p_user_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_qty INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero.';
  END IF;

  -- Lock the item row
  SELECT quantity INTO _current_qty FROM public.items WHERE id = p_item_id FOR UPDATE;
  IF _current_qty IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado.';
  END IF;

  -- Validate EXIT
  IF p_type = 'EXIT' AND _current_qty < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', _current_qty, p_quantity;
  END IF;

  -- Insert movement
  INSERT INTO public.movements (item_id, user_id, type, quantity, note)
  VALUES (p_item_id, p_user_id, p_type, p_quantity, p_note);

  -- Adjust stock
  IF p_type = 'ENTRY' THEN
    UPDATE public.items SET quantity = quantity + p_quantity WHERE id = p_item_id;
  ELSIF p_type = 'EXIT' THEN
    UPDATE public.items SET quantity = quantity - p_quantity WHERE id = p_item_id;
  ELSE
    RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_type;
  END IF;
END;
$$;
