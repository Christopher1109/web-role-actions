import { Bell, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header = () => {
  const location = useLocation();
  
  const getTitleFromPath = (path: string): string => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/folios': 'Folios',
      '/insumos': 'Inventario de Insumos',
      '/medicos': 'Médicos',
      '/paquetes': 'Paquetes de Anestesia',
      '/reportes': 'Reportes',
      '/traspasos': 'Traspasos entre Unidades',
      '/usuarios': 'Gestión de Usuarios',
    };
    
    return titles[path] || 'Sistema de Anestesia';
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h2 className="text-2xl font-semibold text-foreground">{getTitleFromPath(location.pathname)}</h2>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
