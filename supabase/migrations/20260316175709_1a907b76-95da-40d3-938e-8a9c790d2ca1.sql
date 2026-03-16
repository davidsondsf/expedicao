
ALTER TABLE public.items
  ADD COLUMN requires_serial_number boolean NOT NULL DEFAULT false,
  ADD COLUMN allow_bulk_movement boolean NOT NULL DEFAULT true;
