import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Plus, Search, Package, Pencil, Loader2, Target, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ItemFormDialog } from '@/components/ItemFormDialog';
import { ItemGroupDetails } from '@/components/ItemGroupDetails';
import { useItems, useCreateItem, useUpdateItem } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useItemPhotoUpload } from '@/hooks/useItemPhotoUpload';
import type { Item, Category } from '@/types';

// Grupo de Modelos (Itens com mesmo nome/marca/modelo)
interface ModelGroup {
  name: string;
  brand: string;
  model: string;
  categoryId: string;
  items: Item[];
  totalQuantity: number;
  requiresSerialNumber: boolean;
  minQuantity: number;
}

export default function Estoque() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();
  const { canCreateItems, canEditItems } = usePermissions();
  const { toast } = useToast();
  
  const { data: items = [], isLoading } = useItems();
  const { data: categories = [] } = useCategories();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { uploadPhoto } = useItemPhotoUpload();

  type SaveData = {
    name: string; brand: string; model: string;
    categoryId: string;
    minQuantity: number;
    requiresSerialNumber: boolean;
    allowBulkMovement: boolean;
    condition?: string;
    serialNumber?: string;
  };

  const handleSave = async (data: SaveData, photoFile?: File | null) => {
    try {
      if (editing) {
        if (!canEditItems) return;
        await updateItem.mutateAsync({ id: editing.id, ...data });
        if (photoFile) {
          const url = await uploadPhoto(photoFile, editing.id);
          if (url) await updateItem.mutateAsync({ id: editing.id, photoUrl: url });
        }
        toast({ title: 'Modelo atualizado com sucesso!' });
      } else {
        if (!canCreateItems) return;
        const newItem = await createItem.mutateAsync(data);
        if (photoFile && newItem?.id) {
          const url = await uploadPhoto(photoFile, newItem.id);
          if (url) await updateItem.mutateAsync({ id: newItem.id, photoUrl: url });
        }
        toast({ title: 'Novo modelo cadastrado!' });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast({ title: msg, variant: 'destructive' });
    }
  };
  
  // Filtragem básica por busca e categoria
  const filteredItems = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
      || i.barcode.toLowerCase().includes(search.toLowerCase())
      || (i.serialNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
      || i.model.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || i.categoryId === categoryFilter;
    return matchSearch && matchCat && i.active;
  });

  // Agrupamento por Categoria -> Modelo
  // Estrutura: CategoryID -> Array de ModelGroup
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Map<string, Item[]>>();
    
    filteredItems.forEach(item => {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, new Map());
      }
      const catMap = map.get(item.categoryId)!;
      // Chave única para o modelo
      const modelKey = `${item.name}|${item.brand}|${item.model}`;
      if (!catMap.has(modelKey)) {
        catMap.set(modelKey, []);
      }
      catMap.get(modelKey)!.push(item);
    });

    const result = new Map<string, ModelGroup[]>();
    
    map.forEach((models, catId) => {
      const modelGroups: ModelGroup[] = [];
      models.forEach((modelItems, key) => {
        const rep = modelItems[0];
        modelGroups.push({
          name: rep.name,
          brand: rep.brand,
          model: rep.model,
          categoryId: rep.categoryId,
          items: modelItems,
          totalQuantity: modelItems.reduce((acc, i) => acc + i.quantity, 0),
          requiresSerialNumber: modelItems.some(i => i.requiresSerialNumber) || !!rep.serialNumber,
          minQuantity: rep.minQuantity
        });
      });
      result.set(catId, modelGroups);
    });
    
    return result;
  }, [filteredItems]);

  const toggleModel = (modelKey: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev);
      if (next.has(modelKey)) next.delete(modelKey);
      else next.add(modelKey);
      return next;
    });
  };

  const getCategoryName = (catId: string) => {
    return categories.find(c => c.id === catId)?.name || 'Sem Categoria';
  };

  return (
    <AppLayout title="Estoque">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="page-header">
          <h2 className="page-title">Painel de Estoque</h2>
          <p className="page-subtitle">{filteredItems.length} itens controlados</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap bg-card border border-border/50 p-3 rounded-lg shadow-sm">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="input-search pl-9 h-10 w-full"
              placeholder="Pesquisar por nome, modelo ou Nº de série..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-search h-10 w-auto min-w-[200px]"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
            {categories.filter(c => c.active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Conteúdo Agrupado */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Carregando estrutura de estoque...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border border-dashed rounded-lg">
            <Package className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum registro encontrado</p>
            <p className="text-sm opacity-70">Ajuste seus filtros ou recadastre produtos.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(groupedByCategory.entries()).map(([catId, modelGroups]) => (
              <div key={catId} className="space-y-4">
                {/* Header da Categoria */}
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground border-b pb-2">
                  <Target className="h-5 w-5 text-primary" />
                  {getCategoryName(catId)}
                  <span className="text-xs font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded-full">
                    {modelGroups.length} modelos
                  </span>
                </h3>

                {/* Lista de Modelos */}
                <div className="grid grid-cols-1 gap-4">
                  {modelGroups.map(group => {
                    const uniqueKey = `${catId}-${group.name}-${group.brand}-${group.model}`;
                    const isExpanded = expandedModels.has(uniqueKey);
                    const stockStatus = group.totalQuantity === 0 ? 'Sem Estoque' : 
                                        group.totalQuantity <= group.minQuantity ? 'Estoque Baixo' : 'OK';
                    
                    const representItem = group.items[0];

                    return (
                      <div key={uniqueKey} className={cn(
                        "rounded-xl border shadow-sm transition-all overflow-hidden",
                        isExpanded ? "border-primary/40 shadow-md ring-1 ring-primary/10" : "border-border/60 bg-card hover:border-border"
                      )}>
                        {/* Linha Resumo do Modelo */}
                        <div 
                          className={cn("flex flex-col md:flex-row items-center justify-between p-4 gap-4 cursor-pointer", isExpanded && "bg-muted/30")}
                          onClick={() => toggleModel(uniqueKey)}
                        >
                          <div className="flex items-center gap-4 w-full md:w-auto">
                           {representItem.photoUrl ? (
                              <div className="h-14 w-14 rounded-lg overflow-hidden border bg-background shrink-0 shadow-sm">
                                <img src={representItem.photoUrl} alt={group.name} className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-14 w-14 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                                <Package className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                               <h4 className="font-bold text-lg leading-tight truncate">{group.name}</h4>
                               <p className="text-sm text-muted-foreground truncate">{group.brand} <span className="mx-1">•</span> {group.model}</p>
                               <div className="flex items-center gap-2 mt-1.5">
                                 {group.requiresSerialNumber ? (
                                   <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                     <Hash className="w-3 h-3 mr-1" /> Serializado
                                   </span>
                                 ) : (
                                   <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20">
                                     <Package className="w-3 h-3 mr-1" /> Controle em Lote
                                   </span>
                                 )}
                               </div>
                            </div>
                          </div>

                          <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-6">
                            <div className="flex flex-col items-center md:items-end">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Qtd Total</p>
                              <div className="flex items-baseline gap-2">
                                <span className={cn(
                                  "text-2xl font-black font-mono leading-none",
                                  group.totalQuantity === 0 ? "text-destructive" :
                                  group.totalQuantity <= group.minQuantity ? "text-warning" : "text-success"
                                )}>
                                  {group.totalQuantity}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                                  stockStatus === 'Sem Estoque' ? 'bg-destructive/10 text-destructive' :
                                  stockStatus === 'Estoque Baixo' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                                )}>
                                  {stockStatus}
                                </span>
                              </div>
                            </div>

                            <button className={cn(
                              "h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors",
                              isExpanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                            )}>
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Área Explandida - Detalhes (Componente Reutilizado e Adaptado) */}
                        {isExpanded && (
                          <div className="border-t border-border/50 bg-background/50">
                            <ItemGroupDetails items={group.items} type={group.requiresSerialNumber ? 'serial' : 'bulk'} />
                            
                            {/* Toolbar de Ações de Manutenção do Modelo */}
                            <div className="p-3 border-t border-border/50 bg-muted/20 flex justify-end gap-2">
                               <button
                                  onClick={(e) => { e.stopPropagation(); setEditing(representItem); setDialogOpen(true); }}
                                  disabled={!canEditItems}
                                  className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs font-semibold text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground transition-all disabled:opacity-40"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar Base do Produto
                                </button>
                                {/* O botão de detalhes leva para a tela específica do item base ou do modelo gerencial se houvesse */}
                                {group.requiresSerialNumber && group.items.length === 1 && (
                                   <button
                                     onClick={(e) => { e.stopPropagation(); navigate(`/estoque/${representItem.id}`); }}
                                     className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
                                   >
                                     Abrir Ficha Única
                                   </button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(canCreateItems || canEditItems) && (
        <ItemFormDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
          item={editing}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
