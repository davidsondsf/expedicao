-- Harden storage policies for item photos (authenticated users only)
DROP POLICY IF EXISTS "Authenticated users can upload item photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update item photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete item photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload item photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'item-photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update item photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'item-photos'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'item-photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete item photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'item-photos'
  AND auth.role() = 'authenticated'
);

-- Barcode generation with sequence to avoid race conditions
CREATE SEQUENCE IF NOT EXISTS public.item_barcode_seq;

DO $$
DECLARE
  v_max BIGINT;
BEGIN
  SELECT COALESCE(
    MAX((regexp_match(barcode, '^GCP-[0-9]{4}-([0-9]+)$'))[1]::BIGINT),
    0
  )
  INTO v_max
  FROM public.items;

  IF v_max < 1 THEN
    PERFORM setval('public.item_barcode_seq', 1, false);
  ELSE
    PERFORM setval('public.item_barcode_seq', v_max, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_next_item_barcode()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  v_seq := nextval('public.item_barcode_seq');
  RETURN format(
    'GCP-%s-%s',
    EXTRACT(YEAR FROM now())::INT,
    lpad(v_seq::TEXT, 5, '0')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_next_item_barcode() TO authenticated;

-- Atomic stock movement in a single transaction
CREATE OR REPLACE FUNCTION public.create_movement_and_adjust_stock(
  p_item_id UUID,
  p_type TEXT,
  p_quantity INTEGER,
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  movement_id UUID,
  item_id UUID,
  new_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_current_qty INTEGER;
  v_new_qty INTEGER;
  v_movement_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF p_type NOT IN ('ENTRY', 'EXIT') THEN
    RAISE EXCEPTION 'Invalid movement type';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  SELECT i.quantity
    INTO v_current_qty
  FROM public.items i
  WHERE i.id = p_item_id
    AND i.active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or inactive';
  END IF;

  IF p_type = 'EXIT' AND p_quantity > v_current_qty THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %', v_current_qty;
  END IF;

  IF p_type = 'ENTRY' THEN
    v_new_qty := v_current_qty + p_quantity;
  ELSE
    v_new_qty := v_current_qty - p_quantity;
  END IF;

  INSERT INTO public.movements (type, quantity, item_id, user_id, note)
  VALUES (p_type, p_quantity, p_item_id, p_user_id, p_note)
  RETURNING id INTO v_movement_id;

  UPDATE public.items
  SET quantity = v_new_qty
  WHERE id = p_item_id;

  RETURN QUERY
  SELECT v_movement_id, p_item_id, v_new_qty;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_movement_and_adjust_stock(UUID, TEXT, INTEGER, UUID, TEXT) TO authenticated;
