import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { mockCategories } from '@/data/mockData';
import type { Item, ItemCondition } from '@/types';
import { useItemPhotoUpload } from '@/hooks/useItemPhotoUpload';
import { cn } from '@/lib/utils';

const CONDITION_OPTIONS: { value: ItemCondition; label: string; color: string }[] = [
  { value: 'new',     label: 'Novo',         color: 'text-success border-success/40 bg-success/10' },
  { value: 'good',    label: 'Bom',          color: 'text-primary border-primary/40 bg-primary/10' },
  { value: 'fair',    label: 'Regular',      color: 'text-warning border-warning/40 bg-warning/10' },
  { value: 'poor',    label: 'Ruim',         color: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  { value: 'damaged', label: 'Danificado',   color: 'text-destructive border-destructive/40 bg-destructive/10' },
];

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  brand: z.string().min(1, 'Marca obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
  serialNumber: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Quantidade não pode ser negativa'),
  minQuantity: z.coerce.number().min(0),
  location: z.string().min(1, 'Localização obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'damaged']).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: (data: FormData & { photoUrl?: string }) => void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    {children}
    {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
  </div>
);

export function ItemFormDialog({ open, onClose, item, onSave }: Props) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { uploadPhoto, uploading } = useItemPhotoUpload();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCondition = watch('condition');

  useEffect(() => {
    if (item) {
      reset({
        name: item.name, brand: item.brand, model: item.model,
        serialNumber: item.serialNumber ?? '',
        quantity: item.quantity, minQuantity: item.minQuantity,
        location: item.location, categoryId: item.categoryId,
        condition: item.condition,
      });
      setPhotoPreview(item.photoUrl ?? null);
    } else {
      reset({ name: '', brand: '', model: '', serialNumber: '', quantity: 0, minQuantity: 1, location: '', categoryId: '', condition: 'good' });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [item, open, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormData) => {
    let photoUrl = item?.photoUrl;

    if (photoFile) {
      const tempId = item?.id ?? `tmp-${Date.now()}`;
      const url = await uploadPhoto(photoFile, tempId);
      if (url) photoUrl = url;
    }

    onSave({ ...data, photoUrl });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-lg border border-border bg-card shadow-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">{item ? 'Editar Item' : 'Novo Item'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">

          {/* Foto */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Foto do Item</label>
            <div className="flex gap-3 items-start">
              {/* Preview */}
              <div
                className="relative w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-6 w-6 opacity-50" />
                    <span className="text-[10px]">Sem foto</span>
                  </div>
                )}
              </div>

              {/* Botões de upload */}
              <div className="flex flex-col gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {photoPreview ? 'Trocar foto' : 'Selecionar foto'}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                    className="h-8 px-3 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Remover foto
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP — máx 10MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Condição do item */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Condição do Item</label>
            <div className="flex gap-2 flex-wrap">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('condition', opt.value)}
                  className={cn(
                    'h-8 px-3 rounded-md text-xs font-medium border transition-all',
                    selectedCondition === opt.value
                      ? opt.color + ' ring-1 ring-current'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.condition && <p className="mt-0.5 text-xs text-destructive">{errors.condition.message}</p>}
          </div>

          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *" error={errors.name?.message}>
              <input {...register('name')} className="input-search h-9 w-full" placeholder="Ex: Papel A4 75g" />
            </Field>
            <Field label="Marca *" error={errors.brand?.message}>
              <input {...register('brand')} className="input-search h-9 w-full" placeholder="Ex: Report" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modelo *" error={errors.model?.message}>
              <input {...register('model')} className="input-search h-9 w-full" placeholder="Ex: Premium" />
            </Field>
            <Field label="Nº de Série" error={errors.serialNumber?.message}>
              <input {...register('serialNumber')} className="input-search h-9 w-full" placeholder="Opcional" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade *" error={errors.quantity?.message}>
              <input {...register('quantity')} type="number" min={0} className="input-search h-9 w-full" />
            </Field>
            <Field label="Qtd Mínima *" error={errors.minQuantity?.message}>
              <input {...register('minQuantity')} type="number" min={0} className="input-search h-9 w-full" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Localização *" error={errors.location?.message}>
              <input {...register('location')} className="input-search h-9 w-full" placeholder="Ex: Prateleira A1" />
            </Field>
            <Field label="Categoria *" error={errors.categoryId?.message}>
              <select {...register('categoryId')} className="input-search h-9 w-full">
                <option value="">Selecionar...</option>
                {mockCategories.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
            >
              {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {uploading ? 'Enviando foto...' : item ? 'Salvar Alterações' : 'Cadastrar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
