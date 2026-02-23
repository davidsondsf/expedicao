import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, type Permission } from '@/types';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? 'VIEWER';
  const perms = ROLE_PERMISSIONS[role];

  const can = (permission: Permission): boolean => perms[permission];

  return { ...perms, can, role };
}
