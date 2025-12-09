import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, FileText, Download, RefreshCw, Building2, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AlertaInventario {
  id: string;
  hospital_id: string;
  insumo_catalogo_id: string;
  cantidad_actual: number;
  minimo_permitido: number;
  estado: string;
  prioridad: string;
  created_at: string;
  hospital?: { id: string; nombre: string; display_name: string };
  insumo?: { id: string; nombre: string; clave: string };
}

interface NecesidadSegmentada {
  hospital_id: string;
  hospital_nombre: string;
  insumo_catalogo_id: string;
  insumo_nombre: string;
  insumo_clave: string;
  existencia_actual: number;
  minimo: number;
  faltante_requerido: number;
}

interface NecesidadAgrupada {
  insumo_catalogo_id: string;
  insumo_nombre: string;
  insumo_clave: string;
  total_faltante: number;
  hospitales_afectados: number;
}

const GerenteOperacionesDashboard = () => {
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [necesidadesSegmentadas, setNecesidadesSegmentadas] = useState<NecesidadSegmentada[]>([]);
  const [necesidadesAgrupadas, setNecesidadesAgrupadas] = useState<NecesidadAgrupada[]>([]);
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroHospital, setFiltroHospital] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('activa');
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filtroHospital, filtroEstado]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch hospitales
      const { data: hospitalesData } = await supabase
        .from('hospitales')
        .select('id, nombre, display_name')
        .order('nombre');
      
      if (hospitalesData) {
        setHospitales(hospitalesData.map(h => ({ id: h.id, nombre: h.display_name || h.nombre })));
      }

      // Fetch alertas with filters
      let alertasQuery = supabase
        .from('insumos_alertas')
        .select(`
          *,
          hospital:hospitales(id, nombre, display_name),
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .order('prioridad', { ascending: true })
        .order('created_at', { ascending: false });

      if (filtroEstado !== 'todos') {
        alertasQuery = alertasQuery.eq('estado', filtroEstado);
      }

      if (filtroHospital !== 'todos') {
        alertasQuery = alertasQuery.eq('hospital_id', filtroHospital);
      }

      const { data: alertasData, error: alertasError } = await alertasQuery;
      
      if (alertasError) throw alertasError;
      setAlertas(alertasData || []);

      // Calculate necesidades segmentadas from alertas activas
      await calcularNecesidades();

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const calcularNecesidades = async () => {
    try {
      // Get all active alerts with inventory data
      const { data: alertasActivas, error } = await supabase
        .from('insumos_alertas')
        .select(`
          *,
          hospital:hospitales(id, nombre, display_name),
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('estado', 'activa');

      if (error) throw error;

      // Segmentadas por hospital
      const segmentadas: NecesidadSegmentada[] = (alertasActivas || []).map(alerta => ({
        hospital_id: alerta.hospital_id,
        hospital_nombre: alerta.hospital?.display_name || alerta.hospital?.nombre || 'N/A',
        insumo_catalogo_id: alerta.insumo_catalogo_id,
        insumo_nombre: alerta.insumo?.nombre || 'N/A',
        insumo_clave: alerta.insumo?.clave || 'N/A',
        existencia_actual: alerta.cantidad_actual,
        minimo: alerta.minimo_permitido,
        faltante_requerido: Math.max(0, alerta.minimo_permitido - alerta.cantidad_actual)
      }));

      setNecesidadesSegmentadas(segmentadas);

      // Agrupadas por insumo (suma de todos los hospitales)
      const agrupadasMap = new Map<string, NecesidadAgrupada>();
      
      segmentadas.forEach(seg => {
        if (agrupadasMap.has(seg.insumo_catalogo_id)) {
          const existing = agrupadasMap.get(seg.insumo_catalogo_id)!;
          existing.total_faltante += seg.faltante_requerido;
          existing.hospitales_afectados += 1;
        } else {
          agrupadasMap.set(seg.insumo_catalogo_id, {
            insumo_catalogo_id: seg.insumo_catalogo_id,
            insumo_nombre: seg.insumo_nombre,
            insumo_clave: seg.insumo_clave,
            total_faltante: seg.faltante_requerido,
            hospitales_afectados: 1
          });
        }
      });

      setNecesidadesAgrupadas(Array.from(agrupadasMap.values()).sort((a, b) => b.total_faltante - a.total_faltante));

    } catch (error) {
      console.error('Error calculating needs:', error);
    }
  };

  const generarDocumentoSegmentado = async () => {
    setGenerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create document record
      const { data: documento, error: docError } = await supabase
        .from('documentos_necesidades_segmentado')
        .insert({
          generado_por: user?.id,
          estado: 'generado'
        })
        .select()
        .single();

      if (docError) throw docError;

      // Insert details
      const detalles = necesidadesSegmentadas.map(n => ({
        documento_id: documento.id,
        hospital_id: n.hospital_id,
        insumo_catalogo_id: n.insumo_catalogo_id,
        existencia_actual: n.existencia_actual,
        minimo: n.minimo,
        faltante_requerido: n.faltante_requerido
      }));

      const { error: detError } = await supabase
        .from('documento_segmentado_detalle')
        .insert(detalles);

      if (detError) throw detError;

      // Export to Excel
      exportarExcelSegmentado();

      toast.success('Documento segmentado generado correctamente');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar documento');
    } finally {
      setGenerando(false);
    }
  };

  const generarDocumentoAgrupado = async () => {
    setGenerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create document record
      const { data: documento, error: docError } = await supabase
        .from('documentos_necesidades_agrupado')
        .insert({
          generado_por: user?.id,
          estado: 'generado'
        })
        .select()
        .single();

      if (docError) throw docError;

      // Insert details
      const detalles = necesidadesAgrupadas.map(n => ({
        documento_id: documento.id,
        insumo_catalogo_id: n.insumo_catalogo_id,
        total_faltante_requerido: n.total_faltante
      }));

      const { error: detError } = await supabase
        .from('documento_agrupado_detalle')
        .insert(detalles);

      if (detError) throw detError;

      // Export to Excel
      exportarExcelAgrupado();

      toast.success('Documento agrupado generado correctamente');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar documento');
    } finally {
      setGenerando(false);
    }
  };

  const exportarExcelSegmentado = () => {
    const data = necesidadesSegmentadas.map(n => ({
      'Hospital': n.hospital_nombre,
      'Clave Insumo': n.insumo_clave,
      'Nombre Insumo': n.insumo_nombre,
      'Existencia Actual': n.existencia_actual,
      'Mínimo': n.minimo,
      'Cantidad Requerida': n.faltante_requerido
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Necesidades por Hospital');
    XLSX.writeFile(wb, `Necesidades_Segmentado_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarExcelAgrupado = () => {
    const data = necesidadesAgrupadas.map(n => ({
      'ID Insumo': n.insumo_catalogo_id,
      'Clave Insumo': n.insumo_clave,
      'Nombre Insumo': n.insumo_nombre,
      'Cantidad Requerida Total': n.total_faltante,
      'Hospitales Afectados': n.hospitales_afectados,
      'Cantidad Proveedor': '' // Columna vacía para el proveedor
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Necesidades Consolidadas');
    XLSX.writeFile(wb, `Necesidades_Agrupado_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'destructive';
      case 'alta': return 'destructive';
      case 'media': return 'secondary';
      case 'baja': return 'outline';
      default: return 'outline';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activa': return 'destructive';
      case 'en_proceso': return 'secondary';
      case 'resuelta': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Gerente de Operaciones</h1>
          <p className="text-muted-foreground">Gestión de alertas y necesidades de inventario</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertas.filter(a => a.estado === 'activa').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hospitales Afectados</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(alertas.filter(a => a.estado === 'activa').map(a => a.hospital_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos Críticos</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alertas.filter(a => a.estado === 'activa' && a.prioridad === 'critica').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faltante</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {necesidadesAgrupadas.reduce((sum, n) => sum + n.total_faltante, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alertas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alertas">Alertas de Inventario</TabsTrigger>
          <TabsTrigger value="segmentado">Documento Segmentado</TabsTrigger>
          <TabsTrigger value="agrupado">Documento Agrupado</TabsTrigger>
        </TabsList>

        <TabsContent value="alertas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Alertas por Hospital</span>
                <div className="flex gap-2">
                  <Select value={filtroHospital} onValueChange={setFiltroHospital}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los hospitales</SelectItem>
                      {hospitales.map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activa">Activas</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="resuelta">Resueltas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : alertas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay alertas</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Existencia</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell className="font-medium">
                          {alerta.hospital?.display_name || alerta.hospital?.nombre}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alerta.insumo?.nombre}</div>
                            <div className="text-sm text-muted-foreground">{alerta.insumo?.clave}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={alerta.cantidad_actual === 0 ? 'text-destructive' : ''}>
                            {alerta.cantidad_actual}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{alerta.minimo_permitido}</TableCell>
                        <TableCell>
                          <Badge variant={getPrioridadColor(alerta.prioridad)}>
                            {alerta.prioridad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEstadoColor(alerta.estado)}>
                            {alerta.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segmentado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Necesidades Segmentadas por Hospital</span>
                <div className="flex gap-2">
                  <Button onClick={exportarExcelSegmentado} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button onClick={generarDocumentoSegmentado} disabled={generando || necesidadesSegmentadas.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Documento
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Este documento se envía a Cadena de Suministro para la pulverización
              </p>
            </CardHeader>
            <CardContent>
              {necesidadesSegmentadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay necesidades activas</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Existencia</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Faltante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {necesidadesSegmentadas.map((n, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{n.hospital_nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{n.insumo_clave}</TableCell>
                        <TableCell>{n.insumo_nombre}</TableCell>
                        <TableCell className="text-right font-mono">{n.existencia_actual}</TableCell>
                        <TableCell className="text-right font-mono">{n.minimo}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive">
                          {n.faltante_requerido}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agrupado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Necesidades Agrupadas (Total)</span>
                <div className="flex gap-2">
                  <Button onClick={exportarExcelAgrupado} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button onClick={generarDocumentoAgrupado} disabled={generando || necesidadesAgrupadas.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Documento
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Este documento se envía al Gerente de Almacén para gestión con proveedores
              </p>
            </CardHeader>
            <CardContent>
              {necesidadesAgrupadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay necesidades activas</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Total Requerido</TableHead>
                      <TableHead className="text-right">Hospitales Afectados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {necesidadesAgrupadas.map((n) => (
                      <TableRow key={n.insumo_catalogo_id}>
                        <TableCell className="font-mono text-sm">{n.insumo_clave}</TableCell>
                        <TableCell className="font-medium">{n.insumo_nombre}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {n.total_faltante.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{n.hospitales_afectados}</TableCell>
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
};

export default GerenteOperacionesDashboard;
