import { Link } from 'react-router-dom';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Package, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface DashboardProps {
  userRole: UserRole;
}

const Dashboard = ({ userRole }: DashboardProps) => {
  const roleLabels: Record<UserRole, string> = {
    auxiliar: 'Auxiliar de Anestesia',
    almacenista: 'Almacenista',
    lider: 'Líder Hospitalario',
    supervisor: 'Supervisor Hospitalario',
    gerente: 'Gerente de Operaciones',
    gerente_operaciones: 'Gerente de Operaciones',
  };

  const stats = [
    { 
      title: 'Folios Registrados', 
      value: '248', 
      icon: FileText,
      trend: '+12%',
      visible: ['auxiliar', 'lider', 'supervisor', 'gerente', 'gerente_operaciones']
    },
    { 
      title: 'Insumos en Stock', 
      value: '1,234', 
      icon: Package,
      trend: '-5%',
      visible: ['almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones']
    },
    { 
      title: 'Procedimientos Hoy', 
      value: '18', 
      icon: TrendingUp,
      trend: '+8%',
      visible: ['auxiliar', 'lider', 'supervisor', 'gerente', 'gerente_operaciones']
    },
    { 
      title: 'Médicos Activos', 
      value: '45', 
      icon: Users,
      trend: '+3%',
      visible: ['lider', 'supervisor', 'gerente', 'gerente_operaciones']
    },
  ];

  const alerts = [
    { 
      type: 'warning', 
      message: '5 insumos próximos a caducar',
      visible: ['almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones']
    },
    { 
      type: 'info', 
      message: '3 traspasos pendientes',
      visible: ['gerente', 'gerente_operaciones']
    },
    { 
      type: 'success', 
      message: 'Todos los reportes del mes completados',
      visible: ['lider', 'supervisor', 'gerente', 'gerente_operaciones']
    },
  ];

  const filteredStats = stats.filter(stat => stat.visible.includes(userRole));
  const filteredAlerts = alerts.filter(alert => alert.visible.includes(userRole));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido, {roleLabels[userRole]}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.trend.startsWith('+') ? 'text-success' : 'text-destructive'}>
                  {stat.trend}
                </span>
                {' '}vs. mes anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas y Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {alert.type === 'warning' && <AlertCircle className="h-5 w-5 text-warning" />}
                {alert.type === 'info' && <AlertCircle className="h-5 w-5 text-primary" />}
                {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-success" />}
                <span className="text-sm">{alert.message}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay alertas en este momento</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {(userRole === 'auxiliar' || userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones') && (
              <Link to="/folios" className="rounded-lg border bg-primary/10 p-4 transition-colors hover:bg-primary/20">
                <h4 className="font-semibold">Nuevo Folio</h4>
                <p className="text-sm text-muted-foreground">Registrar procedimiento</p>
              </Link>
            )}
            {(userRole === 'almacenista' || userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones') && (
              <Link to="/insumos" className="rounded-lg border bg-primary/10 p-4 transition-colors hover:bg-primary/20">
                <h4 className="font-semibold">Registrar Insumos</h4>
                <p className="text-sm text-muted-foreground">Entrada de material</p>
              </Link>
            )}
            {(userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones') && (
              <Link to="/reportes" className="rounded-lg border bg-primary/10 p-4 transition-colors hover:bg-primary/20">
                <h4 className="font-semibold">Generar Reporte</h4>
                <p className="text-sm text-muted-foreground">Anexos T29 y T30</p>
              </Link>
            )}
            {(userRole === 'gerente' || userRole === 'gerente_operaciones') && (
              <Link to="/traspasos" className="rounded-lg border bg-primary/10 p-4 transition-colors hover:bg-primary/20">
                <h4 className="font-semibold">Gestionar Traspasos</h4>
                <p className="text-sm text-muted-foreground">Entre unidades</p>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
