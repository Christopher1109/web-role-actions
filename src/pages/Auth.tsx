import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserRole } from '@/types';

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Correo electrónico inválido" })
    .max(255, { message: "Máximo 255 caracteres" }),
  password: z.string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(100, { message: "Máximo 100 caracteres" }),
});

const signupSchema = loginSchema.extend({
  nombreCompleto: z.string()
    .trim()
    .nonempty({ message: "El nombre completo es requerido" })
    .max(200, { message: "Máximo 200 caracteres" }),
  role: z.enum(['auxiliar', 'almacenista', 'lider', 'supervisor', 'gerente'], {
    message: "Selecciona un rol válido"
  }),
  unidad: z.string()
    .trim()
    .nonempty({ message: "Selecciona una unidad" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'auxiliar',
      unidad: 'Unidad Central',
    }
  });

  const roles: { value: UserRole; label: string; description: string }[] = [
    { 
      value: 'auxiliar', 
      label: 'Auxiliar de Anestesia',
      description: 'Registra folios e insumos'
    },
    { 
      value: 'almacenista', 
      label: 'Almacenista',
      description: 'Gestiona inventario'
    },
    { 
      value: 'lider', 
      label: 'Líder Hospitalario',
      description: 'Acceso a folios, insumos y reportes'
    },
    { 
      value: 'supervisor', 
      label: 'Supervisor Hospitalario',
      description: 'Gestión completa de unidades'
    },
    { 
      value: 'gerente', 
      label: 'Gerente de Operaciones',
      description: 'Control total del sistema'
    },
  ];

  const unidades = ['Unidad Central', 'Unidad Norte', 'Unidad Sur', 'Unidad Este'];

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

  const handleSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nombre_completo: data.nombreCompleto,
            role: data.role,
            unidad: data.unidad,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Usuario ya registrado', {
            description: 'Este correo ya está en uso',
          });
        } else {
          toast.error('Error al registrarse', {
            description: error.message,
          });
        }
        return;
      }

      toast.success('¡Registro exitoso!', {
        description: 'Ya puedes iniciar sesión',
      });
      
      // Cambiar a la pestaña de login
      const loginTab = document.querySelector('[value="login"]');
      if (loginTab instanceof HTMLElement) {
        loginTab.click();
      }
    } catch (error) {
      toast.error('Error inesperado', {
        description: 'Por favor intenta nuevamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sistema de Gestión de Anestesia</CardTitle>
          <CardDescription>
            Inicia sesión o regístrate para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nombre">Nombre Completo</Label>
                  <Input
                    id="signup-nombre"
                    type="text"
                    placeholder="Juan Pérez García"
                    {...signupForm.register('nombreCompleto')}
                  />
                  {signupForm.formState.errors.nombreCompleto && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.nombreCompleto.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tu@email.com"
                    {...signupForm.register('email')}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    {...signupForm.register('password')}
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-role">Rol en el Sistema</Label>
                  <Select
                    onValueChange={(value) => signupForm.setValue('role', value as UserRole)}
                    defaultValue="auxiliar"
                  >
                    <SelectTrigger id="signup-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {roles.find(r => r.value === signupForm.watch('role'))?.description}
                  </p>
                  {signupForm.formState.errors.role && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.role.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-unidad">Unidad</Label>
                  <Select
                    onValueChange={(value) => signupForm.setValue('unidad', value)}
                    defaultValue="Unidad Central"
                  >
                    <SelectTrigger id="signup-unidad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidad) => (
                        <SelectItem key={unidad} value={unidad}>
                          {unidad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {signupForm.formState.errors.unidad && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.unidad.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Registrando...' : 'Registrarse'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
