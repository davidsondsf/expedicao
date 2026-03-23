import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useItems } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useCreateMaleta } from '@/hooks/useMaletas';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, Trash2, Search, Filter, Package, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SelectedItem = {
  item_id: string;
  quantidade: number;
  numero_serie?: string;
  itemName: string;
  maxQty: number;
  availableQty: number;
  requiresSerialNumber: boolean;
  allowBulkMovement: boolean;
};

type ProfileOption = { user_id: string; name: string; email: string };

type LoanedItemAgg = { item_id: string; total_loaned: number; serials: string[] };

function useProfiles() {
  return useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ProfileOption[];
    },
  });
}

/** Fetch aggregated quantities currently loaned out in open/overdue maletas */
function useOpenLoanedItems() {
  return useQuery({
    queryKey: ['open-loaned-items'],
    queryFn: async () => {
      // Get open maleta IDs
      const { data: maletas, error: mErr } = await supabase
        .from('maletas_tecnicas')
        .select('id')
        .in('status', ['aberta', 'atrasada']);
      if (mErr) throw mErr;

      const openIds = (maletas ?? []).map((m: any) => m.id);
      if (openIds.length === 0) return new Map<string, LoanedItemAgg>();

      const { data: loanedItems, error: liErr } = await supabase
        .from('maleta_itens')
        .select('item_id, quantidade, numero_serie')
        .in('maleta_id', openIds);
      if (liErr) throw liErr;

      const map = new Map<string, LoanedItemAgg>();
      for (const row of (loanedItems ?? []) as any[]) {
        const existing = map.get(row.item_id) ?? { item_id: row.item_id, total_loaned: 0, serials: [] };
        existing.total_loaned += row.quantidade;
        if (row.numero_serie) existing.serials.push(row.numero_serie);
        map.set(row.item_id, existing);
      }
      return map;
    },
  });
}

export default function MaletaCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createMaleta = useCreateMaleta();
  const { data: items = [] } = useItems();
  const { data: categories = [] } = useCategories();
  const { data: profiles = [] } = useProfiles();
  const { data: loanedMap = new Map() } = useOpenLoanedItems();

  const [step, setStep] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [qtyInputMap, setQtyInputMap] = useState<Record<string, number>>({});
  const [userSearch, setUserSearch] = useState('');
  const [serialSearch, setSerialSearch] = useState('');

  // Items that are active and have had stock entries (quantity > 0 or have been moved)
  const stockItems = useMemo(() => items.filter(i => i.active), [items]);

  // Calculate effective available quantity per item (stock minus open loans minus already selected)
  const getAvailableQty = (itemId: string): number => {
    const item = stockItems.find(i => i.id === itemId);
    if (!item) return 0;
    const loaned = loanedMap.get(itemId)?.total_loaned ?? 0;
    const alreadySelected = selectedItems
      .filter(s => s.item_id === itemId)
      .reduce((sum, s) => sum + s.quantidade, 0);
    return Math.max(0, item.quantity - loaned - alreadySelected);
  };

  // Categories that have at least one available item
  const availableCategories = useMemo(
    () => categories.filter(c =>
      c.active && stockItems.some(i =>
        i.categoryId === c.id &&
        !selectedItems.some(s => s.item_id === i.id) &&
        getAvailableQty(i.id) > 0
      )
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, stockItems, selectedItems, loanedMap]
  );

  // Filtered items based on category, serial search, and availability
  const filteredItems = useMemo(() => {
    return stockItems.filter(i => {
      if (selectedCategoryId && i.categoryId !== selectedCategoryId) return false;
      if (serialSearch) {
        const search = serialSearch.toLowerCase();
        const matches =
          (i.serialNumber && i.serialNumber.toLowerCase().includes(search)) ||
          i.barcode.toLowerCase().includes(search);
        if (!matches) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockItems, selectedCategoryId, serialSearch]);

  // Split into available and unavailable
  const availableItems = useMemo(() => filteredItems.filter(i => {
    const avail = getAvailableQty(i.id);
    return avail > 0 && !selectedItems.some(s => s.item_id === i.id && (!i.allowBulkMovement || i.requiresSerialNumber));
  }), [filteredItems, selectedItems, loanedMap]);

  const unavailableItems = useMemo(() => filteredItems.filter(i => {
    const avail = getAvailableQty(i.id);
    return avail <= 0;
  }), [filteredItems, loanedMap]);

  const filteredUsers = useMemo(
    () => profiles.filter(p =>
      p.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(userSearch.toLowerCase())
    ),
    [profiles, userSearch]
  );

  // Validate serial is not already in use in open loans
  const getSerialConflict = (serial?: string): boolean => {
    if (!serial || serial.trim() === '') return false;
    for (const [, loaned] of loanedMap) {
      if (loaned.serials.includes(serial.trim())) return true;
    }
    return false;
  };

  const addItem = (item: typeof stockItems[0]) => {
    const available = getAvailableQty(item.id);
    if (available <= 0) {
      toast({ title: 'Item sem estoque disponível', variant: 'destructive' });
      return;
    }

    // For serial items, use the item's serial_number directly
    if (item.requiresSerialNumber) {
      if (!item.serialNumber) {
        toast({ title: 'Item sem nº de série cadastrado', variant: 'destructive' });
        return;
      }
      if (getSerialConflict(item.serialNumber)) {
        toast({ title: `Nº de série "${item.serialNumber}" já em empréstimo aberto`, variant: 'destructive' });
        return;
      }
      if (selectedItems.some(s => s.numero_serie === item.serialNumber)) {
        toast({ title: `Nº de série "${item.serialNumber}" já adicionado`, variant: 'destructive' });
        return;
      }
    }

    // For non-serial bulk items, check if already added (will increase qty)
    if (!item.requiresSerialNumber && item.allowBulkMovement) {
      const existing = selectedItems.find(s => s.item_id === item.id);
      if (existing) {
        const newQty = (qtyInputMap[item.id] ?? 1);
        const totalQty = existing.quantidade + newQty;
        if (totalQty > available + existing.quantidade) {
          toast({ title: 'Quantidade excede o estoque disponível', variant: 'destructive' });
          return;
        }
        setSelectedItems(prev => prev.map(s =>
          s.item_id === item.id ? { ...s, quantidade: totalQty, availableQty: available } : s
        ));
        setQtyInputMap(prev => ({ ...prev, [item.id]: 1 }));
        return;
      }
    }

    const maxQty = item.requiresSerialNumber ? 1 : (item.allowBulkMovement ? available : 1);
    const qty = item.requiresSerialNumber ? 1 : Math.max(1, Math.min(qtyInputMap[item.id] ?? 1, maxQty));

    setSelectedItems(prev => [...prev, {
      item_id: item.id,
      quantidade: qty,
      numero_serie: item.requiresSerialNumber ? item.serialNumber : undefined,
      itemName: `${item.name} (${item.barcode})`,
      maxQty,
      availableQty: available,
      requiresSerialNumber: item.requiresSerialNumber,
      allowBulkMovement: item.allowBulkMovement && !item.requiresSerialNumber,
    }]);
    setQtyInputMap(prev => ({ ...prev, [item.id]: 1 }));
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  const serialsValid = selectedItems.every(si => {
    if (!si.requiresSerialNumber) return true;
    if (!si.numero_serie || si.numero_serie.trim() === '') return false;
    return !getSerialConflict(si.numero_serie);
  });

  const canNext = step === 0
    ? !!selectedUserId
    : step === 1
      ? selectedItems.length > 0 && serialsValid
      : !!dataPrevista;

  const handleSubmit = async () => {
    if (!user) return;

    // Final validation: check all items still have stock
    for (const si of selectedItems) {
      const available = getAvailableQty(si.item_id);
      if (available + si.quantidade < si.quantidade) {
        toast({ title: `Estoque insuficiente para "${si.itemName}"`, variant: 'destructive' });
        return;
      }
      if (si.requiresSerialNumber && (!si.numero_serie || si.numero_serie.trim() === '')) {
        toast({ title: `Nº de série obrigatório para "${si.itemName}"`, variant: 'destructive' });
        return;
      }
      if (si.numero_serie && getSerialConflict(si.numero_serie)) {
        toast({ title: `Nº de série "${si.numero_serie}" já em uso em empréstimo aberto`, variant: 'destructive' });
        return;
      }
    }

    try {
      const maletaId = await createMaleta.mutateAsync({
        usuarioId: selectedUserId,
        dataPrevistaDevolucao: new Date(dataPrevista).toISOString(),
        observacoes: observacoes || undefined,
        itens: selectedItems.map(i => ({
          item_id: i.item_id,
          quantidade: i.quantidade,
          numero_serie: i.numero_serie,
        })),
        criadoPor: user.id,
      });
      toast({ title: 'Empréstimo criado com sucesso!' });
      navigate(`/maletas/${maletaId}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao criar empréstimo', variant: 'destructive' });
    }
  };

  const steps = ['Selecionar Usuário', 'Selecionar Itens', 'Confirmar'];
  const selectedUser = profiles.find(p => p.user_id === selectedUserId);

  return (
    <AppLayout title="Novo Empréstimo">
      <div className="space-y-6 max-w-3xl">
        <button onClick={() => navigate('/maletas')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-sm hidden sm:inline', i <= step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Select user */}
        {step === 0 && (
          <div className="stat-card space-y-4">
            <h3 className="text-sm font-semibold">Selecionar Usuário</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="input-search pl-8 h-9 w-full"
                placeholder="Buscar usuário..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredUsers.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => setSelectedUserId(p.user_id)}
                  className={cn(
                    'w-full text-left rounded-md border p-3 transition-colors',
                    selectedUserId === p.user_id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-primary/40'
                  )}
                >
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Select items */}
        {step === 1 && (
          <div className="stat-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Selecionar Itens do Estoque</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[250px]">
                    <p className="text-xs">Somente itens cadastrados com saldo disponível no estoque podem ser selecionados. Itens já emprestados têm o saldo reduzido.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  <Filter className="h-3 w-3 inline mr-1" />
                  Categoria
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={e => { setSelectedCategoryId(e.target.value); setSelectedItemId(''); }}
                  className="input-search h-9 w-full"
                >
                  <option value="">Todas as categorias</option>
                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  <Search className="h-3 w-3 inline mr-1" />
                  Buscar (nome, código, marca)
                </label>
                <input
                  className="input-search h-9 w-full"
                  placeholder="Pesquisar item..."
                  value={itemSearch}
                  onChange={e => { setItemSearch(e.target.value); setSelectedItemId(''); }}
                />
              </div>
            </div>

            {/* Item select */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                <Package className="h-3 w-3 inline mr-1" />
                Item disponível
              </label>
              <select
                value={selectedItemId}
                onChange={e => { setSelectedItemId(e.target.value); setSerialInput(''); setQtyInput(1); }}
                className="input-search h-9 w-full"
              >
                <option value="">Selecionar item...</option>
                {filteredItems.map(item => {
                  const avail = getAvailableQty(item.id);
                  return (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.barcode} (disponível: {avail})
                    </option>
                  );
                })}
                {unavailableItems.length > 0 && (
                  <optgroup label="── Sem estoque disponível ──">
                    {unavailableItems.map(item => (
                      <option key={item.id} value="" disabled>
                        {item.name} — {item.barcode} (indisponível)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {filteredItems.length === 0 && unavailableItems.length === 0 && (selectedCategoryId || itemSearch) && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Nenhum item encontrado com os filtros atuais.
                </p>
              )}
              {filteredItems.length === 0 && unavailableItems.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Todos os itens desta seleção estão emprestados ou sem estoque.
                </p>
              )}
            </div>

            {/* Qty + Serial + Add button — only visible when an item is selected */}
            {pendingItem && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
                <p className="text-xs font-medium text-foreground">
                  {pendingItem.name} — <span className="font-mono text-muted-foreground">{pendingItem.barcode}</span>
                </p>
                <div className="flex gap-3 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Quantidade {pendingNeedsSerial ? '(fixo: 1 — nº série)' : pendingCanBulk ? `(máx: ${pendingMaxQty})` : '(fixo: 1)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={pendingMaxQty}
                      value={qtyInput}
                      onChange={e => setQtyInput(Math.max(1, Math.min(parseInt(e.target.value) || 1, pendingMaxQty)))}
                      className="input-search h-8 w-24 mt-1"
                      disabled={!pendingCanBulk}
                    />
                  </div>
                  {(pendingNeedsSerial || serialInput) && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Nº Série {pendingNeedsSerial ? '*' : '(opcional)'}
                      </label>
                      <input
                        value={serialInput}
                        onChange={e => setSerialInput(e.target.value)}
                        className={cn(
                          'input-search h-8 w-40 mt-1',
                          (pendingNeedsSerial && !serialInput) && 'border-destructive',
                          pendingSerialConflict && 'border-destructive'
                        )}
                        placeholder={pendingNeedsSerial ? 'Obrigatório' : 'Opcional'}
                      />
                      {pendingSerialConflict && (
                        <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-0.5">
                          <AlertCircle className="h-2.5 w-2.5" />
                          Nº série já em empréstimo aberto
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={pendingNeedsSerial && (!serialInput.trim() || pendingSerialConflict)}
                    className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* Selected items list — read-only display */}
            {selectedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Itens selecionados ({selectedItems.length})
                </p>
                {selectedItems.map(si => (
                  <div key={si.item_id} className="rounded-md border border-border/50 p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <p className="text-sm font-medium truncate">{si.itemName}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Qtd: {si.quantidade}
                      </Badge>
                      {si.numero_serie && (
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          S/N: {si.numero_serie}
                        </Badge>
                      )}
                    </div>
                    <button onClick={() => removeItem(si.item_id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="stat-card space-y-4">
            <h3 className="text-sm font-semibold">Confirmar Empréstimo</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usuário</span>
                <span className="font-medium">{selectedUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens</span>
                <span className="font-medium">{selectedItems.length} item(ns)</span>
              </div>
              <div className="space-y-1">
                {selectedItems.map(si => (
                  <p key={si.item_id} className="text-xs text-muted-foreground">
                    • {si.itemName} × {si.quantidade}
                    {si.numero_serie && <span className="ml-1 font-mono">(S/N: {si.numero_serie})</span>}
                  </p>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Data prevista de devolução *</label>
                <input
                  type="date"
                  value={dataPrevista}
                  onChange={e => setDataPrevista(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-search h-9 w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  className="input-search w-full min-h-[80px] py-2"
                  placeholder="Observações sobre o empréstimo..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/maletas')}
            className="flex items-center gap-1 rounded-md border border-border px-4 h-9 text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext || createMaleta.isPending}
              className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createMaleta.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Criar Empréstimo
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
