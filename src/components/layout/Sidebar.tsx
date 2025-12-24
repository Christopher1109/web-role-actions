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
  AlertTriangle,
  Warehouse,
  Truck,
  DollarSign,
  ClipboardList,
  Route,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HospitalSelector } from '@/components/HospitalSelector';

interface SidebarProps {
  userRole: UserRole;
  onLogout: () => void;
}

interface MenuItem {
  path: string;
  icon: any;
  label: string;
  roles: string[];
  category?: string;
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
    gerente_almacen: 'Gerente de Almacén',
    cadena_suministros: 'Cadena de Suministros',
    finanzas: 'Finanzas',
  };

  // Menú items con categorías para gerente_operaciones
  const menuItems: MenuItem[] = [
    // Principal - todos los roles
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['auxiliar', 'almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones', 'gerente_almacen', 'cadena_suministros', 'finanzas'], category: 'Principal' },
    
    // Operaciones (gerente_operaciones)
    { path: '/folios', icon: FileText, label: 'Folios', roles: ['auxiliar', 'lider', 'supervisor', 'gerente', 'gerente_operaciones'], category: 'Operaciones' },
    { path: '/alertas-operaciones', icon: AlertTriangle, label: 'Alertas y Necesidades', roles: ['gerente_operaciones', 'gerente_almacen', 'cadena_suministros'], category: 'Operaciones' },
    
    // Inventario Central (gerente_almacen, cadena_suministros)
    { path: '/almacen-central', icon: Warehouse, label: 'LOAD', roles: ['gerente_almacen', 'cadena_suministros'], category: 'Inventario Central' },
    { path: '/distribucion', icon: Truck, label: 'Distribución', roles: ['cadena_suministros', 'gerente_almacen'], category: 'Inventario Central' },
    { path: '/rutas-distribucion', icon: Route, label: 'Rutas de Distribución', roles: ['cadena_suministros', 'gerente_almacen'], category: 'Inventario Central' },
    
    // Inventario Hospitalario
    { path: '/almacenes-provisionales', icon: Warehouse, label: 'Almacenes Provisionales', roles: ['almacenista', 'gerente_operaciones', 'gerente_almacen', 'cadena_suministros'], category: 'Inventario' },
    { path: '/insumos', icon: Package, label: 'Insumos', roles: ['almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones', 'gerente_almacen', 'cadena_suministros'], category: 'Inventario' },
    { path: '/alertas-transferencia', icon: AlertTriangle, label: 'Recepción Insumos', roles: ['almacenista', 'lider', 'supervisor', 'gerente_operaciones', 'gerente_almacen', 'cadena_suministros'], category: 'Inventario' },
    
    // Finanzas
    { path: '/finanzas', icon: DollarSign, label: 'Pagos', roles: ['finanzas'], category: 'Finanzas' },
    { path: '/rentabilidad', icon: DollarSign, label: 'Rentabilidad', roles: ['finanzas', 'gerente_operaciones'], category: 'Finanzas' },
    { path: '/configuracion-tarifas', icon: DollarSign, label: 'Tarifas', roles: ['finanzas', 'gerente_operaciones'], category: 'Finanzas' },
    
    // Catálogos
    { path: '/medicos', icon: Users, label: 'Médicos', roles: ['lider', 'supervisor', 'gerente', 'gerente_operaciones'], category: 'Catálogos' },
    { path: '/paquetes', icon: Database, label: 'Paquetes Anestesia', roles: ['supervisor', 'gerente', 'gerente_operaciones'], category: 'Catálogos' },
    { path: '/procedimientos-hospital', icon: ClipboardList, label: 'Procedimientos', roles: ['supervisor', 'gerente', 'gerente_operaciones'], category: 'Catálogos' },
    
    // Administración
    { path: '/supervisor-asignaciones', icon: Users, label: 'Asignar Supervisores', roles: ['gerente', 'gerente_operaciones'], category: 'Administración' },
    { path: '/usuarios', icon: UserCog, label: 'Usuarios', roles: ['gerente', 'gerente_operaciones'], category: 'Administración' },
    { path: '/traspasos', icon: ArrowLeftRight, label: 'Traspasos', roles: ['gerente', 'gerente_operaciones'], category: 'Administración' },
    
    // Auditoría y Reportes
    { path: '/reportes', icon: FileSpreadsheet, label: 'Reportes', roles: ['lider', 'supervisor', 'gerente', 'gerente_operaciones'], category: 'Auditoría' },
    { path: '/registro-actividad', icon: History, label: 'Registro de Actividad', roles: ['supervisor', 'gerente_operaciones', 'gerente_almacen', 'cadena_suministros'], category: 'Auditoría' },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  // Todos los roles usan separadores por categoría
  const showCategories = true;

  // Agrupar por categoría si aplica
  const groupedItems = showCategories 
    ? filteredMenuItems.reduce((acc, item) => {
        const cat = item.category || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>)
    : { 'menu': filteredMenuItems };

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

        <nav className="space-y-1">
          {showCategories ? (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-3">
                {category !== 'Principal' && (
                  <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {category}
                  </p>
                )}
                {items.map((item) => {
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
              </div>
            ))
          ) : (
            filteredMenuItems.map((item) => {
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
            })
          )}
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