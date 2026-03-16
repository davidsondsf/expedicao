import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import type { Item } from '@/types';
import { useCategories } from '@/hooks/useCategories';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  brand: z.string().min(1, 'Marca obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  requiresSerialNumber: z.boolean(),
  allowBulkMovement: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: (data: FormData) => Promise<void> | void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    {children}
    {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
  </div>
);

export function ItemFormDialog({ open, onClose, item, onSave }: Props) {
  const { data: categories = [] } = useCategories();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name, brand: item.brand, model: item.model,
        categoryId: item.categoryId,
        requiresSerialNumber: item.requiresSerialNumber ?? false,
        allowBulkMovement: item.allowBulkMovement ?? true,
      });
    } else {
      reset({ name: '', brand: '', model: '', categoryId: '', requiresSerialNumber: false, allowBulkMovement: true });
    }
  }, [item, open, reset]);

  const onSubmit = async (data: FormData) => {
    onSave(data);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-lg border border-border bg-card shadow-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">{item ? 'Editar Item' : 'Novo Item'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
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
            <Field label="Categoria *" error={errors.categoryId?.message}>
              <select {...register('categoryId')} className="input-search h-9 w-full">
                <option value="">Selecionar...</option>
                {categories.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Flags de regras de movimentação */}
          <div className="space-y-3 rounded-md border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regras de Movimentação</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                {...register('requiresSerialNumber')}
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium group-hover:text-foreground transition-colors">Exigir Nº de Série</p>
                <p className="text-xs text-muted-foreground">O número de série será obrigatório em cada movimentação deste item.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                {...register('allowBulkMovement')}
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium group-hover:text-foreground transition-colors">Permitir múltiplas unidades por movimentação</p>
                <p className="text-xs text-muted-foreground">Se desativado, a quantidade será fixada em 1 por movimentação.</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {item ? 'Salvar Alterações' : 'Cadastrar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
