import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, DollarSign, CheckCircle, Clock, FileText } from 'lucide-react';

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
        .in('estado', ['pendiente', 'aprobado', 'pagada'])
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

  const marcarComoPagada = async (orden: OrdenCompra) => {
    setProcesando(orden.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('pedidos_compra')
        .update({
          estado: 'pagada',
          aprobado_at: new Date().toISOString(),
          aprobado_por: user?.id
        })
        .eq('id', orden.id);

      if (error) throw error;

      toast.success(`Orden ${orden.numero_pedido} marcada como pagada`);
      fetchOrdenes();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar orden');
    } finally {
      setProcesando(null);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'secondary';
      case 'aprobado': return 'outline';
      case 'pagada': return 'outline';
      default: return 'outline';
    }
  };

  const calcularTotalOrden = (orden: OrdenCompra) => {
    if (!orden.items) return 0;
    return orden.items.reduce((sum, item) => {
      const precio = item.precio_unitario || 100; // Default price for demo
      return sum + (precio * item.cantidad_solicitada);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Finanzas</h1>
          <p className="text-muted-foreground">Gestión de pagos de órdenes de compra (Demo)</p>
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
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenes.filter(o => o.estado === 'pendiente').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${ordenes
                .filter(o => o.estado === 'pendiente')
                .reduce((sum, o) => sum + calcularTotalOrden(o), 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas Este Mes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenes.filter(o => o.estado === 'pagada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${ordenes
                .filter(o => o.estado === 'pagada')
                .reduce((sum, o) => sum + calcularTotalOrden(o), 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revisa y aprueba los pagos de las órdenes de compra
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : ordenes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay órdenes pendientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Estimado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes.map((orden) => (
                  <TableRow key={orden.id}>
                    <TableCell className="font-mono">{orden.numero_pedido}</TableCell>
                    <TableCell>
                      {new Date(orden.created_at).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>{orden.proveedor || 'Por definir'}</TableCell>
                    <TableCell className="text-right">{orden.total_items}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${calcularTotalOrden(orden).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoColor(orden.estado)}>
                        {orden.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {orden.estado === 'pendiente' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => marcarComoPagada(orden)}
                          disabled={procesando === orden.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {procesando === orden.id ? 'Procesando...' : 'Marcar Pagada'}
                        </Button>
                      )}
                      {orden.estado === 'pagada' && (
                        <span className="text-sm text-muted-foreground">
                          Pagada el {orden.aprobado_at ? new Date(orden.aprobado_at).toLocaleDateString('es-MX') : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Nota de Demostración</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este es un módulo de demostración. En producción, este panel incluiría:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>Integración con sistema contable</li>
            <li>Generación de facturas</li>
            <li>Reportes de gastos por período</li>
            <li>Aprobaciones multinivel</li>
            <li>Historial de pagos completo</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanzasDashboard;
