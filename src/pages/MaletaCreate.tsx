import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useItems } from '@/hooks/useItems';
import { useCreateMaleta } from '@/hooks/useMaletas';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type SelectedItem = { item_id: string; quantidade: number; numero_serie?: string; itemName: string; maxQty: number };
type ProfileOption = { user_id: string; name: string; email: string };

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

export default function MaletaCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createMaleta = useCreateMaleta();
  const { data: items = [] } = useItems();
  const { data: profiles = [] } = useProfiles();

  const [step, setStep] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const activeItems = useMemo(() => items.filter(i => i.active && i.quantity > 0), [items]);

  const filteredUsers = useMemo(
    () => profiles.filter(p =>
      p.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(userSearch.toLowerCase())
    ),
    [profiles, userSearch]
  );

  const filteredItems = useMemo(
    () => activeItems.filter(i =>
      !selectedItems.some(s => s.item_id === i.id) &&
      (i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.barcode.toLowerCase().includes(itemSearch.toLowerCase()))
    ),
    [activeItems, selectedItems, itemSearch]
  );

  const addItem = (itemId: string) => {
    const item = activeItems.find(i => i.id === itemId);
    if (!item) return;
    setSelectedItems(prev => [...prev, {
      item_id: item.id,
      quantidade: 1,
      itemName: `${item.name} (${item.barcode})`,
      maxQty: item.quantity,
    }]);
    setItemSearch('');
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  const updateQty = (itemId: string, qty: number) => {
    setSelectedItems(prev => prev.map(i =>
      i.item_id === itemId ? { ...i, quantidade: Math.max(1, Math.min(qty, i.maxQty)) } : i
    ));
  };

  const updateSerial = (itemId: string, serial: string) => {
    setSelectedItems(prev => prev.map(i =>
      i.item_id === itemId ? { ...i, numero_serie: serial || undefined } : i
    ));
  };

  const canNext = step === 0 ? !!selectedUserId : step === 1 ? selectedItems.length > 0 : !!dataPrevista;

  const handleSubmit = async () => {
    if (!user) return;
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
      toast({ title: 'Maleta criada com sucesso!' });
      navigate(`/maletas/${maletaId}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao criar maleta', variant: 'destructive' });
    }
  };

  const steps = ['Selecionar Usuário', 'Selecionar Itens', 'Confirmar'];
  const selectedUser = profiles.find(p => p.user_id === selectedUserId);

  return (
    <AppLayout title="Nova Maleta Técnica">
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
            <h3 className="text-sm font-semibold">Selecionar Itens</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="input-search pl-8 h-9 w-full"
                placeholder="Buscar item por nome ou código..."
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
              />
            </div>

            {itemSearch && (
              <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">Nenhum item disponível</p>
                ) : (
                  filteredItems.slice(0, 10).map(item => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item.id)}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.brand} — {item.barcode}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">Saldo: {item.quantity}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Itens selecionados</p>
                {selectedItems.map(si => (
                  <div key={si.item_id} className="rounded-md border border-border/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{si.itemName}</p>
                      <button onClick={() => removeItem(si.item_id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <div>
                        <label className="text-xs text-muted-foreground">Quantidade (máx: {si.maxQty})</label>
                        <input
                          type="number"
                          min={1}
                          max={si.maxQty}
                          value={si.quantidade}
                          onChange={e => updateQty(si.item_id, parseInt(e.target.value) || 1)}
                          className="input-search h-8 w-24 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Nº Série (opcional)</label>
                        <input
                          value={si.numero_serie ?? ''}
                          onChange={e => updateSerial(si.item_id, e.target.value)}
                          className="input-search h-8 w-40 mt-1"
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="stat-card space-y-4">
            <h3 className="text-sm font-semibold">Confirmar Maleta</h3>
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
                  <p key={si.item_id} className="text-xs text-muted-foreground">• {si.itemName} × {si.quantidade}</p>
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
              Criar Maleta
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
