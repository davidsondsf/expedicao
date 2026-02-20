import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { mockItems, mockCategories } from '@/data/mockData';
import type { Item } from '@/types';
import { Plus, Search, Package, Pencil, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ItemFormDialog } from '@/components/ItemFormDialog';

export default function Items() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [items, setItems] = useState<Item[]>(mockItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
      || i.barcode.toLowerCase().includes(search.toLowerCase())
      || (i.serialNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCat = categoryFilter === 'all' || i.categoryId === categoryFilter;
    return matchSearch && matchCat && i.active;
  });

  const handleDeactivate = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, active: false } : i));
  };

  return (
    <AppLayout title="Itens / Estoque">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="page-header mb-0">
            <h2 className="page-title">Itens do Estoque</h2>
            <p className="page-subtitle">{filtered.length} itens encontrados</p>
          </div>
          <button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Novo Item
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="input-search pl-8 h-9 w-full"
              placeholder="Buscar por nome, código de barras ou serial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-search h-9 w-auto"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {mockCategories.filter(c => c.active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="stat-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Código de Barras</th>
                  <th>Categoria</th>
                  <th>Local</th>
                  <th>Qtd</th>
                  <th>Status</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nenhum item encontrado
                    </td>
                  </tr>
                )}
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.brand} — {item.model}</p>
                        {item.serialNumber && (
                          <p className="text-xs font-mono text-muted-foreground">{item.serialNumber}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-muted-foreground">{item.barcode}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">{item.category?.name}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">{item.location}</span>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className={cn(
                          'font-mono text-sm font-semibold',
                          item.quantity === 0 ? 'text-destructive' :
                            item.quantity <= item.minQuantity ? 'text-warning' : 'text-success'
                        )}>
                          {item.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">mín: {item.minQuantity}</span>
                      </div>
                    </td>
                    <td>
                      {item.quantity === 0 ? (
                        <span className="badge-exit">Sem Estoque</span>
                      ) : item.quantity <= item.minQuantity ? (
                        <span className="badge-warning">Estoque Baixo</span>
                      ) : (
                        <span className="badge-entry">OK</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 pr-2">
                        <button
                          onClick={() => navigate(`/items/${item.id}`)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditing(item); setDialogOpen(true); }}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeactivate(item.id)}
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Desativar (soft delete)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ItemFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        item={editing}
        onSave={(data) => {
          if (editing) {
            setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...data } : i));
          } else {
          const cat = mockCategories.find(c => c.id === data.categoryId);
            const newItem: Item = {
              id: `i${Date.now()}`,
              name: data.name ?? '',
              brand: data.brand ?? '',
              model: data.model ?? '',
              serialNumber: data.serialNumber,
              quantity: data.quantity ?? 0,
              minQuantity: data.minQuantity ?? 0,
              location: data.location ?? '',
              categoryId: data.categoryId ?? '',
              barcode: `GCP-${new Date().getFullYear()}-${String(items.length + 1).padStart(5, '0')}`,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              category: cat,
            };
            setItems(prev => [...prev, newItem]);
          }
          setDialogOpen(false);
        }}
      />
    </AppLayout>
  );
}
