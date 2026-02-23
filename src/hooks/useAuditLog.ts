import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface LogParams {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(async ({ action, entity, entityId, details }: LogParams) => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        action,
        entity,
        entity_id: entityId ?? null,
        details: (details ?? null) as unknown as Record<string, never>,
      }]);
    } catch {
      // silent fail — audit should not block UX
    }
  }, [user]);

  return { log };
}
