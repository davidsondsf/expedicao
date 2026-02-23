import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  userName: string;
}

export function ResetPasswordDialog({ open, onClose, onSubmit, userName }: Props) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setPassword(''); setError(''); setShowPw(false); }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Nova senha para <strong>{userName}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              className="input-search h-9 w-full pr-10"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Nova senha (mín. 6 caracteres)"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity">
              {submitting ? 'Redefinindo...' : 'Redefinir'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
