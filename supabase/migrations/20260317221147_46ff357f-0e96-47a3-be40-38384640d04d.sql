
CREATE OR REPLACE FUNCTION public.generate_next_item_barcode()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
  _barcode TEXT;
BEGIN
  _year := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(barcode, '^GCP-' || _year || '-', ''), barcode) AS INTEGER)
  ), 0) + 1
  INTO _seq
  FROM public.items
  WHERE barcode LIKE 'GCP-' || _year || '-%';
  
  _barcode := 'GCP-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
  
  RETURN _barcode;
END;
$$;
