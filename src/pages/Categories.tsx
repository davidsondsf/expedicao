import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { mockCategories } from '@/data/mockData';
import type { Category } from '@/types';
import { Plus, Pencil, Tag, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { isAdmin } = useAuth();

  const handleAdd = () => {
    if (!newName.trim()) return;
    const cat: Category = {
      id: `c${Date.now()}`,
      name: newName.trim(),
      active: true,
      createdAt: new Date().toISOString(),
      itemCount: 0,
    };
    setCategories(prev => [...prev, cat]);
    setNewName('');
  };

  const handleEdit = (id: string) => {
    if (!editName.trim()) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName.trim() } : c));
    setEditingId(null);
  };

  const handleDeactivate = (id: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: false } : c));
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

        {/* Add new */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Nova Categoria</h3>
          <div className="flex gap-3">
            <input
              className="input-search flex-1 h-9"
              placeholder="Nome da categoria..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>
        </div>

        {/* Active categories */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Categorias Ativas</h3>
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
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.itemCount ?? 0} iten(s) • Criada em {new Date(cat.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {editingId === cat.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(cat.id)}
                        className="h-7 w-7 flex items-center justify-center rounded text-success hover:bg-success/10 transition-colors"
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
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
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
        </div>

        {/* Inactive */}
        {inactive.length > 0 && (
          <div className="stat-card opacity-60">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Inativas</h3>
            <div className="space-y-2">
              {inactive.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 rounded-md border border-border/50 p-3">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground line-through">{cat.name}</p>
                  {isAdmin && (
                    <button
                      onClick={() => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: true } : c))}
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
