import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Plus, Pencil, Tag, X, Check, Loader2 } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

export default function Categories() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { canManageCategories } = usePermissions();
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const handleAdd = async () => {
    if (!canManageCategories || !newName.trim()) return;

    try {
      await createCategory.mutateAsync(newName.trim());
      setNewName('');
      toast({ title: 'Categoria criada com sucesso!' });
    } catch {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    }
  };

  const handleEdit = async (id: string) => {
    if (!canManageCategories || !editName.trim()) return;

    try {
      await updateCategory.mutateAsync({ id, name: editName.trim() });
      setEditingId(null);
      toast({ title: 'Categoria atualizada!' });
    } catch {
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!canManageCategories) return;

    try {
      await updateCategory.mutateAsync({ id, active: false });
    } catch {
      toast({ title: 'Erro ao desativar categoria', variant: 'destructive' });
    }
  };

  const handleReactivate = async (id: string) => {
    if (!canManageCategories) return;

    try {
      await updateCategory.mutateAsync({ id, active: true });
    } catch {
      toast({ title: 'Erro ao reativar categoria', variant: 'destructive' });
    }
  };

  const active = categories.filter(c => c.active);
  const inactive = categories.filter(c => !c.active);

  return (
    <AppLayout title="Categorias">
      <div className="space-y-6 max-w-2xl">
        <div className="page-header">
          <h2 className="page-title">Categorias</h2>
          <p className="page-subtitle">{active.length} categorias ativas</p>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Nova Categoria</h3>
          <div className="flex gap-3">
            <input
              className="input-search flex-1 h-9"
              placeholder="Nome da categoria..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              disabled={!canManageCategories}
            />
            <button
              onClick={handleAdd}
              disabled={!canManageCategories || !newName.trim() || createCategory.isPending}
              className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Categorias Ativas</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {active.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  {editingId === cat.id ? (
                    <input
                      className="input-search flex-1 h-8 text-sm"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEdit(cat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      disabled={!canManageCategories}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {new Date(cat.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {editingId === cat.id ? (
                      <>
                        <button
                          onClick={() => handleEdit(cat.id)}
                          disabled={!canManageCategories}
                          className="h-7 w-7 flex items-center justify-center rounded text-success hover:bg-success/10 transition-colors disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                          disabled={!canManageCategories}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {canManageCategories && (
                          <button
                            onClick={() => handleDeactivate(cat.id)}
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {active.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma categoria ativa.</p>
              )}
            </div>
          )}
        </div>

        {inactive.length > 0 && (
          <div className="stat-card opacity-60">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Inativas</h3>
            <div className="space-y-2">
              {inactive.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 rounded-md border border-border/50 p-3">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground line-through">{cat.name}</p>
                  {canManageCategories && (
                    <button
                      onClick={() => handleReactivate(cat.id)}
                      className="ml-auto text-xs text-primary hover:underline"
                    >
                      Reativar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
