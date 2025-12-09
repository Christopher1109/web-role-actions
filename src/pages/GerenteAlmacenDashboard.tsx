import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Warehouse,
  FileText,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileDown,
  Plus,
  Eye
} from 'lucide-react';

interface FormatoConsolidado {
  id: string;
  tipo: string;
  estado: string;
  created_at: string;
  data_json: {
    fecha_generacion?: string;
    total_insumos_unicos?: number;
    total_unidades?: number;
    insumos_consolidados?: Array<{
      nombre: string;
      clave: string;
      cantidad_total: number;
      hospitales: string[];
    }>;
    total_hospitales?: number;
    total_insumos?: number;
    requerimientos_por_hospital?: Record<string, Array<{ insumo: string; clave: string; cantidad: number }>>;
  };
}

interface PedidoCompra {
  id: string;
  numero_pedido: string;
  estado: string;
  proveedor: string | null;
  fecha_estimada_entrega: string | null;
  total_items: number;
  notas: string | null;
  created_at: string;
}

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  en_proceso: 'bg-blue-100 text-blue-800 border-blue-300',
  enviado_proveedor: 'bg-purple-100 text-purple-800 border-purple-300',
  recibido_parcial: 'bg-orange-100 text-orange-800 border-orange-300',
  completado: 'bg-green-100 text-green-800 border-green-300',
  cancelado: 'bg-red-100 text-red-800 border-red-300',
};

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  enviado_proveedor: 'Enviado a Proveedor',
  recibido_parcial: 'Recibido Parcial',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export default function GerenteAlmacenDashboard() {
  const { user } = useAuth();
  const [formatos, setFormatos] = useState<FormatoConsolidado[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormato, setSelectedFormato] = useState<FormatoConsolidado | null>(null);
  const [creatingPedido, setCreatingPedido] = useState(false);
  const [newPedido, setNewPedido] = useState({
    proveedor: '',
    fecha_estimada: '',
    notas: '',
  });

  const [stats, setStats] = useState({
    formatosPendientes: 0,
    pedidosActivos: 0,
    pedidosCompletados: 0,
    totalUnidadesPendientes: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFormatos(),
      fetchPedidos(),
    ]);
    setLoading(false);
  };

  const fetchFormatos = async () => {
    try {
      const { data, error } = await supabase
        .from('formatos_generados')
        .select('*')
        .eq('tipo', 'consolidado_almacen')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatosData = (data || []) as FormatoConsolidado[];
      setFormatos(formatosData);

      // Calcular stats
      const pendientes = formatosData.filter(f => f.estado === 'generado' || f.estado === 'enviado');
      const totalUnidades = pendientes.reduce((sum, f) => sum + (f.data_json.total_unidades || 0), 0);
      
      setStats(prev => ({
        ...prev,
        formatosPendientes: pendientes.length,
        totalUnidadesPendientes: totalUnidades,
      }));
    } catch (error) {
      console.error('Error fetching formatos:', error);
      toast.error('Error al cargar formatos');
    }
  };

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos_compra')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosData = (data || []) as PedidoCompra[];
      setPedidos(pedidosData);

      // Stats
      const activos = pedidosData.filter(p => !['completado', 'cancelado'].includes(p.estado));
      const completados = pedidosData.filter(p => p.estado === 'completado');

      setStats(prev => ({
        ...prev,
        pedidosActivos: activos.length,
        pedidosCompletados: completados.length,
      }));
    } catch (error) {
      console.error('Error fetching pedidos:', error);
    }
  };

  const handleCrearPedido = async () => {
    if (!selectedFormato) return;

    try {
      const numeroPedido = `PED-${Date.now().toString(36).toUpperCase()}`;
      const totalItems = selectedFormato.data_json.total_insumos_unicos || 
                        selectedFormato.data_json.insumos_consolidados?.length || 0;

      // Crear pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos_compra')
        .insert({
          numero_pedido: numeroPedido,
          formato_origen_id: selectedFormato.id,
          proveedor: newPedido.proveedor || null,
          fecha_estimada_entrega: newPedido.fecha_estimada || null,
          notas: newPedido.notas || null,
          total_items: totalItems,
          creado_por: user?.id,
          estado: 'pendiente',
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Crear items del pedido
      if (selectedFormato.data_json.insumos_consolidados && pedidoData) {
        for (const insumo of selectedFormato.data_json.insumos_consolidados) {
          // Buscar el insumo en el catálogo por clave
          const { data: catalogoData } = await supabase
            .from('insumos_catalogo')
            .select('id')
            .eq('clave', insumo.clave)
            .maybeSingle();

          if (catalogoData) {
            await supabase
              .from('pedido_items')
              .insert({
                pedido_id: pedidoData.id,
                insumo_catalogo_id: catalogoData.id,
                cantidad_solicitada: insumo.cantidad_total,
                estado: 'pendiente',
              });
          }
        }
      }

      // Actualizar estado del formato
      await supabase
        .from('formatos_generados')
        .update({ estado: 'procesando_almacen' })
        .eq('id', selectedFormato.id);

      toast.success(`Pedido ${numeroPedido} creado exitosamente`);
      setCreatingPedido(false);
      setSelectedFormato(null);
      setNewPedido({ proveedor: '', fecha_estimada: '', notas: '' });
      fetchAllData();
    } catch (error) {
      console.error('Error creating pedido:', error);
      toast.error('Error al crear pedido');
    }
  };

  const handleUpdateEstado = async (pedidoId: string, nuevoEstado: string) => {
    try {
      const updates: Record<string, unknown> = { estado: nuevoEstado };
      
      if (nuevoEstado === 'completado') {
        updates.completado_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pedidos_compra')
        .update(updates)
        .eq('id', pedidoId);

      if (error) throw error;

      toast.success('Estado actualizado');
      fetchPedidos();
    } catch (error) {
      console.error('Error updating estado:', error);
      toast.error('Error al actualizar estado');
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

  const formatosPendientes = formatos.filter(f => f.estado === 'generado' || f.estado === 'enviado');
  const formatosProcesados = formatos.filter(f => f.estado === 'procesando_almacen' || f.estado === 'procesado');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Warehouse className="h-8 w-8 text-primary" />
            Dashboard Gerente de Almacén
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de compras y requerimientos consolidados
          </p>
        </div>
        <Button onClick={fetchAllData} variant="outline" disabled={loading}>
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Formatos Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.formatosPendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades a Comprar</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnidadesPendientes}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Pedidos Activos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.pedidosActivos}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.pedidosCompletados}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="formatos" className="w-full">
        <TabsList>
          <TabsTrigger value="formatos">
            Formatos Recibidos ({formatos.length})
          </TabsTrigger>
          <TabsTrigger value="pedidos">
            Pedidos de Compra ({pedidos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Formatos */}
        <TabsContent value="formatos" className="mt-4 space-y-4">
          {/* Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Formatos Pendientes de Procesar
              </CardTitle>
              <CardDescription>
                Requerimientos consolidados del Gerente de Operaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formatosPendientes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay formatos pendientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Insumos Únicos</TableHead>
                      <TableHead>Total Unidades</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formatosPendientes.map((formato) => (
                      <TableRow key={formato.id}>
                        <TableCell>
                          {new Date(formato.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formato.data_json.total_insumos_unicos || formato.data_json.insumos_consolidados?.length || 0}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {formato.data_json.total_unidades || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            {formato.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFormato(formato)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFormato(formato);
                                setCreatingPedido(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Crear Pedido
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Procesados */}
          {formatosProcesados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Formatos Procesados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Insumos</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formatosProcesados.map((formato) => (
                      <TableRow key={formato.id}>
                        <TableCell>
                          {new Date(formato.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>{formato.data_json.total_insumos_unicos || 0}</TableCell>
                        <TableCell>{formato.data_json.total_unidades || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Procesado
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadJSON(formato.data_json, 'formato')}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Pedidos */}
        <TabsContent value="pedidos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Pedidos de Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pedidos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay pedidos de compra</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Pedido</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Fecha Estimada</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidos.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-mono font-bold">
                          {pedido.numero_pedido}
                        </TableCell>
                        <TableCell>{pedido.proveedor || '-'}</TableCell>
                        <TableCell className="text-center">{pedido.total_items}</TableCell>
                        <TableCell>
                          {pedido.fecha_estimada_entrega 
                            ? new Date(pedido.fecha_estimada_entrega).toLocaleDateString('es-MX')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={estadoColors[pedido.estado]}>
                            {estadoLabels[pedido.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(pedido.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={pedido.estado}
                            onValueChange={(value) => handleUpdateEstado(pedido.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_proceso">En Proceso</SelectItem>
                              <SelectItem value="enviado_proveedor">Enviado a Proveedor</SelectItem>
                              <SelectItem value="recibido_parcial">Recibido Parcial</SelectItem>
                              <SelectItem value="completado">Completado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
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

      {/* Dialog: Ver Formato */}
      <Dialog open={!!selectedFormato && !creatingPedido} onOpenChange={() => setSelectedFormato(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Formato Consolidado</DialogTitle>
          </DialogHeader>
          {selectedFormato && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-bold">
                      {new Date(selectedFormato.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Insumos Únicos</p>
                    <p className="font-bold text-xl">
                      {selectedFormato.data_json.total_insumos_unicos || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Unidades</p>
                    <p className="font-bold text-xl text-primary">
                      {selectedFormato.data_json.total_unidades || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Insumos Consolidados</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead>Clave</TableHead>
                        <TableHead className="text-center">Cantidad Total</TableHead>
                        <TableHead>Hospitales</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFormato.data_json.insumos_consolidados?.map((insumo, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{insumo.nombre}</TableCell>
                          <TableCell className="font-mono text-sm">{insumo.clave}</TableCell>
                          <TableCell className="text-center font-bold text-primary">
                            {insumo.cantidad_total}
                          </TableCell>
                          <TableCell className="text-sm">
                            {insumo.hospitales?.join(', ') || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFormato(null)}>
              Cerrar
            </Button>
            <Button onClick={() => downloadJSON(selectedFormato!.data_json, 'consolidado')}>
              <FileDown className="h-4 w-4 mr-2" />
              Descargar JSON
            </Button>
            <Button onClick={() => setCreatingPedido(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Pedido */}
      <Dialog open={creatingPedido} onOpenChange={() => { setCreatingPedido(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Pedido de Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFormato && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Basado en formato del</p>
                <p className="font-bold">
                  {new Date(selectedFormato.created_at).toLocaleDateString('es-MX')}
                </p>
                <p className="text-sm">
                  {selectedFormato.data_json.total_insumos_unicos || 0} insumos, {selectedFormato.data_json.total_unidades || 0} unidades
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="proveedor">Proveedor (opcional)</Label>
              <Input
                id="proveedor"
                value={newPedido.proveedor}
                onChange={(e) => setNewPedido({ ...newPedido, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div>
              <Label htmlFor="fecha">Fecha Estimada de Entrega (opcional)</Label>
              <Input
                id="fecha"
                type="date"
                value={newPedido.fecha_estimada}
                onChange={(e) => setNewPedido({ ...newPedido, fecha_estimada: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                value={newPedido.notas}
                onChange={(e) => setNewPedido({ ...newPedido, notas: e.target.value })}
                placeholder="Notas adicionales del pedido..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingPedido(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearPedido}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Crear Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
