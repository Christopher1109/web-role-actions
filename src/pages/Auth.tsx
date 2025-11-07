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
    "Unidad Central": [
      { email: "gerente.central@hospital.com", password: "gerente123", nombre: "María González García", role: "Gerente" },
      { email: "supervisor.central@hospital.com", password: "supervisor123", nombre: "Carlos Ramírez López", role: "Supervisor" },
      { email: "lider.central@hospital.com", password: "lider123", nombre: "Ana Martínez Sánchez", role: "Líder" },
      { email: "almacenista1.central@hospital.com", password: "almacen123", nombre: "José Torres Flores", role: "Almacenista" },
      { email: "almacenista2.central@hospital.com", password: "almacen456", nombre: "Laura Hernández Cruz", role: "Almacenista" },
      { email: "auxiliar1.central@hospital.com", password: "auxiliar123", nombre: "Roberto Jiménez Ruiz", role: "Auxiliar" },
      { email: "auxiliar2.central@hospital.com", password: "auxiliar456", nombre: "Patricia Morales Díaz", role: "Auxiliar" },
      { email: "auxiliar3.central@hospital.com", password: "auxiliar789", nombre: "Miguel Ángel Pérez", role: "Auxiliar" },
      { email: "auxiliar4.central@hospital.com", password: "auxiliar321", nombre: "Sandra López Vega", role: "Auxiliar" },
      { email: "auxiliar5.central@hospital.com", password: "auxiliar654", nombre: "Fernando Castillo Reyes", role: "Auxiliar" },
    ],
    "Unidad Norte": [
      { email: "supervisor.norte@hospital.com", password: "supervisor123", nombre: "Ricardo Mendoza Silva", role: "Supervisor" },
      { email: "lider.norte@hospital.com", password: "lider123", nombre: "Gabriela Ramos Ortiz", role: "Líder" },
      { email: "almacenista1.norte@hospital.com", password: "almacen123", nombre: "Luis Alberto García", role: "Almacenista" },
      { email: "almacenista2.norte@hospital.com", password: "almacen456", nombre: "Carmen Zavala Torres", role: "Almacenista" },
      { email: "auxiliar1.norte@hospital.com", password: "auxiliar123", nombre: "Andrés Soto Vargas", role: "Auxiliar" },
      { email: "auxiliar2.norte@hospital.com", password: "auxiliar456", nombre: "Mónica Guerrero León", role: "Auxiliar" },
      { email: "auxiliar3.norte@hospital.com", password: "auxiliar789", nombre: "Daniel Campos Rojas", role: "Auxiliar" },
      { email: "auxiliar4.norte@hospital.com", password: "auxiliar321", nombre: "Verónica Navarro Ruiz", role: "Auxiliar" },
      { email: "auxiliar5.norte@hospital.com", password: "auxiliar654", nombre: "Pablo Domínguez Cruz", role: "Auxiliar" },
      { email: "auxiliar6.norte@hospital.com", password: "auxiliar987", nombre: "Isabel Aguilar Santos", role: "Auxiliar" },
    ],
    "Unidad Sur": [
      { email: "supervisor.sur@hospital.com", password: "supervisor123", nombre: "Eduardo Vázquez Luna", role: "Supervisor" },
      { email: "lider.sur@hospital.com", password: "lider123", nombre: "Rosa María Delgado", role: "Líder" },
      { email: "almacenista1.sur@hospital.com", password: "almacen123", nombre: "Jorge Medina Castro", role: "Almacenista" },
      { email: "almacenista2.sur@hospital.com", password: "almacen456", nombre: "Teresa Pacheco Gómez", role: "Almacenista" },
      { email: "auxiliar1.sur@hospital.com", password: "auxiliar123", nombre: "Alberto Núñez Molina", role: "Auxiliar" },
      { email: "auxiliar2.sur@hospital.com", password: "auxiliar456", nombre: "Beatriz Salazar Rivas", role: "Auxiliar" },
      { email: "auxiliar3.sur@hospital.com", password: "auxiliar789", nombre: "Héctor Fuentes Ortega", role: "Auxiliar" },
      { email: "auxiliar4.sur@hospital.com", password: "auxiliar321", nombre: "Adriana Guzmán Peña", role: "Auxiliar" },
      { email: "auxiliar5.sur@hospital.com", password: "auxiliar654", nombre: "Raúl Cervantes Valle", role: "Auxiliar" },
      { email: "auxiliar6.sur@hospital.com", password: "auxiliar987", nombre: "Claudia Ríos Paredes", role: "Auxiliar" },
    ],
    "Unidad Este": [
      { email: "supervisor.este@hospital.com", password: "supervisor123", nombre: "Francisco Ibarra León", role: "Supervisor" },
      { email: "lider.este@hospital.com", password: "lider123", nombre: "Silvia Rojas Herrera", role: "Líder" },
      { email: "almacenista1.este@hospital.com", password: "almacen123", nombre: "Arturo Valdez Soto", role: "Almacenista" },
      { email: "almacenista2.este@hospital.com", password: "almacen456", nombre: "Norma Sandoval Mejía", role: "Almacenista" },
      { email: "auxiliar1.este@hospital.com", password: "auxiliar123", nombre: "Sergio Benitez Mata", role: "Auxiliar" },
      { email: "auxiliar2.este@hospital.com", password: "auxiliar456", nombre: "Diana Coronado Luna", role: "Auxiliar" },
      { email: "auxiliar3.este@hospital.com", password: "auxiliar789", nombre: "Guillermo Montes Lara", role: "Auxiliar" },
      { email: "auxiliar4.este@hospital.com", password: "auxiliar321", nombre: "Mariana Acosta Téllez", role: "Auxiliar" },
      { email: "auxiliar5.este@hospital.com", password: "auxiliar654", nombre: "Omar Villanueva Parra", role: "Auxiliar" },
      { email: "auxiliar6.este@hospital.com", password: "auxiliar987", nombre: "Liliana Espinoza Bravo", role: "Auxiliar" },
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
