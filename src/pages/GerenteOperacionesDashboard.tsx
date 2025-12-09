import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, FileText, Send, RefreshCw, Building2, Package, CheckCircle2, Clock, Settings2, Edit, History, Eye } from 'lucide-react';
import { StatusTimeline } from '@/components/StatusTimeline';
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

interface NecesidadAgrupada {
  insumo_catalogo_id: string;
  insumo_nombre: string;
  insumo_clave: string;
  total_faltante: number;
  hospitales_afectados: number;
  cantidad_editable: number;
  seleccionada: boolean;
  alertas_ids: string[];
}

interface DocumentoEnviado {
  id: string;
  fecha_generacion: string;
  estado: string;
  enviado_a_gerente_almacen: boolean;
  enviado_at: string | null;
  procesado_por_almacen: boolean;
  procesado_at: string | null;
  total_items?: number;
}

const GerenteOperacionesDashboard = () => {
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [necesidadesAgrupadas, setNecesidadesAgrupadas] = useState<NecesidadAgrupada[]>([]);
  const [documentosEnviados, setDocumentosEnviados] = useState<DocumentoEnviado[]>([]);
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroHospital, setFiltroHospital] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('activa');
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  
  // Dialog para editar y enviar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemsParaEnviar, setItemsParaEnviar] = useState<NecesidadAgrupada[]>([]);

  const fetchDataCallback = useCallback(() => {
    fetchData();
  }, [filtroHospital, filtroEstado]);

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

      // Fetch alertas activas (solo las que no han sido procesadas)
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

      // Fetch documentos enviados
      const { data: docsData } = await supabase
        .from('documentos_necesidades_agrupado')
        .select('*')
        .order('fecha_generacion', { ascending: false })
        .limit(20);
      
      setDocumentosEnviados(docsData || []);

      // Calcular necesidades agrupadas solo de alertas activas
      await calcularNecesidades(alertasData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const calcularNecesidades = async (alertasActivas: AlertaInventario[]) => {
    const agrupadasMap = new Map<string, NecesidadAgrupada>();
    
    alertasActivas
      .filter(a => a.estado === 'activa')
      .forEach(alerta => {
        const faltante = Math.max(0, alerta.minimo_permitido - alerta.cantidad_actual);
        
        if (agrupadasMap.has(alerta.insumo_catalogo_id)) {
          const existing = agrupadasMap.get(alerta.insumo_catalogo_id)!;
          existing.total_faltante += faltante;
          existing.hospitales_afectados += 1;
          existing.cantidad_editable += faltante;
          existing.alertas_ids.push(alerta.id);
        } else {
          agrupadasMap.set(alerta.insumo_catalogo_id, {
            insumo_catalogo_id: alerta.insumo_catalogo_id,
            insumo_nombre: alerta.insumo?.nombre || 'N/A',
            insumo_clave: alerta.insumo?.clave || 'N/A',
            total_faltante: faltante,
            hospitales_afectados: 1,
            cantidad_editable: faltante,
            seleccionada: false,
            alertas_ids: [alerta.id]
          });
        }
      });

    setNecesidadesAgrupadas(Array.from(agrupadasMap.values()).sort((a, b) => b.total_faltante - a.total_faltante));
  };

  const toggleSeleccion = (insumoId: string) => {
    setNecesidadesAgrupadas(prev => prev.map(n => 
      n.insumo_catalogo_id === insumoId 
        ? { ...n, seleccionada: !n.seleccionada }
        : n
    ));
  };

  const seleccionarTodos = () => {
    const todasSeleccionadas = necesidadesAgrupadas.every(n => n.seleccionada);
    setNecesidadesAgrupadas(prev => prev.map(n => ({ ...n, seleccionada: !todasSeleccionadas })));
  };

  const actualizarCantidad = (insumoId: string, cantidad: number) => {
    setNecesidadesAgrupadas(prev => prev.map(n => 
      n.insumo_catalogo_id === insumoId 
        ? { ...n, cantidad_editable: Math.max(0, cantidad) }
        : n
    ));
  };

  const abrirDialogEnvio = () => {
    const seleccionadas = necesidadesAgrupadas.filter(n => n.seleccionada && n.cantidad_editable > 0);
    if (seleccionadas.length === 0) {
      toast.error('Selecciona al menos un insumo para enviar');
      return;
    }
    setItemsParaEnviar(seleccionadas);
    setDialogOpen(true);
  };

  const actualizarCantidadEnDialog = (insumoId: string, cantidad: number) => {
    setItemsParaEnviar(prev => prev.map(n => 
      n.insumo_catalogo_id === insumoId 
        ? { ...n, cantidad_editable: Math.max(0, cantidad) }
        : n
    ));
  };

  const enviarAGerenteAlmacen = async () => {
    const itemsValidos = itemsParaEnviar.filter(n => n.cantidad_editable > 0);
    if (itemsValidos.length === 0) {
      toast.error('No hay items con cantidad mayor a 0');
      return;
    }

    setGenerando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Crear documento agrupado (solo va a Gerente Almacén, NO a Cadena)
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

      // 2. Insertar detalles
      const detalles = itemsValidos.map(n => ({
        documento_id: documento.id,
        insumo_catalogo_id: n.insumo_catalogo_id,
        total_faltante_requerido: n.cantidad_editable
      }));

      const { error: detError } = await supabase
        .from('documento_agrupado_detalle')
        .insert(detalles);

      if (detError) throw detError;

      // 3. Marcar las alertas incluidas como "en_proceso"
      const todasAlertasIds = itemsValidos.flatMap(n => n.alertas_ids);
      
      if (todasAlertasIds.length > 0) {
        await supabase
          .from('insumos_alertas')
          .update({ 
            estado: 'en_proceso',
            updated_at: new Date().toISOString()
          })
          .in('id', todasAlertasIds);
      }

      toast.success(`Documento enviado a Gerente de Almacén con ${itemsValidos.length} insumos`, {
        description: 'El siguiente paso es que Gerente Almacén descargue el Excel, consulte proveedores y cree la orden de compra.',
        duration: 5000
      });

      setDialogOpen(false);
      setItemsParaEnviar([]);
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

  const seleccionadasCount = necesidadesAgrupadas.filter(n => n.seleccionada).length;
  const totalSeleccionado = necesidadesAgrupadas.filter(n => n.seleccionada).reduce((sum, n) => sum + n.cantidad_editable, 0);
  const alertasActivas = alertas.filter(a => a.estado === 'activa');

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
            <div className="text-2xl font-bold">{alertasActivas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hospitales Afectados</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(alertasActivas.map(a => a.hospital_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos Únicos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{necesidadesAgrupadas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seleccionadasCount}</div>
            <p className="text-xs text-muted-foreground">{totalSeleccionado.toLocaleString()} unidades</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="consolidar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consolidar">
            Consolidar y Enviar
            {necesidadesAgrupadas.length > 0 && (
              <Badge variant="destructive" className="ml-2">{necesidadesAgrupadas.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alertas">Detalle Alertas</TabsTrigger>
          <TabsTrigger value="minimos" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Configurar Mínimos
          </TabsTrigger>
          <TabsTrigger value="historial">
            <History className="h-3.5 w-3.5 mr-1" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Consolidar y Enviar */}
        <TabsContent value="consolidar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span>Necesidades Agrupadas por Insumo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                    {necesidadesAgrupadas.every(n => n.seleccionada) ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                  </Button>
                  <Button 
                    onClick={abrirDialogEnvio} 
                    disabled={seleccionadasCount === 0}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Seleccionados ({seleccionadasCount})
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona los insumos que deseas incluir en el pedido. Puedes editar las cantidades antes de enviar.
                <br />
                <strong>Flujo:</strong> Gerente Operaciones → Gerente Almacén → Finanzas → Cadena de Suministros
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : necesidadesAgrupadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  No hay alertas activas para procesar
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={necesidadesAgrupadas.every(n => n.seleccionada)}
                          onCheckedChange={seleccionarTodos}
                        />
                      </TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Total Faltante</TableHead>
                      <TableHead className="text-right">Hospitales</TableHead>
                      <TableHead className="text-right w-32">Cantidad a Pedir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {necesidadesAgrupadas.map((n) => (
                      <TableRow 
                        key={n.insumo_catalogo_id} 
                        className={n.seleccionada ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={n.seleccionada}
                            onCheckedChange={() => toggleSeleccion(n.insumo_catalogo_id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{n.insumo_clave}</TableCell>
                        <TableCell className="font-medium">{n.insumo_nombre}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {n.total_faltante.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">{n.hospitales_afectados}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={n.cantidad_editable}
                            onChange={(e) => actualizarCantidad(n.insumo_catalogo_id, parseInt(e.target.value) || 0)}
                            className="w-24 text-right font-mono ml-auto"
                            disabled={!n.seleccionada}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Detalle Alertas */}
        <TabsContent value="alertas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Detalle de Alertas por Hospital</span>
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
                    {alertas.slice(0, 100).map((alerta) => (
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
                            {alerta.estado === 'en_proceso' ? 'En Proceso' : alerta.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {alertas.length > 100 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 100 de {alertas.length} alertas
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configurar Mínimos */}
        <TabsContent value="minimos" className="space-y-4">
          <EdicionMasivaMínimos esGlobal={true} onActualizado={fetchData} />
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Envíos a Gerente de Almacén
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Documentos generados y su estado en el flujo de compras
              </p>
            </CardHeader>
            <CardContent>
              {documentosEnviados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay documentos enviados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Envío</TableHead>
                      <TableHead>Estado Flujo</TableHead>
                      <TableHead>Procesado por Almacén</TableHead>
                      <TableHead>Fecha Procesado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosEnviados.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono">
                          {new Date(doc.fecha_generacion).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <StatusTimeline 
                            currentStatus={doc.procesado_por_almacen ? 'procesado' : 'enviado'} 
                            tipo="agrupado" 
                          />
                        </TableCell>
                        <TableCell>
                          {doc.procesado_por_almacen ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {doc.procesado_at 
                            ? new Date(doc.procesado_at).toLocaleDateString('es-MX', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })
                            : '-'
                          }
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

      {/* Dialog: Confirmar y Editar antes de enviar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Revisar y Enviar a Gerente de Almacén
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revisa las cantidades antes de enviar. Este documento irá al Gerente de Almacén para que gestione la compra con proveedores.
            </p>

            <ScrollArea className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Faltante Original</TableHead>
                    <TableHead className="text-right w-32">Cantidad a Pedir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsParaEnviar.map((item) => (
                    <TableRow key={item.insumo_catalogo_id}>
                      <TableCell className="font-mono text-sm">{item.insumo_clave}</TableCell>
                      <TableCell className="font-medium">{item.insumo_nombre}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.total_faltante.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          value={item.cantidad_editable}
                          onChange={(e) => actualizarCantidadEnDialog(item.insumo_catalogo_id, parseInt(e.target.value) || 0)}
                          className="w-24 text-right font-mono ml-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Total items:</span>{' '}
                <span className="font-bold">{itemsParaEnviar.length}</span>
                <span className="mx-2">|</span>
                <span className="text-muted-foreground">Total unidades:</span>{' '}
                <span className="font-bold">{itemsParaEnviar.reduce((sum, i) => sum + i.cantidad_editable, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarAGerenteAlmacen} disabled={generando}>
              <Send className="mr-2 h-4 w-4" />
              {generando ? 'Enviando...' : 'Enviar a Gerente de Almacén'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenteOperacionesDashboard;
