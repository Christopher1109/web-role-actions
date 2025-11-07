import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Correo electrónico inválido" })
    .max(255, { message: "Máximo 255 caracteres" }),
  password: z.string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(100, { message: "Máximo 100 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkIfNeedsSetup();
  }, []);

  const checkIfNeedsSetup = async () => {
    try {
      // Intentar verificar si existe algún usuario gerente
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gerente')
        .limit(1);

      if (error) {
        console.error('Error checking setup:', error);
        setNeedsSetup(true);
      } else {
        setNeedsSetup(!data || data.length === 0);
      }
    } catch (error) {
      console.error('Error checking setup:', error);
      setNeedsSetup(true);
    } finally {
      setIsCheckingSetup(false);
    }
  };

  const handleSetupAdmin = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario administrador');
      }

      toast.success('¡Usuario gerente creado!', {
        description: 'Ahora puedes iniciar sesión',
      });
      
      setNeedsSetup(false);
    } catch (error: any) {
      toast.error('Error al crear usuario', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciales inválidas', {
            description: 'Verifica tu correo y contraseña',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email no confirmado', {
            description: 'Por favor confirma tu email',
          });
        } else {
          toast.error('Error al iniciar sesión', {
            description: error.message,
          });
        }
        return;
      }

      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Error inesperado', {
        description: 'Por favor intenta nuevamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sistema de Gestión de Anestesia</CardTitle>
          <CardDescription>
            {needsSetup ? 'Configuración inicial del sistema' : 'Inicia sesión con tus credenciales asignadas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsSetup ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  El sistema necesita configuración inicial. Haz clic en el botón para crear el usuario gerente.
                </AlertDescription>
              </Alert>
              
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-semibold">Credenciales del gerente:</p>
                <p className="text-sm text-muted-foreground">Email: gerente@hospital.com</p>
                <p className="text-sm text-muted-foreground">Contraseña: gerente123</p>
              </div>

              <Button 
                onClick={handleSetupAdmin} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Creando usuario...' : 'Crear Usuario Gerente'}
              </Button>
            </div>
          ) : (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Correo Electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tu@email.com"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
