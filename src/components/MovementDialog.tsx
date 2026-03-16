import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, TrendingUp, TrendingDown, Loader2, Upload, ImageIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MovementType, ItemCondition } from '@/types';

const CONDITION_OPTIONS: { value: ItemCondition; label: string; color: string }[] = [
  { value: 'new',     label: 'Novo',         color: 'text-success border-success/40 bg-success/10' },
  { value: 'good',    label: 'Bom',          color: 'text-primary border-primary/40 bg-primary/10' },
  { value: 'fair',    label: 'Regular',      color: 'text-warning border-warning/40 bg-warning/10' },
  { value: 'poor',    label: 'Ruim',         color: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  { value: 'damaged', label: 'Danificado',   color: 'text-destructive border-destructive/40 bg-destructive/10' },
];

const schema = z.object({
  type: z.enum(['ENTRY', 'EXIT']),
  itemId: z.string().min(1, 'Selecione um item'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  note: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'damaged']).optional(),
});

export type MovementFormData = z.infer<typeof schema>;

interface MovementItem {
  id: string;
  name: string;
  quantity: number;
  photoUrl?: string;
  condition?: ItemCondition;
  serialNumber?: string;
  location: string;
  requiresSerialNumber: boolean;
  allowBulkMovement: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: MovementFormData, photoFile?: File | null) => Promise<void>;
  items: MovementItem[];
  loading: boolean;
}

export function MovementDialog({ open, onClose, onSave, items, loading }: Props) {
  const { register, handleSubmit, watch, reset, setValue, setError, clearErrors, formState: { errors } } = useForm<MovementFormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ENTRY', quantity: 1 },
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const type = watch('type');
  const selectedCondition = watch('condition');
  const selectedItemId = watch('itemId');

  const selectedItem = items.find(i => i.id === selectedItemId);

  // When item changes, enforce flags
  useEffect(() => {
    if (selectedItem) {
      if (!selectedItem.allowBulkMovement) {
        setValue('quantity', 1);
      }
      if (selectedItem.serialNumber) setValue('serialNumber', selectedItem.serialNumber);
      if (selectedItem.location) setValue('location', selectedItem.location);
      if (selectedItem.condition) setValue('condition', selectedItem.condition);
      if (selectedItem.photoUrl) {
        setPhotoPreview(selectedItem.photoUrl);
        setPhotoFile(null);
      }
    }
  }, [selectedItemId]);

  const handleClose = () => {
    reset();
    setPhotoPreview(null);
    setPhotoFile(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: MovementFormData) => {
    // Validate serial number requirement
    if (selectedItem?.requiresSerialNumber && (!data.serialNumber || data.serialNumber.trim() === '')) {
      setError('serialNumber', { message: 'Nº de série obrigatório para este item' });
      return;
    }
    clearErrors('serialNumber');
    onSave(data, photoFile);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-card shadow-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">Registrar Movimentação</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ENTRY', 'EXIT'] as MovementType[]).map(t => (
                <label key={t} className={cn(
                  'flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors',
                  type === t
                    ? t === 'ENTRY' ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'
                    : 'border-border hover:bg-muted'
                )}>
                  <input {...register('type')} type="radio" value={t} className="sr-only" />
                  {t === 'ENTRY' ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                  <span className="text-sm font-medium">{t === 'ENTRY' ? 'Entrada' : 'Saída'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Item */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Item *</label>
            <select
              {...register('itemId')}
              className="input-search h-9 w-full"
            >
              <option value="">Selecionar item...</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} (estoque: {i.quantity})</option>
              ))}
            </select>
            {errors.itemId && <p className="mt-0.5 text-xs text-destructive">{errors.itemId.message}</p>}
          </div>

          {/* Info badges about item rules */}
          {selectedItem && (
            <div className="flex gap-2 flex-wrap">
              {selectedItem.requiresSerialNumber && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/30">
                  <AlertTriangle className="h-3 w-3" /> Nº de série obrigatório
                </span>
              )}
              {!selectedItem.allowBulkMovement && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                  Quantidade fixa: 1
                </span>
              )}
            </div>
          )}

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantidade *</label>
            <input
              {...register('quantity')}
              type="number"
              min={1}
              className="input-search h-9 w-full"
              disabled={selectedItem ? !selectedItem.allowBulkMovement : false}
            />
            {!selectedItem?.allowBulkMovement && selectedItem && (
              <p className="mt-0.5 text-xs text-muted-foreground">Este item só permite 1 unidade por movimentação.</p>
            )}
            {errors.quantity && <p className="mt-0.5 text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          {/* Foto do Item */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Foto do Item</label>
            <div className="flex gap-3 items-start">
              <div
                className="relative w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-5 w-5 opacity-50" />
                    <span className="text-[10px]">Sem foto</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  {photoPreview ? 'Trocar' : 'Selecionar'}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                    className="h-7 px-2.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* Condição do Item */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Condição do Item</label>
            <div className="flex gap-1.5 flex-wrap">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('condition', opt.value)}
                  className={cn(
                    'h-7 px-2.5 rounded-md text-xs font-medium border transition-all',
                    selectedCondition === opt.value
                      ? opt.color + ' ring-1 ring-current'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Serial + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nº de Série {selectedItem?.requiresSerialNumber ? '*' : ''}
              </label>
              <input
                {...register('serialNumber')}
                className={cn('input-search h-9 w-full', errors.serialNumber && 'border-destructive')}
                placeholder={selectedItem?.requiresSerialNumber ? 'Obrigatório' : 'Opcional'}
              />
              {errors.serialNumber && <p className="mt-0.5 text-xs text-destructive">{errors.serialNumber.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Localização</label>
              <input {...register('location')} className="input-search h-9 w-full" placeholder="Ex: Prateleira A1" />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Observação</label>
            <textarea {...register('note')} className="input-search w-full h-16 py-2 resize-none" placeholder="Motivo ou observação..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
