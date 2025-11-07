import { useState } from 'react';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('auxiliar');

  const handleLogin = () => {
    onLogin(selectedRole);
  };

  const roles: { value: UserRole; label: string; description: string }[] = [
    { 
      value: 'auxiliar', 
      label: 'Auxiliar de Anestesia',
      description: 'Registra folios e insumos utilizados en procedimientos'
    },
    { 
      value: 'almacenista', 
      label: 'Almacenista',
      description: 'Gestiona inventario y registro de insumos entrantes'
    },
    { 
      value: 'lider', 
      label: 'Líder Hospitalario',
      description: 'Acceso completo a folios, insumos y reportes'
    },
    { 
      value: 'supervisor', 
      label: 'Supervisor Hospitalario',
      description: 'Gestión total de unidades asignadas'
    },
    { 
      value: 'gerente', 
      label: 'Gerente de Operaciones',
      description: 'Control total del sistema y traspasos entre unidades'
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sistema de Gestión de Anestesia</CardTitle>
          <CardDescription>
            Selecciona tu perfil para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Perfil de Usuario</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger id="role">
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
            <p className="text-sm text-muted-foreground">
              {roles.find(r => r.value === selectedRole)?.description}
            </p>
          </div>

          <Button className="w-full" onClick={handleLogin}>
            Iniciar Sesión
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Sistema de demostración - En producción usar autenticación real
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
