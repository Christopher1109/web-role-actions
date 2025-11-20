import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  FileSpreadsheet,
  ArrowLeftRight,
  Database,
  LogOut,
  UserCog,
  Upload,
  Download,
  History,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HospitalSelector } from '@/components/HospitalSelector';

interface SidebarProps {
  userRole: UserRole;
  onLogout: () => void;
}

const Sidebar = ({ userRole, onLogout }: SidebarProps) => {
  const location = useLocation();

  const roleLabels: Record<UserRole, string> = {
    auxiliar: 'Auxiliar de Anestesia',
    almacenista: 'Almacenista',
    lider: 'Líder Hospitalario',
    supervisor: 'Supervisor Hospitalario',
    gerente: 'Gerente de Operaciones',
    gerente_operaciones: 'Gerente de Operaciones',
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['auxiliar', 'almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/folios', icon: FileText, label: 'Folios', roles: ['auxiliar', 'lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/insumos', icon: Package, label: 'Insumos', roles: ['almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/kardex', icon: History, label: 'Kardex', roles: ['almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/medicos', icon: Users, label: 'Médicos', roles: ['lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/paquetes', icon: Database, label: 'Paquetes Anestesia', roles: ['lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/reportes', icon: FileSpreadsheet, label: 'Reportes', roles: ['lider', 'supervisor', 'gerente', 'gerente_operaciones'] },
    { path: '/traspasos', icon: ArrowLeftRight, label: 'Traspasos', roles: ['gerente', 'gerente_operaciones'] },
    { path: '/usuarios', icon: UserCog, label: 'Usuarios', roles: ['gerente', 'gerente_operaciones'] },
    { path: '/diagnostico-insumos', icon: Search, label: 'Diagnóstico Insumos', roles: ['gerente', 'gerente_operaciones'] },
    { path: '/export-users', icon: Download, label: 'Exportar Usuarios', roles: ['gerente', 'gerente_operaciones'] },
    { path: '/import-setup', icon: Upload, label: 'Importar Sistema', roles: ['gerente', 'gerente_operaciones'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h1 className="text-xl font-bold text-sidebar-primary">Sistema Anestesia</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 rounded-lg bg-sidebar-accent p-3">
          <p className="text-xs text-sidebar-accent-foreground/70">Usuario actual</p>
          <p className="font-semibold text-sidebar-accent-foreground">{roleLabels[userRole]}</p>
        </div>

        <div className="mb-3">
          <HospitalSelector />
        </div>

        <nav className="space-y-1">{filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
