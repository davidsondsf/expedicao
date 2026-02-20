
-- Criar bucket de armazenamento para fotos de itens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-photos',
  'item-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer um pode ver as fotos (bucket público)
CREATE POLICY "Public read item photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-photos');

-- Política: usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload item photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-photos');

-- Política: usuários autenticados podem atualizar fotos
CREATE POLICY "Authenticated users can update item photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'item-photos');

-- Política: usuários autenticados podem deletar fotos
CREATE POLICY "Authenticated users can delete item photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-photos');

-- Adicionar tipo enum para condição do item
CREATE TYPE item_condition AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');
