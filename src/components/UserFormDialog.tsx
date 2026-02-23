import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@/types';
import type { ManagedUser } from '@/hooks/useAdminUsers';

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  user?: ManagedUser | null;
}

export interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'VIEWER', label: 'Visualizador' },
];

export function UserFormDialog({ open, onClose, onSubmit, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setRole(user?.role ?? 'OPERATOR');
      setError('');
      setShowPw(false);
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ name, email, password, role });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuário' : 'Criar Usuário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome</label>
            <input
              className="input-search h-9 w-full"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <input
              className="input-search h-9 w-full"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isEdit}
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Senha</label>
              <div className="relative">
                <input
                  className="input-search h-9 w-full pr-10"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Papel</label>
            <select
              className="input-search h-9 w-full"
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {submitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
