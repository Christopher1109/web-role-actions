import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, DollarSign, CheckCircle, Clock, FileText, CreditCard, Send, Package } from 'lucide-react';

interface OrdenCompra {
  id: string;
  numero_pedido: string;
  estado: string;
  proveedor: string;
  total_items: number;
  created_at: string;
  aprobado_at: string | null;
  items?: OrdenCompraItem[];
}

interface OrdenCompraItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_solicitada: number;
  precio_unitario: number | null;
  estado: string;
  insumo?: { id: string; nombre: string; clave: string };
}

const FinanzasDashboard = () => {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedidos_compra')
        .select(`
          *,
          items:pedido_items(
            *,
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `)
        .in('estado', ['enviado_a_finanzas', 'pagado_espera_confirmacion', 'recibido'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdenes(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = (orden: OrdenCompra) => {
    setSelectedOrden(orden);
    setDialogOpen(true);
  };

  const marcarComoPagada = async (orden: OrdenCompra) => {
    setProcesando(orden.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update order to "pagado_espera_confirmacion" and send back to Gerente Almacen -> Cadena Suministros
      const { error } = await supabase
        .from('pedidos_compra')
        .update({
          estado: 'pagado_espera_confirmacion',
          aprobado_at: new Date().toISOString(),
          aprobado_por: user?.id
        })
        .eq('id', orden.id);

      if (error) throw error;

      toast.success(`Orden ${orden.numero_pedido} marcada como pagada. Enviada a Cadena de Suministros para recepción.`);
      setDialogOpen(false);
      fetchOrdenes();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar orden');
    } finally {
      setProcesando(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'enviado_a_finanzas':
        return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" />Pendiente de Pago</Badge>;
      case 'pagado_espera_confirmacion':
        return <Badge className="bg-amber-100 text-amber-800 gap-1"><Send className="h-3 w-3" />Pagado - En Espera</Badge>;
      case 'recibido':
        return <Badge variant="outline" className="bg-green-50 text-green-700 gap-1"><CheckCircle className="h-3 w-3" />Recibido</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const calcularTotalOrden = (orden: OrdenCompra) => {
    if (!orden.items) return 0;
    return orden.items.reduce((sum, item) => {
      const precio = item.precio_unitario || 100; // Default price for demo
      return sum + (precio * item.cantidad_solicitada);
    }, 0);
  };

  const ordenesPendientes = ordenes.filter(o => o.estado === 'enviado_a_finanzas');
  const ordenesEnEspera = ordenes.filter(o => o.estado === 'pagado_espera_confirmacion');
  const ordenesRecibidas = ordenes.filter(o => o.estado === 'recibido');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Finanzas</h1>
          <p className="text-muted-foreground">Gestión de pagos de órdenes de compra</p>
        </div>
        <Button onClick={fetchOrdenes} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Pago</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{ordenesPendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${ordenesPendientes.reduce((sum, o) => sum + calcularTotalOrden(o), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Espera de Recepción</CardTitle>
            <Send className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{ordenesEnEspera.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{ordenesRecibidas.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes de Pago
            {ordenesPendientes.length > 0 && (
              <Badge variant="destructive" className="ml-2">{ordenesPendientes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="espera">
            En Espera
            {ordenesEnEspera.length > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-800">{ordenesEnEspera.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completadas">Completadas</TabsTrigger>
        </TabsList>

        {/* Pendientes de Pago */}
        <TabsContent value="pendientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Órdenes Pendientes de Pago
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Revisa y aprueba los pagos. Una vez pagado, la orden se enviará a Cadena de Suministros.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : ordenesPendientes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay órdenes pendientes de pago
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesPendientes.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono font-bold">{orden.numero_pedido}</TableCell>
                        <TableCell>
                          {new Date(orden.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>{orden.proveedor || 'Por definir'}</TableCell>
                        <TableCell className="text-right">{orden.total_items}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${calcularTotalOrden(orden).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => verDetalle(orden)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Ver y Pagar
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

        {/* En Espera de Recepción */}
        <TabsContent value="espera" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Órdenes Pagadas en Espera de Confirmación
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Estas órdenes fueron pagadas y están esperando que Cadena de Suministros confirme la recepción.
              </p>
            </CardHeader>
            <CardContent>
              {ordenesEnEspera.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay órdenes en espera
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesEnEspera.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono">{orden.numero_pedido}</TableCell>
                        <TableCell>
                          {orden.aprobado_at ? new Date(orden.aprobado_at).toLocaleDateString('es-MX') : '-'}
                        </TableCell>
                        <TableCell>{orden.proveedor || 'Por definir'}</TableCell>
                        <TableCell className="text-right">{orden.total_items}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${calcularTotalOrden(orden).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(orden.estado)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completadas */}
        <TabsContent value="completadas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Órdenes Completadas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Órdenes pagadas y recibidas en el Almacén Central
              </p>
            </CardHeader>
            <CardContent>
              {ordenesRecibidas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay órdenes completadas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesRecibidas.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono">{orden.numero_pedido}</TableCell>
                        <TableCell>
                          {orden.aprobado_at ? new Date(orden.aprobado_at).toLocaleDateString('es-MX') : '-'}
                        </TableCell>
                        <TableCell>{orden.proveedor || 'Por definir'}</TableCell>
                        <TableCell className="text-right">{orden.total_items}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${calcularTotalOrden(orden).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(orden.estado)}
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

      {/* Dialog: Ver detalle y pagar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Orden de Compra {selectedOrden?.numero_pedido}
            </DialogTitle>
          </DialogHeader>
          {selectedOrden && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{new Date(selectedOrden.created_at).toLocaleDateString('es-MX')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{selectedOrden.proveedor || 'Por definir'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Estimado</p>
                  <p className="font-mono font-bold text-lg">${calcularTotalOrden(selectedOrden).toLocaleString()}</p>
                </div>
              </div>

              <ScrollArea className="max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrden.items?.map((item) => {
                      const precio = item.precio_unitario || 100;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                          <TableCell>{item.insumo?.nombre}</TableCell>
                          <TableCell className="text-right font-mono">{item.cantidad_solicitada}</TableCell>
                          <TableCell className="text-right font-mono">${precio}</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            ${(precio * item.cantidad_solicitada).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">Total a Pagar</p>
                  <p className="text-2xl font-bold">${calcularTotalOrden(selectedOrden).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            {selectedOrden?.estado === 'enviado_a_finanzas' && (
              <Button 
                onClick={() => selectedOrden && marcarComoPagada(selectedOrden)}
                disabled={procesando === selectedOrden?.id}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {procesando === selectedOrden?.id ? 'Procesando...' : 'Confirmar Pago'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanzasDashboard;
