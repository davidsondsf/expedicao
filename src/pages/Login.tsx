import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warehouse, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) });

  const onLogin = async (data: LoginData) => {
    setError('');
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao fazer login');
    }
  };

  const onSignup = async (data: SignupData) => {
    setError('');
    setSuccessMsg('');
    try {
      await signup(data.name, data.email, data.password);
      setSuccessMsg('Conta criada! Verifique seu email para confirmar o cadastro.');
      signupForm.reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar conta');
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(145deg, hsl(220 22% 7%), hsl(220 20% 10%))',
          borderRight: '1px solid hsl(var(--border))',
        }}
      >
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
            "Rastreabilidade total do seu{' '}
            <span className="text-primary font-semibold">estoque técnico</span> com código de barras."
          </blockquote>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Itens ativos', value: '7' },
              { label: 'Categorias', value: '4' },
              { label: 'Movimentações', value: '10+' },
            ].map(stat => (
              <div
                key={stat.label}
                className="rounded-lg border border-border/50 p-3"
                style={{ background: 'hsl(var(--card))' }}
              >
                <p className="text-xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Acesse com seu email e senha cadastrados.<br />
            Novos usuários são criados com perfil <span className="font-mono text-foreground/70">OPERATOR</span>.<br />
            Contate o administrador para acesso ADMIN.
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

          <h2 className="font-bold mb-1 text-3xl text-foreground">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === 'login'
              ? 'Acesse com suas credenciais'
              : 'Preencha os dados para criar sua conta'}
          </p>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  {...loginForm.register('email')}
                  type="email"
                  className="input-search h-10 w-full"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    {...loginForm.register('password')}
                    type={showPw ? 'text' : 'password'}
                    className="input-search h-10 w-full pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loginForm.formState.isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>
                ) : 'Entrar'}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome completo</label>
                <input
                  {...signupForm.register('name')}
                  type="text"
                  className="input-search h-10 w-full"
                  placeholder="Seu nome"
                  autoComplete="name"
                />
                {signupForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-destructive">{signupForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  {...signupForm.register('email')}
                  type="email"
                  className="input-search h-10 w-full"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
                {signupForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    {...signupForm.register('password')}
                    type={showPw ? 'text' : 'password'}
                    className="input-search h-10 w-full pr-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirmar senha</label>
                <input
                  {...signupForm.register('confirmPassword')}
                  type={showPw ? 'text' : 'password'}
                  className="input-search h-10 w-full"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {successMsg && (
                <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2">
                  <p className="text-sm text-success">{successMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={signupForm.formState.isSubmitting}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {signupForm.formState.isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Criando conta...</>
                ) : 'Criar Conta'}
              </button>
            </form>
          )}

          {/* Toggle mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={switchMode}
              className="text-primary font-semibold hover:underline"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
