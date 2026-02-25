import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useItemPhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = async (file: File, itemId: string): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Usuario nao autenticado');
      }

      const ext = file.name.split('.').pop();
      const path = `${authData.user.id}/${itemId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('item-photos').getPublicUrl(path);
      return data.publicUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadPhoto, uploading, error };
}
