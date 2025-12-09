import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Building2, 
  AlertTriangle, 
  Package, 
  FileDown, 
  TrendingDown,
  CheckCircle,
  Clock,
  FileText,
  Send,
  BarChart3
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface HospitalStats {
  id: string;
  display_name: string;
  alertas_criticas: number;
  alertas_altas: number;
  alertas_total: number;
}

interface AlertaConsolidada {
  id: string;
  hospital_id: string;
  hospital_name: string;
  insumo_id: string;
  insumo_nombre: string;
  insumo_clave: string;
  cantidad_actual: number;
  minimo: number;
  cantidad_requerida: number;
  prioridad: string;
  selected: boolean;
}

interface FormatoGenerado {
  id: string;
  tipo: string;
  created_at: string;
  estado: string;
  data_json: Record<string, unknown>;
}

const prioridadColors: Record<string, string> = {
  critica: 'bg-red-500 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-yellow-500 text-black',
  baja: 'bg-green-500 text-white',
};

export default function GerenteOperacionesDashboard() {
  const { user } = useAuth();
  const [hospitalStats, setHospitalStats] = useState<HospitalStats[]>([]);
  const [alertasConsolidadas, setAlertasConsolidadas] = useState<AlertaConsolidada[]>([]);
  const [formatosGenerados, setFormatosGenerados] = useState<FormatoGenerado[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFormat, setGeneratingFormat] = useState(false);
  const [stats, setStats] = useState({
    totalHospitales: 0,
    hospitalesConAlertas: 0,
    alertasCriticas: 0,
    alertasAltas: 0,
    alertasTotales: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchHospitalStats(),
      fetchAlertasConsolidadas(),
      fetchFormatosGenerados(),
    ]);
    setLoading(false);
  };

  const fetchHospitalStats = async () => {
    try {
      // Obtener hospitales
      const { data: hospitales, error: hospError } = await supabase
        .from('hospitales')
        .select('id, display_name');

      if (hospError) throw hospError;

      // Obtener alertas activas
      const { data: alertas, error: alertError } = await supabase
        .from('insumos_alertas')
        .select('hospital_id, prioridad')
        .eq('estado', 'activa');

      if (alertError) throw alertError;

      // Calcular stats por hospital
      const statsMap = new Map<string, HospitalStats>();
      
      (hospitales || []).forEach(h => {
        statsMap.set(h.id, {
          id: h.id,
          display_name: h.display_name || 'Sin nombre',
          alertas_criticas: 0,
          alertas_altas: 0,
          alertas_total: 0,
        });
      });

      (alertas || []).forEach(a => {
        const stat = statsMap.get(a.hospital_id);
        if (stat) {
          stat.alertas_total++;
          if (a.prioridad === 'critica') stat.alertas_criticas++;
          if (a.prioridad === 'alta') stat.alertas_altas++;
        }
      });

      const statsArray = Array.from(statsMap.values())
        .sort((a, b) => b.alertas_total - a.alertas_total);

      setHospitalStats(statsArray);

      // Stats globales
      const hospitalesConAlertas = statsArray.filter(h => h.alertas_total > 0).length;
      setStats({
        totalHospitales: statsArray.length,
        hospitalesConAlertas,
        alertasCriticas: statsArray.reduce((sum, h) => sum + h.alertas_criticas, 0),
        alertasAltas: statsArray.reduce((sum, h) => sum + h.alertas_altas, 0),
        alertasTotales: statsArray.reduce((sum, h) => sum + h.alertas_total, 0),
      });
    } catch (error) {
      console.error('Error fetching hospital stats:', error);
      toast.error('Error al cargar estadísticas');
    }
  };

  const fetchAlertasConsolidadas = async () => {
    try {
      const { data, error } = await supabase
        .from('insumos_alertas')
        .select(`
          id,
          hospital_id,
          insumo_catalogo_id,
          cantidad_actual,
          minimo_permitido,
          prioridad,
          hospital:hospitales(display_name),
          insumo:insumos_catalogo(nombre, clave)
        `)
        .eq('estado', 'activa')
        .eq('enviado_a_gerente_operaciones', true)
        .order('prioridad', { ascending: true });

      if (error) throw error;

      const consolidadas: AlertaConsolidada[] = (data || []).map((a: any) => ({
        id: a.id,
        hospital_id: a.hospital_id,
        hospital_name: a.hospital?.display_name || 'N/A',
        insumo_id: a.insumo_catalogo_id,
        insumo_nombre: a.insumo?.nombre || 'N/A',
        insumo_clave: a.insumo?.clave || 'N/A',
        cantidad_actual: a.cantidad_actual,
        minimo: a.minimo_permitido,
        cantidad_requerida: Math.max(0, a.minimo_permitido - a.cantidad_actual + 10), // Solicitar mínimo + 10 de buffer
        prioridad: a.prioridad,
        selected: true, // Por defecto seleccionadas
      }));

      setAlertasConsolidadas(consolidadas);
    } catch (error) {
      console.error('Error fetching alertas consolidadas:', error);
    }
  };

  const fetchFormatosGenerados = async () => {
    try {
      const { data, error } = await supabase
        .from('formatos_generados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setFormatosGenerados((data || []) as FormatoGenerado[]);
    } catch (error) {
      console.error('Error fetching formatos:', error);
    }
  };

  const toggleAlertaSelection = (id: string) => {
    setAlertasConsolidadas(prev =>
      prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  };

  const selectAll = (selected: boolean) => {
    setAlertasConsolidadas(prev => prev.map(a => ({ ...a, selected })));
  };

  const generarFormatoCadenaSuministro = async () => {
    const seleccionadas = alertasConsolidadas.filter(a => a.selected);
    if (seleccionadas.length === 0) {
      toast.error('Selecciona al menos una alerta');
      return;
    }

    setGeneratingFormat(true);
    try {
      // Agrupar por hospital
      const porHospital: Record<string, Array<{ insumo: string; clave: string; cantidad: number }>> = {};
      
      seleccionadas.forEach(a => {
        if (!porHospital[a.hospital_name]) {
          porHospital[a.hospital_name] = [];
        }
        porHospital[a.hospital_name].push({
          insumo: a.insumo_nombre,
          clave: a.insumo_clave,
          cantidad: a.cantidad_requerida,
        });
      });

      const dataJson = {
        fecha_generacion: new Date().toISOString(),
        total_hospitales: Object.keys(porHospital).length,
        total_insumos: seleccionadas.length,
        requerimientos_por_hospital: porHospital,
      };

      // Guardar en BD
      const { error } = await supabase
        .from('formatos_generados')
        .insert({
          tipo: 'cadena_suministro',
          generado_por: user?.id,
          data_json: dataJson,
          estado: 'generado',
        });

      if (error) throw error;

      // Crear requerimientos
      for (const alerta of seleccionadas) {
        await supabase
          .from('insumos_requerimientos')
          .insert({
            hospital_id: alerta.hospital_id,
            insumo_catalogo_id: alerta.insumo_id,
            cantidad_requerida: alerta.cantidad_requerida,
            alerta_origen_id: alerta.id,
            prioridad: alerta.prioridad,
            generado_por: user?.id,
            estado: 'pendiente',
          });
      }

      toast.success('Formato para Cadena de Suministro generado');
      fetchFormatosGenerados();
      
      // Descargar JSON
      downloadJSON(dataJson, 'cadena_suministro');
    } catch (error) {
      console.error('Error generating format:', error);
      toast.error('Error al generar formato');
    } finally {
      setGeneratingFormat(false);
    }
  };

  const generarFormatoConsolidado = async () => {
    const seleccionadas = alertasConsolidadas.filter(a => a.selected);
    if (seleccionadas.length === 0) {
      toast.error('Selecciona al menos una alerta');
      return;
    }

    setGeneratingFormat(true);
    try {
      // Consolidar por insumo (sumar cantidades de todos los hospitales)
      const consolidado: Record<string, { nombre: string; clave: string; cantidad_total: number; hospitales: string[] }> = {};
      
      seleccionadas.forEach(a => {
        const key = a.insumo_id;
        if (!consolidado[key]) {
          consolidado[key] = {
            nombre: a.insumo_nombre,
            clave: a.insumo_clave,
            cantidad_total: 0,
            hospitales: [],
          };
        }
        consolidado[key].cantidad_total += a.cantidad_requerida;
        if (!consolidado[key].hospitales.includes(a.hospital_name)) {
          consolidado[key].hospitales.push(a.hospital_name);
        }
      });

      const dataJson = {
        fecha_generacion: new Date().toISOString(),
        total_insumos_unicos: Object.keys(consolidado).length,
        total_unidades: Object.values(consolidado).reduce((sum, i) => sum + i.cantidad_total, 0),
        insumos_consolidados: Object.values(consolidado).sort((a, b) => b.cantidad_total - a.cantidad_total),
      };

      // Guardar en BD
      const { error } = await supabase
        .from('formatos_generados')
        .insert({
          tipo: 'consolidado_almacen',
          generado_por: user?.id,
          data_json: dataJson,
          estado: 'generado',
        });

      if (error) throw error;

      toast.success('Formato Consolidado para Almacén generado');
      fetchFormatosGenerados();
      
      // Descargar JSON
      downloadJSON(dataJson, 'consolidado_almacen');
    } catch (error) {
      console.error('Error generating format:', error);
      toast.error('Error al generar formato');
    } finally {
      setGeneratingFormat(false);
    }
  };

  const downloadJSON = (data: object, prefix: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = alertasConsolidadas.filter(a => a.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Dashboard Gerente de Operaciones
          </h1>
          <p className="text-muted-foreground mt-1">Vista global de todos los hospitales</p>
        </div>
        <Button onClick={fetchAllData} variant="outline" disabled={loading}>
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hospitales</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHospitales}</div>
            <p className="text-xs text-muted-foreground">
              {stats.hospitalesConAlertas} con alertas
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.alertasCriticas}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Alta Prioridad</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.alertasAltas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alertas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alertasTotales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formatos Hoy</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatosGenerados.filter(f => 
                new Date(f.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hospitales" className="w-full">
        <TabsList>
          <TabsTrigger value="hospitales">Hospitales</TabsTrigger>
          <TabsTrigger value="consolidador">
            Consolidador ({alertasConsolidadas.length})
          </TabsTrigger>
          <TabsTrigger value="formatos">
            Formatos Generados ({formatosGenerados.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Hospitales */}
        <TabsContent value="hospitales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado por Hospital</CardTitle>
              <CardDescription>Vista comparativa de alertas por hospital</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead className="text-center">Críticas</TableHead>
                      <TableHead className="text-center">Altas</TableHead>
                      <TableHead className="text-center">Total Alertas</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospitalStats.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.display_name}</TableCell>
                        <TableCell className="text-center">
                          {h.alertas_criticas > 0 ? (
                            <Badge className="bg-red-500">{h.alertas_criticas}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {h.alertas_altas > 0 ? (
                            <Badge className="bg-orange-500">{h.alertas_altas}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold">{h.alertas_total}</TableCell>
                        <TableCell className="text-center">
                          {h.alertas_total === 0 ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : h.alertas_criticas > 0 ? (
                            <Badge className="bg-red-500">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Crítico
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500 text-black">
                              <Clock className="h-3 w-3 mr-1" />
                              Atención
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Consolidador */}
        <TabsContent value="consolidador" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Consolidador de Requerimientos</CardTitle>
                  <CardDescription>
                    Alertas enviadas por almacenistas - selecciona para generar formatos
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll(true)}
                  >
                    Seleccionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll(false)}
                  >
                    Deseleccionar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {alertasConsolidadas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay alertas pendientes de consolidar</p>
                  <p className="text-sm">Las alertas aparecerán aquí cuando los almacenistas las envíen</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={alertasConsolidadas.every(a => a.selected)}
                          onCheckedChange={(checked) => selectAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead className="text-center">Actual</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead className="text-center">A Solicitar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasConsolidadas.map((a) => (
                      <TableRow key={a.id} className={a.selected ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={a.selected}
                            onCheckedChange={() => toggleAlertaSelection(a.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={prioridadColors[a.prioridad]}>
                            {a.prioridad.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{a.hospital_name}</TableCell>
                        <TableCell>{a.insumo_nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{a.insumo_clave}</TableCell>
                        <TableCell className="text-center text-red-600 font-bold">
                          {a.cantidad_actual}
                        </TableCell>
                        <TableCell className="text-center">{a.minimo}</TableCell>
                        <TableCell className="text-center font-bold text-primary">
                          {a.cantidad_requerida}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Botones de Generación */}
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Formato Cadena de Suministro</h3>
                    <p className="text-sm text-muted-foreground">
                      Requerimientos segmentados por hospital
                    </p>
                  </div>
                  <Button
                    onClick={generarFormatoCadenaSuministro}
                    disabled={selectedCount === 0 || generatingFormat}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Generar ({selectedCount})
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Formato Consolidado Almacén</h3>
                    <p className="text-sm text-muted-foreground">
                      Totales por insumo para compras
                    </p>
                  </div>
                  <Button
                    onClick={generarFormatoConsolidado}
                    disabled={selectedCount === 0 || generatingFormat}
                    variant="secondary"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Generar ({selectedCount})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Formatos Generados */}
        <TabsContent value="formatos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Formatos Generados</CardTitle>
            </CardHeader>
            <CardContent>
              {formatosGenerados.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay formatos generados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formatosGenerados.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {f.tipo === 'cadena_suministro' ? 'Cadena Suministro' : 'Consolidado Almacén'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(f.created_at).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            f.estado === 'generado' ? 'bg-blue-100 text-blue-800' :
                            f.estado === 'enviado' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {f.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadJSON(f.data_json, f.tipo)}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            Descargar
                          </Button>
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
