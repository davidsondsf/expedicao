-- Harden storage policies for item photos:
-- - users can only write/update/delete files inside their own folder
-- - public read remains enabled for the public bucket

DROP POLICY IF EXISTS "Authenticated users can upload item photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update item photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete item photos" ON storage.objects;

CREATE POLICY "Users can upload own item photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own item photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own item photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
