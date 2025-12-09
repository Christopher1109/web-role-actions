import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, FileText, Send, RefreshCw, Building2, Package, CheckCircle2, Clock, Ban, Settings2 } from 'lucide-react';
import { StatusTimeline, StatusBadge } from '@/components/StatusTimeline';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import EdicionMasivaMínimos from '@/components/forms/EdicionMasivaMínimos';

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

interface DocumentoSegmentado {
  id: string;
  fecha_generacion: string;
  estado: string;
  enviado_a_cadena_suministros: boolean;
  enviado_at: string | null;
  procesado_por_cadena: boolean;
}

interface DocumentoAgrupado {
  id: string;
  fecha_generacion: string;
  estado: string;
  enviado_a_gerente_almacen: boolean;
  enviado_at: string | null;
  procesado_por_almacen: boolean;
}

const GerenteOperacionesDashboard = () => {
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [necesidadesSegmentadas, setNecesidadesSegmentadas] = useState<NecesidadSegmentada[]>([]);
  const [necesidadesAgrupadas, setNecesidadesAgrupadas] = useState<NecesidadAgrupada[]>([]);
  const [documentosSegmentados, setDocumentosSegmentados] = useState<DocumentoSegmentado[]>([]);
  const [documentosAgrupados, setDocumentosAgrupados] = useState<DocumentoAgrupado[]>([]);
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroHospital, setFiltroHospital] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('activa');
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  const fetchDataCallback = useCallback(() => {
    fetchData();
  }, [filtroHospital, filtroEstado]);

  // Realtime notifications
  useRealtimeNotifications({
    userRole: 'gerente_operaciones',
    onPedidoActualizado: fetchDataCallback,
  });

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

      // Fetch existing documents
      const { data: docsSegData } = await supabase
        .from('documentos_necesidades_segmentado')
        .select('*')
        .order('fecha_generacion', { ascending: false })
        .limit(10);
      
      setDocumentosSegmentados(docsSegData || []);

      const { data: docsAgrData } = await supabase
        .from('documentos_necesidades_agrupado')
        .select('*')
        .order('fecha_generacion', { ascending: false })
        .limit(10);
      
      setDocumentosAgrupados(docsAgrData || []);

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
      const { data: alertasActivas, error } = await supabase
        .from('insumos_alertas')
        .select(`
          *,
          hospital:hospitales(id, nombre, display_name),
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('estado', 'activa');

      if (error) throw error;

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

  const generarYEnviarSegmentado = async () => {
    if (necesidadesSegmentadas.length === 0) {
      toast.error('No hay necesidades para enviar');
      return;
    }

    setGenerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create document record with enviado flag
      const { data: documento, error: docError } = await supabase
        .from('documentos_necesidades_segmentado')
        .insert({
          generado_por: user?.id,
          estado: 'enviado',
          enviado_a_cadena_suministros: true,
          enviado_at: new Date().toISOString()
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

      toast.success('Documento enviado a Cadena de Suministros');
      fetchData();
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar documento');
    } finally {
      setGenerando(false);
    }
  };

  const generarYEnviarAgrupado = async () => {
    if (necesidadesAgrupadas.length === 0) {
      toast.error('No hay necesidades para enviar');
      return;
    }

    setGenerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create document record with enviado flag
      const { data: documento, error: docError } = await supabase
        .from('documentos_necesidades_agrupado')
        .insert({
          generado_por: user?.id,
          estado: 'enviado',
          enviado_a_gerente_almacen: true,
          enviado_at: new Date().toISOString()
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

      toast.success('Documento enviado a Gerente de Almacén');
      fetchData();
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar documento');
    } finally {
      setGenerando(false);
    }
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

  const getDocumentoEstadoBadge = (doc: DocumentoSegmentado | DocumentoAgrupado) => {
    const esSegmentado = 'enviado_a_cadena_suministros' in doc;
    const enviado = esSegmentado 
      ? (doc as DocumentoSegmentado).enviado_a_cadena_suministros 
      : (doc as DocumentoAgrupado).enviado_a_gerente_almacen;
    const procesado = esSegmentado 
      ? (doc as DocumentoSegmentado).procesado_por_cadena 
      : (doc as DocumentoAgrupado).procesado_por_almacen;
    const status = procesado ? 'procesado' : (enviado ? 'enviado' : 'generado');

    return <StatusTimeline currentStatus={status} tipo={esSegmentado ? 'segmentado' : 'agrupado'} />;
  };

  // Check if we already sent documents today to prevent duplicates
  const yaEnviadoHoySegmentado = documentosSegmentados.some(doc => {
    const fecha = new Date(doc.fecha_generacion);
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString() && doc.enviado_a_cadena_suministros;
  });

  const yaEnviadoHoyAgrupado = documentosAgrupados.some(doc => {
    const fecha = new Date(doc.fecha_generacion);
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString() && doc.enviado_a_gerente_almacen;
  });

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
          <TabsTrigger value="minimos" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Configurar Mínimos
          </TabsTrigger>
          <TabsTrigger value="segmentado">Para Cadena Suministros</TabsTrigger>
          <TabsTrigger value="agrupado">Para Gerente Almacén</TabsTrigger>
          <TabsTrigger value="historial">Historial de Envíos</TabsTrigger>
        </TabsList>

        <TabsContent value="alertas" className="space-y-4">
          {/* Summary Cards by Priority */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Crítica</p>
                    <p className="text-2xl font-bold text-red-600">
                      {alertas.filter(a => a.estado === 'activa' && a.prioridad === 'critica').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alta</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {alertas.filter(a => a.estado === 'activa' && a.prioridad === 'alta').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Media</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {alertas.filter(a => a.estado === 'activa' && a.prioridad === 'media').length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Baja</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {alertas.filter(a => a.estado === 'activa' && a.prioridad === 'baja').length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Detalle de Alertas</span>
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
              <p className="text-sm text-muted-foreground">
                Los mínimos se configuran desde el dashboard del Almacenista en cada hospital (menú Inventario → editar insumo)
              </p>
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
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Existencia</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Faltante</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.map((alerta) => (
                      <TableRow key={alerta.id} className={alerta.prioridad === 'critica' ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <Badge variant={getPrioridadColor(alerta.prioridad)} className="uppercase text-xs">
                            {alerta.prioridad}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {alerta.hospital?.display_name || alerta.hospital?.nombre}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alerta.insumo?.nombre}</div>
                            <div className="text-xs text-muted-foreground font-mono">{alerta.insumo?.clave}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={alerta.cantidad_actual === 0 ? 'text-destructive font-bold' : ''}>
                            {alerta.cantidad_actual}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{alerta.minimo_permitido}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive">
                          {Math.max(0, alerta.minimo_permitido - alerta.cantidad_actual)}
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

        <TabsContent value="minimos" className="space-y-4">
          <EdicionMasivaMínimos esGlobal={true} onActualizado={fetchData} />
        </TabsContent>

        <TabsContent value="segmentado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Necesidades Segmentadas por Hospital</span>
                <div className="flex items-center gap-2">
                  {yaEnviadoHoySegmentado && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Ban className="mr-1 h-3 w-3" />
                      Ya enviado hoy
                    </Badge>
                  )}
                  <Button 
                    onClick={generarYEnviarSegmentado} 
                    disabled={generando || necesidadesSegmentadas.length === 0 || yaEnviadoHoySegmentado}
                    variant={yaEnviadoHoySegmentado ? 'outline' : 'default'}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {yaEnviadoHoySegmentado ? 'Documento ya enviado' : 'Enviar a Cadena de Suministros'}
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Este documento se envía a Cadena de Suministros para distribución desde almacén central a hospitales
              </p>
            </CardHeader>
            <CardContent>
              {necesidadesSegmentadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay necesidades activas
                </div>
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
                      <TableRow key={`${n.hospital_id}-${n.insumo_catalogo_id}-${idx}`}>
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
                <span>Necesidades Consolidadas (Agrupado)</span>
                <div className="flex items-center gap-2">
                  {yaEnviadoHoyAgrupado && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Ban className="mr-1 h-3 w-3" />
                      Ya enviado hoy
                    </Badge>
                  )}
                  <Button 
                    onClick={generarYEnviarAgrupado} 
                    disabled={generando || necesidadesAgrupadas.length === 0 || yaEnviadoHoyAgrupado}
                    variant={yaEnviadoHoyAgrupado ? 'outline' : 'default'}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {yaEnviadoHoyAgrupado ? 'Documento ya enviado' : 'Enviar a Gerente de Almacén'}
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Este documento se envía a Gerente de Almacén para gestión de compras con proveedores
              </p>
            </CardHeader>
            <CardContent>
              {necesidadesAgrupadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay necesidades activas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Total Faltante</TableHead>
                      <TableHead className="text-right">Hospitales Afectados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {necesidadesAgrupadas.map((n) => (
                      <TableRow key={n.insumo_catalogo_id}>
                        <TableCell className="font-mono text-sm">{n.insumo_clave}</TableCell>
                        <TableCell className="font-medium">{n.insumo_nombre}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive">
                          {n.total_faltante.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">{n.hospitales_afectados}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enviados a Cadena de Suministros</CardTitle>
              </CardHeader>
              <CardContent>
                {documentosSegmentados.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sin documentos enviados</p>
                ) : (
                  <div className="space-y-2">
                    {documentosSegmentados.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-mono text-sm">
                            {new Date(doc.fecha_generacion).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {getDocumentoEstadoBadge(doc)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enviados a Gerente de Almacén</CardTitle>
              </CardHeader>
              <CardContent>
                {documentosAgrupados.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sin documentos enviados</p>
                ) : (
                  <div className="space-y-2">
                    {documentosAgrupados.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-mono text-sm">
                            {new Date(doc.fecha_generacion).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {getDocumentoEstadoBadge(doc)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GerenteOperacionesDashboard;
