-- Atomic stock movement registration to avoid race conditions and partial writes.
CREATE OR REPLACE FUNCTION public.register_movement(
  _item_id uuid,
  _user_id uuid,
  _type text,
  _quantity integer,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _movement_id uuid := gen_random_uuid();
  _current_qty integer;
  _new_qty integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'User mismatch' USING ERRCODE = '42501';
  END IF;

  IF _quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero' USING ERRCODE = '22023';
  END IF;

  IF _type NOT IN ('ENTRY', 'EXIT') THEN
    RAISE EXCEPTION 'Tipo de movimento invalido' USING ERRCODE = '22023';
  END IF;

  SELECT quantity
  INTO _current_qty
  FROM public.items
  WHERE id = _item_id
    AND active = true
  FOR UPDATE;

  IF _current_qty IS NULL THEN
    RAISE EXCEPTION 'Item nao encontrado ou inativo' USING ERRCODE = 'P0002';
  END IF;

  _new_qty := CASE
    WHEN _type = 'ENTRY' THEN _current_qty + _quantity
    ELSE _current_qty - _quantity
  END;

  IF _new_qty < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente! Disponivel: %', _current_qty USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.movements (id, type, quantity, item_id, user_id, note)
  VALUES (_movement_id, _type, _quantity, _item_id, _user_id, _note);

  UPDATE public.items
  SET quantity = _new_qty
  WHERE id = _item_id;

  RETURN _movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_movement(uuid, uuid, text, integer, text) TO authenticated;
