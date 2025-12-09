import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Warehouse, Send, Building2, Package, TrendingUp, FileText, Clock, CheckCircle } from 'lucide-react';

interface DocumentoSegmentado {
  id: string;
  fecha_generacion: string;
  estado: string;
  enviado_a_cadena_suministros: boolean;
  procesado_por_cadena: boolean;
  detalles?: DetalleSegmentado[];
}

interface DetalleSegmentado {
  id: string;
  hospital_id: string;
  insumo_catalogo_id: string;
  existencia_actual: number;
  minimo: number;
  faltante_requerido: number;
  hospital?: { id: string; nombre: string; display_name: string };
  insumo?: { id: string; nombre: string; clave: string };
}

interface AlmacenCentralItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_disponible: number;
  lote: string;
  insumo?: { id: string; nombre: string; clave: string };
}

interface Transferencia {
  id: string;
  hospital_destino_id: string;
  insumo_catalogo_id: string;
  cantidad_enviada: number;
  estado: string;
  fecha: string;
  alerta_creada: boolean;
  hospital?: { id: string; nombre: string; display_name: string };
  insumo?: { id: string; nombre: string; clave: string };
}

const CadenaSuministrosDashboard = () => {
  const [documentos, setDocumentos] = useState<DocumentoSegmentado[]>([]);
  const [almacenCentral, setAlmacenCentral] = useState<AlmacenCentralItem[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDetalle, setSelectedDetalle] = useState<DetalleSegmentado | null>(null);
  const [cantidadEnviar, setCantidadEnviar] = useState<number>(0);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch documentos segmentados enviados
      const { data: docsData, error: docsError } = await supabase
        .from('documentos_necesidades_segmentado')
        .select(`
          *,
          detalles:documento_segmentado_detalle(
            *,
            hospital:hospitales(id, nombre, display_name),
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `)
        .eq('enviado_a_cadena_suministros', true)
        .order('fecha_generacion', { ascending: false })
        .limit(20);

      if (docsError) throw docsError;
      setDocumentos(docsData || []);

      // Fetch almacen central
      const { data: almacenData, error: almacenError } = await supabase
        .from('almacen_central')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .gt('cantidad_disponible', 0)
        .order('cantidad_disponible', { ascending: false });

      if (almacenError) throw almacenError;
      setAlmacenCentral(almacenData || []);

      // Fetch transferencias
      const { data: transData, error: transError } = await supabase
        .from('transferencias_central_hospital')
        .select(`
          *,
          hospital:hospitales(id, nombre, display_name),
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .order('fecha', { ascending: false })
        .limit(50);

      if (transError) throw transError;
      setTransferencias(transData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogTransferencia = (detalle: DetalleSegmentado) => {
    const stockCentral = almacenCentral.find(a => a.insumo_catalogo_id === detalle.insumo_catalogo_id);
    if (!stockCentral || stockCentral.cantidad_disponible <= 0) {
      toast.error('No hay stock disponible en el almacén central para este insumo');
      return;
    }

    setSelectedDetalle(detalle);
    setCantidadEnviar(Math.min(detalle.faltante_requerido, stockCentral.cantidad_disponible));
    setDialogOpen(true);
  };

  const ejecutarTransferencia = async () => {
    if (!selectedDetalle || cantidadEnviar <= 0) return;

    setEnviando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const stockCentral = almacenCentral.find(a => a.insumo_catalogo_id === selectedDetalle.insumo_catalogo_id);
      if (!stockCentral || stockCentral.cantidad_disponible < cantidadEnviar) {
        toast.error('Stock insuficiente en almacén central');
        return;
      }

      // 1. Create transfer record
      const { data: transferencia, error: transError } = await supabase
        .from('transferencias_central_hospital')
        .insert({
          hospital_destino_id: selectedDetalle.hospital_id,
          insumo_catalogo_id: selectedDetalle.insumo_catalogo_id,
          cantidad_enviada: cantidadEnviar,
          estado: 'enviado',
          enviado_por: user?.id,
          alerta_creada: true
        })
        .select()
        .single();

      if (transError) throw transError;

      // 2. Create alert for almacenista
      const { error: alertaError } = await supabase
        .from('alertas_transferencia')
        .insert({
          transferencia_id: transferencia.id,
          hospital_id: selectedDetalle.hospital_id,
          insumo_catalogo_id: selectedDetalle.insumo_catalogo_id,
          cantidad_enviada: cantidadEnviar,
          estado: 'pendiente'
        });

      if (alertaError) throw alertaError;

      // 3. Decrease almacen central
      const { error: almacenError } = await supabase
        .from('almacen_central')
        .update({
          cantidad_disponible: stockCentral.cantidad_disponible - cantidadEnviar,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockCentral.id);

      if (almacenError) throw almacenError;

      toast.success(`Transferencia enviada. El almacenista del hospital recibirá una alerta.`);
      setDialogOpen(false);
      fetchData();

    } catch (error) {
      console.error('Error executing transfer:', error);
      toast.error('Error al ejecutar transferencia');
    } finally {
      setEnviando(false);
    }
  };

  const marcarDocumentoProcesado = async (docId: string) => {
    try {
      await supabase
        .from('documentos_necesidades_segmentado')
        .update({
          procesado_por_cadena: true,
          procesado_at: new Date().toISOString()
        })
        .eq('id', docId);

      toast.success('Documento marcado como procesado');
      fetchData();
    } catch (error) {
      console.error('Error marking document:', error);
      toast.error('Error al marcar documento');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'secondary';
      case 'enviado': return 'outline';
      case 'aceptado': return 'outline';
      case 'rechazado': return 'destructive';
      default: return 'outline';
    }
  };

  const getDisponibilidadCentral = (insumoId: string) => {
    const item = almacenCentral.find(a => a.insumo_catalogo_id === insumoId);
    return item?.cantidad_disponible || 0;
  };

  const documentosPendientes = documentos.filter(d => !d.procesado_por_cadena);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Cadena de Suministros</h1>
          <p className="text-muted-foreground">Distribución de insumos a hospitales</p>
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
            <CardTitle className="text-sm font-medium">Hospitales con Faltantes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(documentosPendientes.flatMap(d => d.detalles?.map(det => det.hospital_id) || [])).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items en Almacén Central</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{almacenCentral.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferencias Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transferencias.filter(t => 
                new Date(t.fecha).toDateString() === new Date().toDateString()
              ).length}
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
          <TabsTrigger value="almacen">Almacén Central</TabsTrigger>
          <TabsTrigger value="transferencias">Historial de Transferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : documentos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No hay documentos recibidos
              </CardContent>
            </Card>
          ) : (
            documentos.map(doc => (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>Documento del {new Date(doc.fecha_generacion).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</span>
                      {doc.procesado_por_cadena ? (
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
                    </div>
                    {!doc.procesado_por_cadena && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => marcarDocumentoProcesado(doc.id)}
                      >
                        Marcar como procesado
                      </Button>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Selecciona cada necesidad para enviar insumos desde el almacén central
                  </p>
                </CardHeader>
                <CardContent>
                  {!doc.detalles || doc.detalles.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Sin detalles</p>
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
                          <TableHead className="text-right">Stock Central</TableHead>
                          <TableHead>Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doc.detalles.map((det) => {
                          const stockCentral = getDisponibilidadCentral(det.insumo_catalogo_id);
                          const puedeEnviar = stockCentral > 0;
                          
                          return (
                            <TableRow key={det.id}>
                              <TableCell className="font-medium">
                                {det.hospital?.display_name || det.hospital?.nombre}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{det.insumo?.clave}</TableCell>
                              <TableCell>{det.insumo?.nombre}</TableCell>
                              <TableCell className="text-right font-mono">{det.existencia_actual}</TableCell>
                              <TableCell className="text-right font-mono">{det.minimo}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-destructive">
                                {det.faltante_requerido}
                              </TableCell>
                              <TableCell className={`text-right font-mono ${stockCentral > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {stockCentral}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  disabled={!puedeEnviar}
                                  onClick={() => abrirDialogTransferencia(det)}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Enviar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))
          )}
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

        <TabsContent value="transferencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transferencias</CardTitle>
            </CardHeader>
            <CardContent>
              {transferencias.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay transferencias registradas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hospital Destino</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Alerta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferencias.map((trans) => (
                      <TableRow key={trans.id}>
                        <TableCell>
                          {new Date(trans.fecha).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {trans.hospital?.display_name || trans.hospital?.nombre}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{trans.insumo?.nombre}</div>
                            <div className="text-sm text-muted-foreground">{trans.insumo?.clave}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{trans.cantidad_enviada}</TableCell>
                        <TableCell>
                          <Badge variant={getEstadoColor(trans.estado)}>{trans.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          {trans.alerta_creada ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Enviada
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pendiente</Badge>
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
      </Tabs>

      {/* Dialog for transfer */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Insumo a Hospital</DialogTitle>
          </DialogHeader>
          {selectedDetalle && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Hospital</Label>
                <p className="font-medium">{selectedDetalle.hospital?.display_name || selectedDetalle.hospital?.nombre}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Insumo</Label>
                <p className="font-medium">{selectedDetalle.insumo?.nombre}</p>
                <p className="text-sm text-muted-foreground">{selectedDetalle.insumo?.clave}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Faltante</Label>
                  <p className="font-mono text-lg text-destructive">{selectedDetalle.faltante_requerido}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock Central</Label>
                  <p className="font-mono text-lg text-green-600">
                    {getDisponibilidadCentral(selectedDetalle.insumo_catalogo_id)}
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="cantidad">Cantidad a Enviar</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min={1}
                  max={getDisponibilidadCentral(selectedDetalle.insumo_catalogo_id)}
                  value={cantidadEnviar}
                  onChange={(e) => setCantidadEnviar(Number(e.target.value))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={ejecutarTransferencia} disabled={enviando || cantidadEnviar <= 0}>
              <Send className="mr-2 h-4 w-4" />
              {enviando ? 'Enviando...' : 'Confirmar Envío'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CadenaSuministrosDashboard;
