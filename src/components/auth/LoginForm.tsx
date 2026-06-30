import { useMemo, useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { ToastProvider, useToast } from '../ui/Toast';

interface FormState {
  email: string;
  password: string;
}

function LoginFormInner() {
  const [state, setState] = useState<FormState>({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const { showToast } = useToast();

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const handleChange = (field: keyof FormState, value: string) => {
    setState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<FormState> = {};

    if (!state.email.trim()) {
      nextErrors.email = 'Introduce tu correo.';
    }

    if (!state.password) {
      nextErrors.password = 'Introduce tu contraseña.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    });

    setIsSubmitting(false);

    if (error) {
      showToast({
        title: 'No se pudo iniciar sesión',
        description: error.message,
        variant: 'error',
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const fallbackName = userData.user.email ? userData.user.email.split('@')[0] : 'Usuario';
      await supabase.from('profiles').upsert({
        id: userData.user.id,
        nombre: fallbackName,
      });
    }

    showToast({
      title: 'Sesión iniciada',
      description: 'Redirigiendo al panel principal.',
      variant: 'success',
    });

    window.location.assign('/dashboard');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Acceder al panel</CardTitle>
        <CardDescription>Usa tu cuenta asignada en Supabase Auth para entrar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            autoComplete="email"
            error={errors.email}
            id="email"
            label="Email"
            onChange={(event) => handleChange('email', event.target.value)}
            placeholder="tu@email.com"
            type="email"
            value={state.email}
          />
          <Input
            autoComplete="current-password"
            error={errors.password}
            id="password"
            label="Contraseña"
            onChange={(event) => handleChange('password', event.target.value)}
            placeholder="********"
            type="password"
            value={state.password}
          />
          <Button className="w-full" isLoading={isSubmitting} type="submit">
            <LogIn className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  return (
    <ToastProvider>
      <LoginFormInner />
    </ToastProvider>
  );
}
