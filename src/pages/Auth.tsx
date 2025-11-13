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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';

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
  const navigate = useNavigate();

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

  const credenciales = {
    "Baja California - HGPMF 31": [
      { email: "lider.baja-california.hgpmf-31@imss.mx", password: "imss2024", nombre: "Líder Baja California HGPMF 31", role: "Líder" },
      { email: "auxiliar.baja-california.hgpmf-31@imss.mx", password: "imss2024", nombre: "Auxiliar Baja California HGPMF 31", role: "Auxiliar" },
      { email: "almacenista.baja-california.hgpmf-31@imss.mx", password: "imss2024", nombre: "Almacenista Baja California HGPMF 31", role: "Almacenista" },
    ],
    "Baja California - HGR 1": [
      { email: "lider.baja-california.hgr-1@imss.mx", password: "imss2024", nombre: "Líder Baja California HGR 1", role: "Líder" },
      { email: "auxiliar.baja-california.hgr-1@imss.mx", password: "imss2024", nombre: "Auxiliar Baja California HGR 1", role: "Auxiliar" },
      { email: "almacenista.baja-california.hgr-1@imss.mx", password: "imss2024", nombre: "Almacenista Baja California HGR 1", role: "Almacenista" },
    ],
    "Chihuahua - HGO 15": [
      { email: "lider.chihuahua.hgo-15@imss.mx", password: "imss2024", nombre: "Líder Chihuahua HGO 15", role: "Líder" },
      { email: "auxiliar.chihuahua.hgo-15@imss.mx", password: "imss2024", nombre: "Auxiliar Chihuahua HGO 15", role: "Auxiliar" },
      { email: "almacenista.chihuahua.hgo-15@imss.mx", password: "imss2024", nombre: "Almacenista Chihuahua HGO 15", role: "Almacenista" },
    ],
    "Jalisco - HGR 45": [
      { email: "lider.jalisco.hgr-45@imss.mx", password: "imss2024", nombre: "Líder Jalisco HGR 45", role: "Líder" },
      { email: "auxiliar.jalisco.hgr-45@imss.mx", password: "imss2024", nombre: "Auxiliar Jalisco HGR 45", role: "Auxiliar" },
      { email: "almacenista.jalisco.hgr-45@imss.mx", password: "imss2024", nombre: "Almacenista Jalisco HGR 45", role: "Almacenista" },
    ],
    "Nuevo León - HGZ 17": [
      { email: "lider.nuevo-leon.hgz-17@imss.mx", password: "imss2024", nombre: "Líder Nuevo León HGZ 17", role: "Líder" },
      { email: "auxiliar.nuevo-leon.hgz-17@imss.mx", password: "imss2024", nombre: "Auxiliar Nuevo León HGZ 17", role: "Auxiliar" },
      { email: "almacenista.nuevo-leon.hgz-17@imss.mx", password: "imss2024", nombre: "Almacenista Nuevo León HGZ 17", role: "Almacenista" },
    ],
    "Sonora - HGR 1": [
      { email: "lider.sonora.hgr-1@imss.mx", password: "imss2024", nombre: "Líder Sonora HGR 1", role: "Líder" },
      { email: "auxiliar.sonora.hgr-1@imss.mx", password: "imss2024", nombre: "Auxiliar Sonora HGR 1", role: "Auxiliar" },
      { email: "almacenista.sonora.hgr-1@imss.mx", password: "imss2024", nombre: "Almacenista Sonora HGR 1", role: "Almacenista" },
    ],
    "Gerencia y Supervisión": [
      { email: "gerente.operaciones@imss.mx", password: "imss2024", nombre: "Gerente de Operaciones", role: "Gerente" },
      { email: "supervisor.baja-california.1@imss.mx", password: "imss2024", nombre: "Supervisor Baja California 1", role: "Supervisor" },
      { email: "supervisor.jalisco.1@imss.mx", password: "imss2024", nombre: "Supervisor Jalisco 1", role: "Supervisor" },
    ],
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Sistema de Gestión de Anestesia</CardTitle>
            <CardDescription>
              Inicia sesión con tus credenciales asignadas
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credenciales de Acceso</CardTitle>
            <CardDescription>
              Usuarios registrados por unidad hospitalaria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(credenciales).map(([unidad, usuarios]) => (
                <AccordionItem key={unidad} value={unidad}>
                  <AccordionTrigger className="text-sm font-semibold">
                    {unidad} ({usuarios.length} usuarios)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {usuarios.map((user, idx) => (
                        <div key={idx} className="rounded-lg bg-muted p-3 space-y-1">
                          <p className="text-sm font-medium">{user.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Rol:</span> {user.role}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Email:</span> {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Contraseña:</span> {user.password}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
