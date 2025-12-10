import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload, Package, ShoppingCart, CheckCircle, RefreshCw, Warehouse, Send, Clock, FileText, DollarSign, CreditCard, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { StatusTimeline, StatusBadge } from '@/components/StatusTimeline';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface DocumentoAgrupado {
  id: string;
  fecha_generacion: string;
  estado: string;
  enviado_a_gerente_almacen: boolean;
  procesado_por_almacen: boolean;
  procesado_at: string | null;
  detalles?: DetalleAgrupado[];
}

interface DetalleAgrupado {
  id: string;
  insumo_catalogo_id: string;
  total_faltante_requerido: number;
  cantidad_cubierta?: number;
  cantidad_pendiente?: number;
  insumo?: { id: string; nombre: string; clave: string };
}

interface OrdenCompra {
  id: string;
  numero_pedido: string;
  estado: string;
  proveedor: string;
  total_items: number;
  created_at: string;
  documento_origen_id: string | null;
  enviado_a_cadena: boolean;
  aprobado_at: string | null;
  items?: OrdenCompraItem[];
}

interface OrdenCompraItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_solicitada: number;
  cantidad_recibida: number;
  precio_unitario: number | null;
  estado: string;
  insumo?: { id: string; nombre: string; clave: string };
}

interface AlmacenCentralItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_disponible: number;
  lote: string;
  fecha_caducidad: string;
  insumo?: { id: string; nombre: string; clave: string };
}

const GerenteAlmacenDashboard = () => {
  const [documentos, setDocumentos] = useState<DocumentoAgrupado[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [almacenCentral, setAlmacenCentral] = useState<AlmacenCentralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Dialog for setting prices
  const [preciosDialogOpen, setPreciosDialogOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState<OrdenCompra | null>(null);
  const [precios, setPrecios] = useState<Record<string, number>>({});

  const fetchDataCallback = useCallback(() => {
    fetchData();
  }, []);

  // Realtime notifications
  useRealtimeNotifications({
    userRole: 'gerente_almacen',
    onDocumentoAgrupado: fetchDataCallback,
    onPedidoActualizado: fetchDataCallback,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch documentos agrupados que fueron enviados
      const { data: docsData, error: docsError } = await supabase
        .from('documentos_necesidades_agrupado')
        .select(`
          *,
          detalles:documento_agrupado_detalle(
            *,
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `)
        .eq('enviado_a_gerente_almacen', true)
        .order('fecha_generacion', { ascending: false })
        .limit(20);

      if (docsError) throw docsError;
      setDocumentos(docsData || []);

      // Fetch ordenes de compra
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('pedidos_compra')
        .select(`
          *,
          items:pedido_items(
            *,
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `)
        .order('created_at', { ascending: false });

      if (ordenesError) throw ordenesError;
      setOrdenesCompra(ordenesData || []);

      // Fetch almacen central
      const { data: almacenData, error: almacenError } = await supabase
        .from('almacen_central')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .order('cantidad_disponible', { ascending: false });

      if (almacenError) throw almacenError;
      setAlmacenCentral(almacenData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const descargarExcelParaProveedor = (documento: DocumentoAgrupado) => {
    if (!documento.detalles || documento.detalles.length === 0) {
      toast.error('El documento no tiene detalles');
      return;
    }

    // Filter only items with pending quantities (total - covered > 0)
    const detallesPendientes = documento.detalles.filter(d => {
      const pendiente = d.total_faltante_requerido - (d.cantidad_cubierta || 0);
      return pendiente > 0;
    });

    if (detallesPendientes.length === 0) {
      toast.info('Todos los insumos de este documento ya están cubiertos');
      return;
    }

    const data = detallesPendientes.map((d, index) => ({
      'No.': index + 1,
      'Clave': d.insumo?.clave || 'N/A',
      'Nombre del Insumo': d.insumo?.nombre || 'N/A',
      'Cantidad Total Requerida': d.total_faltante_requerido,
      'Ya Cubierto': d.cantidad_cubierta || 0,
      'Cantidad Pendiente': d.total_faltante_requerido - (d.cantidad_cubierta || 0),
      'Cantidad Proveedor': '',
      'Precio Unitario ($)': '',
      'ID Sistema': d.insumo_catalogo_id
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    ws['!cols'] = [
      { wch: 6 },   // No.
      { wch: 18 },  // Clave
      { wch: 55 },  // Nombre del Insumo
      { wch: 22 },  // Cantidad Total Requerida
      { wch: 15 },  // Ya Cubierto
      { wch: 20 },  // Cantidad Pendiente
      { wch: 22 },  // Cantidad Proveedor
      { wch: 20 },  // Precio Unitario
      { wch: 40 }   // ID Sistema
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitud Proveedor');
    
    const infoData = [
      { Campo: 'Fecha de Generación', Valor: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) },
      { Campo: 'Items Pendientes', Valor: detallesPendientes.length },
      { Campo: 'ID Documento', Valor: documento.id },
      { Campo: '', Valor: '' },
      { Campo: 'Instrucciones', Valor: 'Complete "Cantidad Proveedor" y "Precio Unitario". Puede crear múltiples órdenes parciales.' }
    ];
    const wsInfo = XLSX.utils.json_to_sheet(infoData);
    wsInfo['!cols'] = [{ wch: 25 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');
    
    XLSX.writeFile(wb, `Solicitud_Proveedor_${new Date().toISOString().split('T')[0]}_${documento.id.slice(0, 8)}.xlsx`);
    
    toast.success('Excel descargado correctamente');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocId) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
          'No.': number;
          'Clave': string;
          'Nombre del Insumo': string;
          'Cantidad Requerida': number;
          'Cantidad Proveedor': number;
          'Precio Unitario ($)': number;
          'ID Sistema': string;
        }>;

        const itemsConCantidad = jsonData.filter(row => 
          row['Cantidad Proveedor'] && row['Cantidad Proveedor'] > 0
        );

        if (itemsConCantidad.length === 0) {
          toast.error('No se encontraron items con cantidad de proveedor');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const numeroPedido = `OC-${Date.now().toString(36).toUpperCase()}`;

        // Calculate total from prices
        const totalEstimado = itemsConCantidad.reduce((sum, row) => {
          const precio = row['Precio Unitario'] || 100;
          return sum + (precio * row['Cantidad Proveedor']);
        }, 0);

        const { data: orden, error: ordenError } = await supabase
          .from('pedidos_compra')
          .insert({
            numero_pedido: numeroPedido,
            creado_por: user?.id,
            total_items: itemsConCantidad.length,
            estado: 'pendiente',
            proveedor: 'Por definir',
            documento_origen_id: selectedDocId
          })
          .select()
          .single();

        if (ordenError) throw ordenError;

        const items = itemsConCantidad.map(row => ({
          pedido_id: orden.id,
          insumo_catalogo_id: row['ID Sistema'],
          cantidad_solicitada: row['Cantidad Proveedor'],
          cantidad_recibida: 0,
          precio_unitario: row['Precio Unitario ($)'] || null,
          estado: 'pendiente'
        }));

        const { error: itemsError } = await supabase
          .from('pedido_items')
          .insert(items);

        if (itemsError) throw itemsError;

        // Update cantidad_cubierta for each detail item
        for (const row of itemsConCantidad) {
          const insumoId = row['ID Sistema'];
          const cantidadProveedor = row['Cantidad Proveedor'];
          
          const { data: det } = await supabase
            .from('documento_agrupado_detalle')
            .select('id, cantidad_cubierta')
            .eq('documento_id', selectedDocId)
            .eq('insumo_catalogo_id', insumoId)
            .single();

          if (det) {
            await supabase
              .from('documento_agrupado_detalle')
              .update({ 
                cantidad_cubierta: (det.cantidad_cubierta || 0) + cantidadProveedor 
              })
              .eq('id', det.id);
          }
        }

        // Check if all items are fully covered - only then mark as processed
        const { data: allDetails } = await supabase
          .from('documento_agrupado_detalle')
          .select('total_faltante_requerido, cantidad_cubierta')
          .eq('documento_id', selectedDocId);

        const allCovered = allDetails?.every(d => 
          (d.cantidad_cubierta || 0) >= d.total_faltante_requerido
        );

        if (allCovered) {
          await supabase
            .from('documentos_necesidades_agrupado')
            .update({
              procesado_por_almacen: true,
              procesado_at: new Date().toISOString()
            })
            .eq('id', selectedDocId);
        }

        toast.success(`Orden de compra ${numeroPedido} creada con ${itemsConCantidad.length} items`);
        setSelectedDocId(null);
        fetchData();
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error al procesar archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const abrirPreciosDialog = (orden: OrdenCompra) => {
    setOrdenEditando(orden);
    const initialPrecios: Record<string, number> = {};
    orden.items?.forEach(item => {
      initialPrecios[item.id] = item.precio_unitario || 100;
    });
    setPrecios(initialPrecios);
    setPreciosDialogOpen(true);
  };

  const guardarPreciosYEnviarAFinanzas = async () => {
    if (!ordenEditando) return;

    setProcessingDoc(ordenEditando.id);
    try {
      // Update prices for all items
      for (const item of ordenEditando.items || []) {
        await supabase
          .from('pedido_items')
          .update({ precio_unitario: precios[item.id] || 100 })
          .eq('id', item.id);
      }

      // Update order status to sent to finance
      await supabase
        .from('pedidos_compra')
        .update({
          estado: 'enviado_a_finanzas',
          updated_at: new Date().toISOString()
        })
        .eq('id', ordenEditando.id);

      toast.success(`Orden ${ordenEditando.numero_pedido} enviada a Finanzas para pago`);
      setPreciosDialogOpen(false);
      setOrdenEditando(null);
      fetchData();
    } catch (error) {
      console.error('Error sending to finance:', error);
      toast.error('Error al enviar a finanzas');
    } finally {
      setProcessingDoc(null);
    }
  };

  const calcularTotalOrden = (orden: OrdenCompra) => {
    if (!orden.items) return 0;
    return orden.items.reduce((sum, item) => {
      const precio = item.precio_unitario || 100;
      return sum + (precio * item.cantidad_solicitada);
    }, 0);
  };

  const getEstadoBadge = (estado: string) => {
    return <StatusTimeline currentStatus={estado} tipo="pedido" />;
  };

  // Simulación de confirmación de pago (provisional)
  const simularConfirmacionPago = async (orden: OrdenCompra) => {
    setProcessingDoc(orden.id);
    try {
      // Actualizar estado a pagado y enviado a cadena
      await supabase
        .from('pedidos_compra')
        .update({
          estado: 'pagado_espera_confirmacion',
          aprobado_at: new Date().toISOString(),
          enviado_a_cadena: true,
          enviado_a_cadena_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orden.id);

      toast.success(`Pago confirmado. Orden ${orden.numero_pedido} enviada a Cadena de Suministros`);
      fetchData();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Error al confirmar pago');
    } finally {
      setProcessingDoc(null);
    }
  };

  const documentosPendientes = documentos.filter(d => !d.procesado_por_almacen);
  const ordenesPendientes = ordenesCompra.filter(o => o.estado === 'pendiente');
  const ordenesEnFinanzas = ordenesCompra.filter(o => o.estado === 'enviado_a_finanzas');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Gerente de Almacén</h1>
          <p className="text-muted-foreground">Gestión de compras y almacén central</p>
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
            <CardTitle className="text-sm font-medium">Documentos Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentosPendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes por Enviar</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordenesPendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items en Almacén</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{almacenCentral.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total Central</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {almacenCentral.reduce((sum, item) => sum + item.cantidad_disponible, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documentos">
            Documentos Recibidos
            {documentosPendientes.length > 0 && (
              <Badge variant="destructive" className="ml-2">{documentosPendientes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ordenes">
            Órdenes de Compra
            {ordenesPendientes.length > 0 && (
              <Badge variant="secondary" className="ml-2">{ordenesPendientes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="almacen">Almacén Central</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de Necesidades Recibidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Descarga el Excel, consulta con proveedores, y sube la respuesta con precios.
              </p>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                className="hidden"
              />

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : documentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay documentos recibidos
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Recibido</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total Requerido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentos.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          {new Date(doc.fecha_generacion).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-right">{doc.detalles?.length || 0}</TableCell>
                        <TableCell className="text-right font-mono">
                          {doc.detalles?.reduce((sum, d) => sum + d.total_faltante_requerido, 0).toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          {doc.procesado_por_almacen ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Procesado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => descargarExcelParaProveedor(doc)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Descargar Excel
                            </Button>
                            {!doc.procesado_por_almacen && (
                              <Button 
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedDocId(doc.id);
                                  fileInputRef.current?.click();
                                }}
                                disabled={uploading}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {uploading ? 'Procesando...' : 'Subir Respuesta'}
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

        <TabsContent value="ordenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <p className="text-sm text-muted-foreground">
                Revisa las órdenes, ajusta precios si es necesario, y envía a Finanzas para pago.
              </p>
            </CardHeader>
            <CardContent>
              {ordenesCompra.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay órdenes de compra
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total Estimado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesCompra.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono font-bold">{orden.numero_pedido}</TableCell>
                        <TableCell>
                          {new Date(orden.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell className="text-right">{orden.total_items}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${calcularTotalOrden(orden).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(orden.estado)}
                        </TableCell>
                        <TableCell>
                          {orden.estado === 'pendiente' && (
                            <Button 
                              size="sm"
                              onClick={() => abrirPreciosDialog(orden)}
                              disabled={processingDoc === orden.id}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Enviar a Finanzas
                            </Button>
                          )}
                          {orden.estado === 'enviado_a_finanzas' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              onClick={() => simularConfirmacionPago(orden)}
                              disabled={processingDoc === orden.id}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              {processingDoc === orden.id ? 'Procesando...' : 'Simular Confirmación de Pago'}
                            </Button>
                          )}
                          {orden.estado === 'pagado_espera_confirmacion' && (
                            <Badge className="bg-cyan-100 text-cyan-800">
                              <Truck className="mr-1 h-3 w-3" />
                              Esperando recepción
                            </Badge>
                          )}
                          {orden.estado === 'recibido' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Completado
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

        <TabsContent value="almacen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock del Almacén Central México</CardTitle>
            </CardHeader>
            <CardContent>
              {almacenCentral.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay stock en el almacén central
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Cantidad Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {almacenCentral.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                        <TableCell className="font-medium">{item.insumo?.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{item.lote}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600">
                          {item.cantidad_disponible.toLocaleString()}
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

      {/* Dialog: Edit prices and send to finance */}
      <Dialog open={preciosDialogOpen} onOpenChange={setPreciosDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revisar Precios - Orden {ordenEditando?.numero_pedido}
            </DialogTitle>
          </DialogHeader>
          {ordenEditando && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Revisa o ajusta los precios antes de enviar a Finanzas para pago:
              </p>
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenEditando.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                        <TableCell>{item.insumo?.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{item.cantidad_solicitada}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={precios[item.id] || 100}
                            onChange={(e) => setPrecios({
                              ...precios,
                              [item.id]: Number(e.target.value)
                            })}
                            className="w-24 h-8 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${((precios[item.id] || 100) * item.cantidad_solicitada).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">Total de la Orden</p>
                  <p className="text-2xl font-bold">
                    ${ordenEditando.items?.reduce((sum, item) => 
                      sum + ((precios[item.id] || 100) * item.cantidad_solicitada), 0
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreciosDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={guardarPreciosYEnviarAFinanzas}
              disabled={processingDoc === ordenEditando?.id}
            >
              <Send className="mr-2 h-4 w-4" />
              {processingDoc === ordenEditando?.id ? 'Enviando...' : 'Enviar a Finanzas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenteAlmacenDashboard;
