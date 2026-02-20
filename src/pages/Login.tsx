import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warehouse, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(3, 'Senha muito curta')
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: Required<FormData>) => {
    setError('');
    try {
      await login(data);
      navigate('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12"
      style={{
        background: 'linear-gradient(145deg, hsl(220 22% 7%), hsl(220 20% 10%))',
        borderRight: '1px solid hsl(var(--border))'
      }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Warehouse className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-foreground leading-none">GalpãoCopycentro</p>
            <p className="text-xs text-muted-foreground">Sistema de Controle de Estoque</p>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-light text-foreground/80 leading-relaxed mb-6">
            "Rastreabilidade total do seu <span className="text-primary font-semibold">estoque técnico</span> com código de barras."
          </blockquote>
          <div className="grid grid-cols-3 gap-4">
            {[
            { label: 'Itens ativos', value: '7' },
            { label: 'Categorias', value: '4' },
            { label: 'Movimentações', value: '10+' }].
            map((stat) =>
            <div key={stat.label} className="rounded-lg border border-border/50 p-3"
            style={{ background: 'hsl(var(--card))' }}>
                <p className="text-xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Credenciais de demo:<br />
            <span className="font-mono text-foreground/70">admin@galpaocopycentro.com</span> / <span className="font-mono text-foreground/70">admin123</span><br />
            <span className="font-mono text-foreground/70">joao@galpaocopycentro.com</span> / <span className="font-mono text-foreground/70">op123</span>
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Warehouse className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="font-bold text-foreground">GalpãoCopycentro</p>
          </div>

          <h2 className="font-bold mb-1 text-center text-5xl text-secondary-foreground">​Estoque  Expedição Copycentro












          
          </h2>
          <p className="text-sm text-muted-foreground mb-8">Acesse com suas credenciais</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <input {...register('email')} type="email" className="input-search h-10 w-full" placeholder="seu@email.com" autoComplete="email" />

              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Senha</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} className="input-search h-10 w-full pr-10" placeholder="••••••••" autoComplete="current-password" />

                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">

                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            }

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60">

              {isSubmitting ?
              <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </> :
              'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>);

}