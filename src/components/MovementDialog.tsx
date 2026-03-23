import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, TrendingUp, TrendingDown, Loader2, Upload, ImageIcon, AlertTriangle, Filter, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MovementType, ItemCondition, Category } from '@/types';

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

export interface MovementItem {
  id: string;
  name: string;
  quantity: number;
  categoryId: string;
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
  onSave: (data: MovementFormData, photoFiles?: File[]) => Promise<void>;
  items: MovementItem[];
  categories: Category[];
  loading: boolean;
}

export function MovementDialog({ open, onClose, onSave, items, categories, loading }: Props) {
  const { register, handleSubmit, watch, reset, setValue, setError, clearErrors, formState: { errors } } = useForm<MovementFormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ENTRY', quantity: 1 },
  });

  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const type = watch('type');
  const selectedCondition = watch('condition');
  const selectedItemId = watch('itemId');

  const selectedItem = items.find(i => i.id === selectedItemId);

  // Filter items by category + active + stock for EXIT
  const filteredItems = items.filter(i => {
    if (selectedCategoryId && i.categoryId !== selectedCategoryId) return false;
    // For EXIT, only show items with stock > 0
    if (type === 'EXIT' && i.quantity <= 0) return false;
    return true;
  });

  // Derive available categories (only those that have matching items)
  const availableCategories = categories.filter(c =>
    c.active && items.some(i => i.categoryId === c.id)
  );

  // When category changes, reset item selection
  useEffect(() => {
    setValue('itemId', '');
    setValue('itemId', '');
    setPhotoPreviews([]);
    setPhotoFiles([]);
  }, [selectedCategoryId, setValue]);

  // When type changes, reset if selected item has no stock for EXIT
  useEffect(() => {
    if (type === 'EXIT' && selectedItem && selectedItem.quantity <= 0) {
      setValue('itemId', '');
    }
  }, [type, selectedItem, setValue]);

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
        setPhotoPreviews([selectedItem.photoUrl]);
        setPhotoFiles([]);
      }
    }
  }, [selectedItemId, selectedItem, setValue]);

  const handleClose = () => {
    reset();
    setPhotoPreviews([]);
    setPhotoFiles([]);
    setSelectedCategoryId('');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    // Limit to exactly 50 files
    const newFiles = [...photoFiles, ...files].slice(0, 50);
    setPhotoFiles(newFiles);
    
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setPhotoPreviews(newPreviews);
  };
  
  const removePhoto = (idx: number) => {
    const updatedFiles = [...photoFiles];
    updatedFiles.splice(idx, 1);
    setPhotoFiles(updatedFiles);
    
    const updatedPreviews = [...photoPreviews];
    URL.revokeObjectURL(updatedPreviews[idx]); // Memory management
    updatedPreviews.splice(idx, 1);
    setPhotoPreviews(updatedPreviews);
  };

  const onSubmit = (data: MovementFormData) => {
    // Validate serial number requirement and uniqueness
    if (selectedItem?.requiresSerialNumber) {
      if (!data.serialNumber || data.serialNumber.trim() === '') {
        setError('serialNumber', { message: 'Nº de série obrigatório para este item' });
        return;
      }
      
      if (data.type === 'ENTRY') {
        // Anti-duplicity check: check if the serial already exists in another active item
        const duplicate = items.find(i => 
          i.serialNumber?.toLowerCase() === data.serialNumber?.toLowerCase() && 
          i.id !== selectedItem.id
        );
        if (duplicate) {
          setError('serialNumber', { message: 'Erro: Este N.S já está cadastrado em outro equipamento!' });
          return;
        }
      }
    }

    // Validate stock for EXIT
    if (data.type === 'EXIT' && selectedItem && data.quantity > selectedItem.quantity) {
      setError('quantity', { message: `Estoque insuficiente. Disponível: ${selectedItem.quantity}` });
      return;
    }
    clearErrors('serialNumber');
    onSave(data, photoFiles);
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

          {/* Categoria Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              <Filter className="h-3 w-3 inline mr-1" />
              Filtrar por Categoria
            </label>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="input-search h-9 w-full"
            >
              <option value="">Todas as categorias</option>
              {availableCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Item */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              <Package className="h-3 w-3 inline mr-1" />
              Item *
            </label>
            <select
              {...register('itemId')}
              className="input-search h-9 w-full"
            >
              <option value="">Selecionar item...</option>
              {filteredItems.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (estoque: {i.quantity})
                </option>
              ))}
            </select>
            {errors.itemId && <p className="mt-0.5 text-xs text-destructive">{errors.itemId.message}</p>}
            {filteredItems.length === 0 && selectedCategoryId && (
              <p className="mt-1 text-xs text-warning">
                Nenhum item disponível nesta categoria{type === 'EXIT' ? ' com estoque' : ''}.
              </p>
            )}
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
              {type === 'EXIT' && selectedItem && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">
                  Disponível: {selectedItem.quantity}
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
              max={type === 'EXIT' && selectedItem ? selectedItem.quantity : undefined}
              className="input-search h-9 w-full"
              disabled={selectedItem ? !selectedItem.allowBulkMovement : false}
            />
            {!selectedItem?.allowBulkMovement && selectedItem && (
              <p className="mt-0.5 text-xs text-muted-foreground">Este item só permite 1 unidade por movimentação.</p>
            )}
            {errors.quantity && <p className="mt-0.5 text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          {/* Fotos do Item / Movimentação */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Fotos / Evidências (Máx: 50)</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoFiles.length >= 50}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> Adicionar Fotos
              </button>
            </div>
            
            {/* Gallery Preview */}
            <div className="flex gap-2 flex-wrap items-start">
              {photoPreviews.length === 0 ? (
                <div 
                  className="w-full h-24 rounded-lg border-2 border-dashed bg-muted/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground/50 mb-1" />
                  <span className="text-[11px] text-muted-foreground">Tirar fotos ou enviar da galeria</span>
                </div>
              ) : (
                photoPreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-md border bg-muted/30 overflow-hidden group shrink-0">
                    <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute inset-0 bg-background/60 text-destructive opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center font-bold py-0.5">CAPA</span>}
                  </div>
                ))
              )}
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              capture="environment" 
              accept="image/jpeg,image/png,image/webp,image/gif" 
              className="hidden" 
              onChange={handleFileChange} 
            />
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
