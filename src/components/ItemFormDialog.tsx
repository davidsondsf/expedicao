import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { mockCategories } from '@/data/mockData';
import type { Item } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  brand: z.string().min(1, 'Marca obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
  serialNumber: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Quantidade não pode ser negativa'),
  minQuantity: z.coerce.number().min(0),
  location: z.string().min(1, 'Localização obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: (data: FormData) => void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    {children}
    {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
  </div>
);

export function ItemFormDialog({ open, onClose, item, onSave }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name, brand: item.brand, model: item.model,
        serialNumber: item.serialNumber ?? '',
        quantity: item.quantity, minQuantity: item.minQuantity,
        location: item.location, categoryId: item.categoryId,
      });
    } else {
      reset({ name: '', brand: '', model: '', serialNumber: '', quantity: 0, minQuantity: 1, location: '', categoryId: '' });
    }
  }, [item, open, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-card shadow-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">{item ? 'Editar Item' : 'Novo Item'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
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
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              {item ? 'Salvar Alterações' : 'Cadastrar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
