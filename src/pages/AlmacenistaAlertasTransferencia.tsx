import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Package, CheckCircle, AlertTriangle, XCircle, Settings2, Layers, ChevronRight, Warehouse, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useHospital } from '@/contexts/HospitalContext';
import EdicionMasivaMínimos from '@/components/forms/EdicionMasivaMínimos';

interface AlertaTransferencia {
  id: string;
  transferencia_id: string;
  hospital_id: string;
  insumo_catalogo_id: string;
  cantidad_enviada: number;
  cantidad_aceptada: number | null;
  cantidad_merma: number;
  motivo_merma: string | null;
  estado: string;
  created_at: string;
  notas: string | null;
  tirada_id: string | null;
  insumo?: { id: string; nombre: string; clave: string };
}

interface TiradaAgrupada {
  tirada_id: string;
  fecha: string;
  alertas: AlertaTransferencia[];
  estado: 'pendiente' | 'parcialmente_recibida' | 'completa';
  total_insumos: number;
}

interface AlmacenProvisional {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  es_principal: boolean;
}

interface InventarioProvisional {
  id: string;
  almacen_provisional_id: string;
  insumo_catalogo_id: string;
  cantidad_disponible: number;
  insumo?: { id: string; nombre: string; clave: string };
}

const AlmacenistaAlertasTransferencia = () => {
  const { selectedHospital } = useHospital();
  const [alertas, setAlertas] = useState<AlertaTransferencia[]>([]);
  const [tiradasAgrupadas, setTiradasAgrupadas] = useState<TiradaAgrupada[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Almacenes provisionales state
  const [almacenesProvisionales, setAlmacenesProvisionales] = useState<AlmacenProvisional[]>([]);
  const [inventarioProvisional, setInventarioProvisional] = useState<InventarioProvisional[]>([]);
  const [selectedAlmacenProv, setSelectedAlmacenProv] = useState<AlmacenProvisional | null>(null);
  
  // Dialog states
  const [dialogTiradaOpen, setDialogTiradaOpen] = useState(false);
  const [selectedTirada, setSelectedTirada] = useState<TiradaAgrupada | null>(null);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [mermas, setMermas] = useState<Record<string, number>>({});
  const [motivosMerma, setMotivosMerma] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState(false);

  // Dialog para crear almacén provisional
  const [dialogCrearAlmacen, setDialogCrearAlmacen] = useState(false);
  const [nuevoAlmacenNombre, setNuevoAlmacenNombre] = useState('');
  const [nuevoAlmacenDesc, setNuevoAlmacenDesc] = useState('');

  // Dialog para traspasar a provisional
  const [dialogTraspasoOpen, setDialogTraspasoOpen] = useState(false);
  const [inventarioGeneral, setInventarioGeneral] = useState<any[]>([]);
  const [cantidadesTraspaso, setCantidadesTraspaso] = useState<Record<string, number>>({});
  const [almacenDestinoId, setAlmacenDestinoId] = useState<string>('');

  // Dialog para devolución
  const [dialogDevolucionOpen, setDialogDevolucionOpen] = useState(false);
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedHospital) {
      fetchAlertas();
      fetchAlmacenesProvisionales();
    }
  }, [selectedHospital]);

  const fetchAlertas = async () => {
    if (!selectedHospital) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alertas_transferencia')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('hospital_id', selectedHospital.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlertas(data || []);
      agruparPorTirada(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const agruparPorTirada = (alertasData: AlertaTransferencia[]) => {
    const tiradaMap = new Map<string, TiradaAgrupada>();
    const sinTirada: AlertaTransferencia[] = [];
    
    alertasData.forEach(alerta => {
      if (alerta.tirada_id) {
        if (tiradaMap.has(alerta.tirada_id)) {
          tiradaMap.get(alerta.tirada_id)!.alertas.push(alerta);
        } else {
          tiradaMap.set(alerta.tirada_id, {
            tirada_id: alerta.tirada_id,
            fecha: alerta.created_at,
            alertas: [alerta],
            estado: 'pendiente',
            total_insumos: 0
          });
        }
      } else {
        sinTirada.push(alerta);
      }
    });

    // Calculate estado for each tirada
    tiradaMap.forEach(tirada => {
      tirada.total_insumos = tirada.alertas.length;
      const pendientes = tirada.alertas.filter(a => a.estado === 'pendiente').length;
      const procesadas = tirada.alertas.filter(a => a.estado !== 'pendiente').length;
      
      if (pendientes === tirada.alertas.length) {
        tirada.estado = 'pendiente';
      } else if (procesadas === tirada.alertas.length) {
        tirada.estado = 'completa';
      } else {
        tirada.estado = 'parcialmente_recibida';
      }
    });

    // Add individual alerts without tirada_id as separate "tiradas"
    sinTirada.forEach(alerta => {
      tiradaMap.set(alerta.id, {
        tirada_id: alerta.id,
        fecha: alerta.created_at,
        alertas: [alerta],
        estado: alerta.estado === 'pendiente' ? 'pendiente' : 'completa',
        total_insumos: 1
      });
    });

    setTiradasAgrupadas(
      Array.from(tiradaMap.values()).sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )
    );
  };

  const fetchAlmacenesProvisionales = async () => {
    if (!selectedHospital) return;
    
    try {
      const { data, error } = await supabase
        .from('almacenes_provisionales')
        .select('*')
        .eq('hospital_id', selectedHospital.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlmacenesProvisionales(data || []);
    } catch (error) {
      console.error('Error fetching provisional warehouses:', error);
    }
  };

  const fetchInventarioProvisional = async (almacenId: string) => {
    try {
      const { data, error } = await supabase
        .from('almacen_provisional_inventario')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('almacen_provisional_id', almacenId);

      if (error) throw error;
      setInventarioProvisional(data || []);
    } catch (error) {
      console.error('Error fetching provisional inventory:', error);
    }
  };

  const abrirDialogTirada = (tirada: TiradaAgrupada) => {
    setSelectedTirada(tirada);
    const initialCantidades: Record<string, number> = {};
    const initialMermas: Record<string, number> = {};
    tirada.alertas.forEach(a => {
      initialCantidades[a.id] = a.cantidad_enviada;
      initialMermas[a.id] = 0;
    });
    setCantidadesRecibidas(initialCantidades);
    setMermas(initialMermas);
    setMotivosMerma({});
    setDialogTiradaOpen(true);
  };

  const procesarTirada = async () => {
    if (!selectedTirada || !selectedHospital) return;

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const alerta of selectedTirada.alertas) {
        const cantidadRecibida = cantidadesRecibidas[alerta.id] || 0;
        const merma = mermas[alerta.id] || 0;
        const motivoMerma = motivosMerma[alerta.id] || '';

        // Update alert
        const { error: alertaError } = await supabase
          .from('alertas_transferencia')
          .update({
            cantidad_aceptada: cantidadRecibida,
            cantidad_merma: merma,
            motivo_merma: merma > 0 ? motivoMerma : null,
            estado: merma > 0 ? 'aceptada_parcial' : 'aceptada',
            aceptada_at: new Date().toISOString(),
            aceptada_por: user?.id
          })
          .eq('id', alerta.id);

        if (alertaError) throw alertaError;

        // Register merma if any
        if (merma > 0) {
          await supabase
            .from('mermas_transferencia')
            .insert({
              alerta_transferencia_id: alerta.id,
              insumo_catalogo_id: alerta.insumo_catalogo_id,
              cantidad_enviada: alerta.cantidad_enviada,
              cantidad_recibida: cantidadRecibida,
              cantidad_merma: merma,
              motivo: motivoMerma,
              registrado_por: user?.id
            });
        }

        // Update hospital inventory
        const { data: inventarioExistente } = await supabase
          .from('inventario_hospital')
          .select('*')
          .eq('hospital_id', selectedHospital.id)
          .eq('insumo_catalogo_id', alerta.insumo_catalogo_id)
          .maybeSingle();

        if (inventarioExistente) {
          await supabase
            .from('inventario_hospital')
            .update({
              cantidad_actual: inventarioExistente.cantidad_actual + cantidadRecibida,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventarioExistente.id);
        } else {
          const { data: almacenHospital } = await supabase
            .from('almacenes')
            .select('id')
            .eq('hospital_id', selectedHospital.id)
            .maybeSingle();

          if (almacenHospital) {
            await supabase
              .from('inventario_hospital')
              .insert({
                hospital_id: selectedHospital.id,
                almacen_id: almacenHospital.id,
                insumo_catalogo_id: alerta.insumo_catalogo_id,
                cantidad_actual: cantidadRecibida,
                cantidad_inicial: cantidadRecibida,
                cantidad_minima: 10
              });
          }
        }

        // Update transfer status
        await supabase
          .from('transferencias_central_hospital')
          .update({
            estado: 'recibido',
            recibido_at: new Date().toISOString(),
            recibido_por: user?.id
          })
          .eq('id', alerta.transferencia_id);
      }

      const totalMerma = Object.values(mermas).reduce((sum, m) => sum + m, 0);
      toast.success(
        totalMerma > 0 
          ? `Tirada aceptada con ${totalMerma} unidades de merma total` 
          : `Tirada de ${selectedTirada.alertas.length} insumos aceptada completamente`
      );

      setDialogTiradaOpen(false);
      setSelectedTirada(null);
      fetchAlertas();

    } catch (error) {
      console.error('Error processing tirada:', error);
      toast.error('Error al procesar tirada');
    } finally {
      setProcesando(false);
    }
  };

  const crearAlmacenProvisional = async () => {
    if (!selectedHospital || !nuevoAlmacenNombre.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('almacenes_provisionales')
        .insert({
          hospital_id: selectedHospital.id,
          nombre: nuevoAlmacenNombre.trim(),
          descripcion: nuevoAlmacenDesc.trim() || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Almacén provisional creado');
      setDialogCrearAlmacen(false);
      setNuevoAlmacenNombre('');
      setNuevoAlmacenDesc('');
      fetchAlmacenesProvisionales();
    } catch (error) {
      console.error('Error creating provisional warehouse:', error);
      toast.error('Error al crear almacén provisional');
    }
  };

  const abrirDialogTraspaso = async (almacen: AlmacenProvisional) => {
    if (!selectedHospital) return;
    
    setAlmacenDestinoId(almacen.id);
    
    // Fetch inventario general del hospital
    const { data } = await supabase
      .from('inventario_hospital')
      .select(`
        *,
        insumo:insumos_catalogo(id, nombre, clave)
      `)
      .eq('hospital_id', selectedHospital.id)
      .gt('cantidad_actual', 0);

    setInventarioGeneral(data || []);
    setCantidadesTraspaso({});
    setDialogTraspasoOpen(true);
  };

  const ejecutarTraspaso = async () => {
    if (!selectedHospital || !almacenDestinoId) return;

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const item of inventarioGeneral) {
        const cantidad = cantidadesTraspaso[item.id] || 0;
        if (cantidad <= 0) continue;

        // Descontar del inventario general
        await supabase
          .from('inventario_hospital')
          .update({
            cantidad_actual: item.cantidad_actual - cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Agregar al inventario provisional
        const { data: existente } = await supabase
          .from('almacen_provisional_inventario')
          .select('*')
          .eq('almacen_provisional_id', almacenDestinoId)
          .eq('insumo_catalogo_id', item.insumo_catalogo_id)
          .maybeSingle();

        if (existente) {
          await supabase
            .from('almacen_provisional_inventario')
            .update({
              cantidad_disponible: existente.cantidad_disponible + cantidad,
              updated_at: new Date().toISOString()
            })
            .eq('id', existente.id);
        } else {
          await supabase
            .from('almacen_provisional_inventario')
            .insert({
              almacen_provisional_id: almacenDestinoId,
              insumo_catalogo_id: item.insumo_catalogo_id,
              cantidad_disponible: cantidad
            });
        }

        // Registrar movimiento
        await supabase
          .from('movimientos_almacen_provisional')
          .insert({
            almacen_provisional_id: almacenDestinoId,
            hospital_id: selectedHospital.id,
            insumo_catalogo_id: item.insumo_catalogo_id,
            cantidad: cantidad,
            tipo: 'entrada',
            usuario_id: user?.id,
            observaciones: 'Traspaso desde almacén general'
          });
      }

      const totalItems = Object.values(cantidadesTraspaso).filter(c => c > 0).length;
      toast.success(`${totalItems} insumos traspasados al almacén provisional`);
      setDialogTraspasoOpen(false);
      if (selectedAlmacenProv) {
        fetchInventarioProvisional(selectedAlmacenProv.id);
      }
    } catch (error) {
      console.error('Error executing transfer:', error);
      toast.error('Error al realizar traspaso');
    } finally {
      setProcesando(false);
    }
  };

  const abrirDialogDevolucion = async (almacen: AlmacenProvisional) => {
    setSelectedAlmacenProv(almacen);
    await fetchInventarioProvisional(almacen.id);
    setCantidadesDevolucion({});
    setDialogDevolucionOpen(true);
  };

  const ejecutarDevolucion = async () => {
    if (!selectedHospital || !selectedAlmacenProv) return;

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const item of inventarioProvisional) {
        const cantidad = cantidadesDevolucion[item.id] || 0;
        if (cantidad <= 0) continue;

        // Descontar del provisional
        await supabase
          .from('almacen_provisional_inventario')
          .update({
            cantidad_disponible: item.cantidad_disponible - cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Agregar al inventario general
        const { data: inventarioGenItem } = await supabase
          .from('inventario_hospital')
          .select('*')
          .eq('hospital_id', selectedHospital.id)
          .eq('insumo_catalogo_id', item.insumo_catalogo_id)
          .maybeSingle();

        if (inventarioGenItem) {
          await supabase
            .from('inventario_hospital')
            .update({
              cantidad_actual: inventarioGenItem.cantidad_actual + cantidad,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventarioGenItem.id);
        }

        // Registrar movimiento
        await supabase
          .from('movimientos_almacen_provisional')
          .insert({
            almacen_provisional_id: selectedAlmacenProv.id,
            hospital_id: selectedHospital.id,
            insumo_catalogo_id: item.insumo_catalogo_id,
            cantidad: cantidad,
            tipo: 'devolucion',
            usuario_id: user?.id,
            observaciones: 'Devolución a almacén general'
          });
      }

      const totalItems = Object.values(cantidadesDevolucion).filter(c => c > 0).length;
      toast.success(`${totalItems} insumos devueltos al almacén general`);
      setDialogDevolucionOpen(false);
      fetchInventarioProvisional(selectedAlmacenProv.id);
    } catch (error) {
      console.error('Error executing return:', error);
      toast.error('Error al realizar devolución');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'destructive';
      case 'parcialmente_recibida': return 'secondary';
      case 'completa': return 'outline';
      default: return 'outline';
    }
  };

  const tiradasPendientes = tiradasAgrupadas.filter(t => t.estado !== 'completa');
  const tiradasCompletas = tiradasAgrupadas.filter(t => t.estado === 'completa');

  if (!selectedHospital) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecciona un hospital para ver las alertas de transferencia</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Almacén</h1>
          <p className="text-muted-foreground">Recepción de transferencias y almacenes provisionales</p>
        </div>
        <Button onClick={fetchAlertas} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>
      
      <Tabs defaultValue="tiradas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiradas" className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            Recepción por Tirada
            {tiradasPendientes.length > 0 && (
              <Badge variant="destructive" className="ml-1">{tiradasPendientes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="provisionales" className="flex items-center gap-1">
            <Warehouse className="h-3.5 w-3.5" />
            Almacenes Provisionales
          </TabsTrigger>
          <TabsTrigger value="minimos" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Configurar Mínimos
          </TabsTrigger>
        </TabsList>
        
        {/* Tab: Recepción por Tirada */}
        <TabsContent value="tiradas" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiradas Pendientes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tiradasPendientes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiradas Completas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tiradasCompletas.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Insumos Pendientes</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tiradasPendientes.reduce((sum, t) => sum + t.alertas.filter(a => a.estado === 'pendiente').length, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tiradas Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-destructive" />
                Tiradas Pendientes de Recepción
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Cada tirada agrupa los insumos enviados en un mismo envío desde Cadena de Suministros
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : tiradasPendientes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay tiradas pendientes de recepción
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tiradasPendientes.map((tirada) => (
                    <Card 
                      key={tirada.tirada_id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-destructive"
                      onClick={() => abrirDialogTirada(tirada)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {new Date(tirada.fecha).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </CardTitle>
                          <Badge variant={getEstadoColor(tirada.estado)} className="uppercase text-xs">
                            {tirada.estado.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Insumos:</span>
                            <span className="font-bold">{tirada.total_insumos}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Unidades total:</span>
                            <span className="font-bold">
                              {tirada.alertas.reduce((sum, a) => sum + a.cantidad_enviada, 0)}
                            </span>
                          </div>
                        </div>
                        <Button variant="default" size="sm" className="w-full mt-3">
                          Procesar Tirada <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Tiradas */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Tiradas Recibidas</CardTitle>
            </CardHeader>
            <CardContent>
              {tiradasCompletas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Sin historial</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Insumos</TableHead>
                      <TableHead className="text-right">Total Recibido</TableHead>
                      <TableHead className="text-right">Merma Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiradasCompletas.slice(0, 10).map((tirada) => (
                      <TableRow key={tirada.tirada_id}>
                        <TableCell>
                          {new Date(tirada.fecha).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'short'
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono">{tirada.total_insumos}</TableCell>
                        <TableCell className="text-right font-mono">
                          {tirada.alertas.reduce((sum, a) => sum + (a.cantidad_aceptada || 0), 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {tirada.alertas.reduce((sum, a) => sum + a.cantidad_merma, 0) > 0 ? (
                            <span className="text-destructive">
                              {tirada.alertas.reduce((sum, a) => sum + a.cantidad_merma, 0)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Completa
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

        {/* Tab: Almacenes Provisionales */}
        <TabsContent value="provisionales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Almacenes Provisionales
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestiona almacenes temporales para quirófanos o áreas específicas
                </p>
              </div>
              <Button onClick={() => setDialogCrearAlmacen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Almacén
              </Button>
            </CardHeader>
            <CardContent>
              {almacenesProvisionales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay almacenes provisionales configurados
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {almacenesProvisionales.map((almacen) => (
                    <Card key={almacen.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{almacen.nombre}</CardTitle>
                          <Badge variant={almacen.activo ? 'outline' : 'secondary'}>
                            {almacen.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        {almacen.descripcion && (
                          <p className="text-sm text-muted-foreground">{almacen.descripcion}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => abrirDialogTraspaso(almacen)}
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Traspasar Insumos
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => abrirDialogDevolucion(almacen)}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Devolver al General
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Configurar Mínimos */}
        <TabsContent value="minimos" className="space-y-4">
          <EdicionMasivaMínimos hospitalId={selectedHospital?.id} onActualizado={fetchAlertas} />
        </TabsContent>
      </Tabs>

      {/* Dialog: Procesar Tirada */}
      <Dialog open={dialogTiradaOpen} onOpenChange={setDialogTiradaOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Procesar Tirada - {selectedTirada && new Date(selectedTirada.fecha).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}
            </DialogTitle>
          </DialogHeader>
          {selectedTirada && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 pr-4">
                {selectedTirada.alertas.filter(a => a.estado === 'pendiente').map((alerta) => (
                  <Card key={alerta.id}>
                    <CardContent className="py-3">
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{alerta.insumo?.nombre}</p>
                            <p className="text-sm text-muted-foreground">{alerta.insumo?.clave}</p>
                          </div>
                          <Badge variant="secondary">Enviadas: {alerta.cantidad_enviada}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs">Cantidad Recibida</Label>
                            <Input
                              type="number"
                              min={0}
                              max={alerta.cantidad_enviada}
                              value={cantidadesRecibidas[alerta.id] || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setCantidadesRecibidas(prev => ({ ...prev, [alerta.id]: val }));
                                setMermas(prev => ({ ...prev, [alerta.id]: alerta.cantidad_enviada - val }));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Merma</Label>
                            <Input
                              type="number"
                              min={0}
                              value={mermas[alerta.id] || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMermas(prev => ({ ...prev, [alerta.id]: val }));
                                setCantidadesRecibidas(prev => ({ 
                                  ...prev, 
                                  [alerta.id]: alerta.cantidad_enviada - val 
                                }));
                              }}
                            />
                          </div>
                          {(mermas[alerta.id] || 0) > 0 && (
                            <div>
                              <Label className="text-xs">Motivo Merma</Label>
                              <Input
                                placeholder="Ej: Dañado"
                                value={motivosMerma[alerta.id] || ''}
                                onChange={(e) => setMotivosMerma(prev => ({ 
                                  ...prev, 
                                  [alerta.id]: e.target.value 
                                }))}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTiradaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={procesarTirada} disabled={procesando}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {procesando ? 'Procesando...' : 'Aceptar Tirada Completa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Almacén Provisional */}
      <Dialog open={dialogCrearAlmacen} onOpenChange={setDialogCrearAlmacen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Almacén Provisional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nombre">Nombre del Almacén</Label>
              <Input
                id="nombre"
                value={nuevoAlmacenNombre}
                onChange={(e) => setNuevoAlmacenNombre(e.target.value)}
                placeholder="Ej: Quirófano 1, Área de Recuperación"
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={nuevoAlmacenDesc}
                onChange={(e) => setNuevoAlmacenDesc(e.target.value)}
                placeholder="Descripción del almacén provisional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCrearAlmacen(false)}>
              Cancelar
            </Button>
            <Button onClick={crearAlmacenProvisional} disabled={!nuevoAlmacenNombre.trim()}>
              Crear Almacén
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Traspaso a Provisional */}
      <Dialog open={dialogTraspasoOpen} onOpenChange={setDialogTraspasoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Traspasar a Almacén Provisional
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {inventarioGeneral.map((item) => (
                <Card key={item.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.insumo?.nombre}</p>
                        <p className="text-sm text-muted-foreground">{item.insumo?.clave}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Disponible</p>
                        <p className="font-mono font-bold text-green-600">{item.cantidad_actual}</p>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Traspasar</Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.cantidad_actual}
                          value={cantidadesTraspaso[item.id] || 0}
                          onChange={(e) => setCantidadesTraspaso(prev => ({
                            ...prev,
                            [item.id]: Math.min(parseInt(e.target.value) || 0, item.cantidad_actual)
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTraspasoOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={ejecutarTraspaso} 
              disabled={procesando || Object.values(cantidadesTraspaso).every(v => v <= 0)}
            >
              {procesando ? 'Traspasando...' : 'Confirmar Traspaso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Devolución */}
      <Dialog open={dialogDevolucionOpen} onOpenChange={setDialogDevolucionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Devolver al Almacén General
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {inventarioProvisional.filter(i => i.cantidad_disponible > 0).map((item) => (
                <Card key={item.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.insumo?.nombre}</p>
                        <p className="text-sm text-muted-foreground">{item.insumo?.clave}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">En Provisional</p>
                        <p className="font-mono font-bold">{item.cantidad_disponible}</p>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Devolver</Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.cantidad_disponible}
                          value={cantidadesDevolucion[item.id] || 0}
                          onChange={(e) => setCantidadesDevolucion(prev => ({
                            ...prev,
                            [item.id]: Math.min(parseInt(e.target.value) || 0, item.cantidad_disponible)
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {inventarioProvisional.filter(i => i.cantidad_disponible > 0).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay insumos en este almacén provisional
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDevolucionOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={ejecutarDevolucion} 
              disabled={procesando || Object.values(cantidadesDevolucion).every(v => v <= 0)}
            >
              {procesando ? 'Devolviendo...' : 'Confirmar Devolución'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlmacenistaAlertasTransferencia;