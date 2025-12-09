import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload, Package, ShoppingCart, CheckCircle, RefreshCw, Warehouse } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DocumentoAgrupado {
  id: string;
  fecha_generacion: string;
  estado: string;
  detalles?: DetalleAgrupado[];
}

interface DetalleAgrupado {
  id: string;
  insumo_catalogo_id: string;
  total_faltante_requerido: number;
  insumo?: { id: string; nombre: string; clave: string };
}

interface OrdenCompra {
  id: string;
  numero_pedido: string;
  estado: string;
  proveedor: string;
  total_items: number;
  created_at: string;
  items?: OrdenCompraItem[];
}

interface OrdenCompraItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_solicitada: number;
  cantidad_recibida: number;
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
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoAgrupado | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch documentos agrupados
      const { data: docsData, error: docsError } = await supabase
        .from('documentos_necesidades_agrupado')
        .select(`
          *,
          detalles:documento_agrupado_detalle(
            *,
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `)
        .order('fecha_generacion', { ascending: false })
        .limit(10);

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

    const data = documento.detalles.map(d => ({
      'ID Insumo': d.insumo_catalogo_id,
      'Clave': d.insumo?.clave || 'N/A',
      'Nombre Insumo': d.insumo?.nombre || 'N/A',
      'Cantidad Requerida': d.total_faltante_requerido,
      'Cantidad Proveedor': '' // Columna vacía para que el proveedor llene
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // ID Insumo
      { wch: 15 }, // Clave
      { wch: 50 }, // Nombre
      { wch: 20 }, // Cantidad Requerida
      { wch: 20 }  // Cantidad Proveedor
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitud Proveedor');
    XLSX.writeFile(wb, `Solicitud_Proveedor_${documento.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Excel descargado correctamente');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
          'ID Insumo': string;
          'Clave': string;
          'Nombre Insumo': string;
          'Cantidad Requerida': number;
          'Cantidad Proveedor': number;
        }>;

        // Filter rows with valid provider quantities
        const itemsConCantidad = jsonData.filter(row => 
          row['Cantidad Proveedor'] && row['Cantidad Proveedor'] > 0
        );

        if (itemsConCantidad.length === 0) {
          toast.error('No se encontraron items con cantidad de proveedor');
          return;
        }

        // Create order
        const { data: { user } } = await supabase.auth.getUser();
        const numeroPedido = `OC-${Date.now().toString(36).toUpperCase()}`;

        const { data: orden, error: ordenError } = await supabase
          .from('pedidos_compra')
          .insert({
            numero_pedido: numeroPedido,
            creado_por: user?.id,
            total_items: itemsConCantidad.length,
            estado: 'pendiente',
            proveedor: 'Por definir'
          })
          .select()
          .single();

        if (ordenError) throw ordenError;

        // Create order items
        const items = itemsConCantidad.map(row => ({
          pedido_id: orden.id,
          insumo_catalogo_id: row['ID Insumo'],
          cantidad_solicitada: row['Cantidad Proveedor'],
          cantidad_recibida: 0,
          estado: 'pendiente'
        }));

        const { error: itemsError } = await supabase
          .from('pedido_items')
          .insert(items);

        if (itemsError) throw itemsError;

        toast.success(`Orden de compra ${numeroPedido} creada con ${itemsConCantidad.length} items`);
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

  const registrarEntradaAlmacen = async (orden: OrdenCompra) => {
    try {
      if (!orden.items || orden.items.length === 0) {
        toast.error('La orden no tiene items');
        return;
      }

      // Add items to almacen central
      for (const item of orden.items) {
        // Check if item already exists in almacen
        const { data: existingItem } = await supabase
          .from('almacen_central')
          .select()
          .eq('insumo_catalogo_id', item.insumo_catalogo_id)
          .maybeSingle();

        if (existingItem) {
          // Update existing
          await supabase
            .from('almacen_central')
            .update({
              cantidad_disponible: existingItem.cantidad_disponible + item.cantidad_solicitada,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingItem.id);
        } else {
          // Insert new
          await supabase
            .from('almacen_central')
            .insert({
              insumo_catalogo_id: item.insumo_catalogo_id,
              cantidad_disponible: item.cantidad_solicitada,
              lote: `LOTE-${Date.now().toString(36).toUpperCase()}`
            });
        }

        // Update item status
        await supabase
          .from('pedido_items')
          .update({
            cantidad_recibida: item.cantidad_solicitada,
            estado: 'recibido'
          })
          .eq('id', item.id);
      }

      // Update order status
      await supabase
        .from('pedidos_compra')
        .update({
          estado: 'completado',
          completado_at: new Date().toISOString()
        })
        .eq('id', orden.id);

      toast.success('Entrada registrada en Almacén Central México');
      fetchData();
    } catch (error) {
      console.error('Error registering entry:', error);
      toast.error('Error al registrar entrada');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'secondary';
      case 'aprobado': return 'outline';
      case 'pagada':
      case 'completado': return 'outline';
      default: return 'outline';
    }
  };

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
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.filter(d => d.estado === 'generado').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenesCompra.filter(o => o.estado === 'pendiente' || o.estado === 'pagada').length}
            </div>
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
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
          <TabsTrigger value="documentos">Documentos Agrupados</TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes de Compra</TabsTrigger>
          <TabsTrigger value="almacen">Almacén Central México</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Documentos de Necesidades Agrupadas</span>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    variant="default"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? 'Procesando...' : 'Subir Excel de Proveedor'}
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Descarga el Excel, envíalo al proveedor, y sube el archivo con las cantidades confirmadas
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : documentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay documentos</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total Requerido</TableHead>
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
                        <TableCell>
                          <Badge variant={getEstadoColor(doc.estado)}>{doc.estado}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{doc.detalles?.length || 0}</TableCell>
                        <TableCell className="text-right font-mono">
                          {doc.detalles?.reduce((sum, d) => sum + d.total_faltante_requerido, 0).toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => descargarExcelParaProveedor(doc)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Excel para Proveedor
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

        <TabsContent value="ordenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
            </CardHeader>
            <CardContent>
              {ordenesCompra.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay órdenes de compra</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesCompra.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono">{orden.numero_pedido}</TableCell>
                        <TableCell>
                          {new Date(orden.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>{orden.proveedor}</TableCell>
                        <TableCell className="text-right">{orden.total_items}</TableCell>
                        <TableCell>
                          <Badge variant={getEstadoColor(orden.estado)}>{orden.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          {orden.estado === 'pagada' && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => registrarEntradaAlmacen(orden)}
                            >
                              <Warehouse className="mr-2 h-4 w-4" />
                              Registrar Entrada
                            </Button>
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
              <CardTitle>Almacén Central México</CardTitle>
              <p className="text-sm text-muted-foreground">
                Stock disponible para distribución a hospitales
              </p>
            </CardHeader>
            <CardContent>
              {almacenCentral.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay items en el almacén central</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Caducidad</TableHead>
                      <TableHead className="text-right">Cantidad Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {almacenCentral.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                        <TableCell className="font-medium">{item.insumo?.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{item.lote}</TableCell>
                        <TableCell>
                          {item.fecha_caducidad 
                            ? new Date(item.fecha_caducidad).toLocaleDateString('es-MX')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
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
    </div>
  );
};

export default GerenteAlmacenDashboard;
