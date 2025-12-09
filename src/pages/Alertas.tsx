import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AlertTriangle, Bell, Send, CheckCircle, Package, TrendingDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Alerta {
  id: string;
  hospital_id: string;
  insumo_catalogo_id: string;
  inventario_id: string | null;
  cantidad_actual: number;
  minimo_permitido: number;
  enviado_a_supervisor: boolean;
  enviado_a_gerente_operaciones: boolean;
  estado: string;
  prioridad: string;
  notas: string | null;
  created_at: string;
  resuelto_at: string | null;
  resuelto_por: string | null;
  insumo?: {
    nombre: string;
    clave: string;
  };
  hospital?: {
    display_name: string;
  };
}

const prioridadColors: Record<string, string> = {
  critica: 'bg-red-500 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-yellow-500 text-black',
  baja: 'bg-green-500 text-white',
};

const estadoColors: Record<string, string> = {
  activa: 'bg-red-100 text-red-800 border-red-300',
  resuelta: 'bg-green-100 text-green-800 border-green-300',
  cancelada: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function Alertas() {
  const { user, userRole } = useAuth();
  const { selectedHospital } = useHospital();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    criticas: 0,
    altas: 0,
    pendientesEnvio: 0,
  });

  const canSendAlerts = ['almacenista', 'lider', 'supervisor', 'gerente', 'gerente_operaciones'].includes(userRole || '');
  const isGerente = ['gerente', 'gerente_operaciones'].includes(userRole || '');

  useEffect(() => {
    fetchAlertas();
  }, [selectedHospital, userRole]);

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('insumos_alertas')
        .select(`
          *,
          insumo:insumos_catalogo(nombre, clave),
          hospital:hospitales(display_name)
        `)
        .order('created_at', { ascending: false });

      // Si no es gerente, filtrar por hospital
      if (!isGerente && selectedHospital) {
        query = query.eq('hospital_id', selectedHospital.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const alertasData = (data || []) as unknown as Alerta[];
      setAlertas(alertasData);

      // Calcular estadísticas
      const activas = alertasData.filter(a => a.estado === 'activa');
      setStats({
        total: activas.length,
        criticas: activas.filter(a => a.prioridad === 'critica').length,
        altas: activas.filter(a => a.prioridad === 'alta').length,
        pendientesEnvio: activas.filter(a => !a.enviado_a_supervisor || !a.enviado_a_gerente_operaciones).length,
      });
    } catch (error) {
      console.error('Error fetching alertas:', error);
      toast.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarAlerta = async (alertaId: string) => {
    try {
      const { error } = await supabase
        .from('insumos_alertas')
        .update({
          enviado_a_supervisor: true,
          enviado_a_gerente_operaciones: true,
        })
        .eq('id', alertaId);

      if (error) throw error;

      toast.success('Alerta enviada a Supervisor y Gerente de Operaciones');
      fetchAlertas();
    } catch (error) {
      console.error('Error sending alert:', error);
      toast.error('Error al enviar alerta');
    }
  };

  const handleResolverAlerta = async (alertaId: string) => {
    try {
      const { error } = await supabase
        .from('insumos_alertas')
        .update({
          estado: 'resuelta',
          resuelto_at: new Date().toISOString(),
          resuelto_por: user?.id,
        })
        .eq('id', alertaId);

      if (error) throw error;

      toast.success('Alerta marcada como resuelta');
      fetchAlertas();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Error al resolver alerta');
    }
  };

  const alertasActivas = alertas.filter(a => a.estado === 'activa');
  const alertasResueltas = alertas.filter(a => a.estado === 'resuelta');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Alertas de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            {isGerente ? 'Vista global de todos los hospitales' : `Hospital: ${selectedHospital?.display_name || 'No seleccionado'}`}
          </p>
        </div>
        <Button onClick={fetchAlertas} variant="outline">
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.criticas}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Alta Prioridad</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.altas}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Pendientes de Envío</CardTitle>
            <Send className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.pendientesEnvio}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activas" className="w-full">
        <TabsList>
          <TabsTrigger value="activas">
            Activas ({alertasActivas.length})
          </TabsTrigger>
          <TabsTrigger value="resueltas">
            Resueltas ({alertasResueltas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando alertas...</div>
              ) : alertasActivas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <p>No hay alertas activas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prioridad</TableHead>
                      {isGerente && <TableHead>Hospital</TableHead>}
                      <TableHead>Insumo</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead className="text-center">Actual</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead className="text-center">Estado Envío</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasActivas.map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell>
                          <Badge className={prioridadColors[alerta.prioridad]}>
                            {alerta.prioridad.toUpperCase()}
                          </Badge>
                        </TableCell>
                        {isGerente && (
                          <TableCell className="font-medium">
                            {alerta.hospital?.display_name || 'N/A'}
                          </TableCell>
                        )}
                        <TableCell>{alerta.insumo?.nombre || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm">{alerta.insumo?.clave || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          <span className={alerta.cantidad_actual === 0 ? 'text-red-600 font-bold' : ''}>
                            {alerta.cantidad_actual}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{alerta.minimo_permitido}</TableCell>
                        <TableCell className="text-center">
                          {alerta.enviado_a_supervisor && alerta.enviado_a_gerente_operaciones ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(alerta.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {canSendAlerts && !alerta.enviado_a_supervisor && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEnviarAlerta(alerta.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Enviar
                              </Button>
                            )}
                            {canSendAlerts && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResolverAlerta(alerta.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolver
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resueltas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {alertasResueltas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay alertas resueltas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prioridad Original</TableHead>
                      {isGerente && <TableHead>Hospital</TableHead>}
                      <TableHead>Insumo</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead>Fecha Resolución</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasResueltas.map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell>
                          <Badge variant="outline" className={estadoColors.resuelta}>
                            {alerta.prioridad}
                          </Badge>
                        </TableCell>
                        {isGerente && (
                          <TableCell>{alerta.hospital?.display_name || 'N/A'}</TableCell>
                        )}
                        <TableCell>{alerta.insumo?.nombre || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(alerta.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {alerta.resuelto_at ? new Date(alerta.resuelto_at).toLocaleDateString('es-MX') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
