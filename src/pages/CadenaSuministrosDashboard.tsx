import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Warehouse, Send, Building2, Package, TrendingUp } from 'lucide-react';

interface NecesidadSegmentada {
  id: string;
  hospital_id: string;
  hospital_nombre: string;
  insumo_catalogo_id: string;
  insumo_nombre: string;
  insumo_clave: string;
  existencia_actual: number;
  minimo: number;
  faltante_requerido: number;
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
  hospital?: { id: string; nombre: string; display_name: string };
  insumo?: { id: string; nombre: string; clave: string };
}

const CadenaSuministrosDashboard = () => {
  const [necesidades, setNecesidades] = useState<NecesidadSegmentada[]>([]);
  const [almacenCentral, setAlmacenCentral] = useState<AlmacenCentralItem[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state for creating transfer
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNecesidad, setSelectedNecesidad] = useState<NecesidadSegmentada | null>(null);
  const [cantidadEnviar, setCantidadEnviar] = useState<number>(0);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch active alerts as necesidades
      const { data: alertasData, error: alertasError } = await supabase
        .from('insumos_alertas')
        .select(`
          *,
          hospital:hospitales(id, nombre, display_name),
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('estado', 'activa')
        .order('prioridad', { ascending: true });

      if (alertasError) throw alertasError;

      const necesidadesData: NecesidadSegmentada[] = (alertasData || []).map(a => ({
        id: a.id,
        hospital_id: a.hospital_id,
        hospital_nombre: a.hospital?.display_name || a.hospital?.nombre || 'N/A',
        insumo_catalogo_id: a.insumo_catalogo_id,
        insumo_nombre: a.insumo?.nombre || 'N/A',
        insumo_clave: a.insumo?.clave || 'N/A',
        existencia_actual: a.cantidad_actual,
        minimo: a.minimo_permitido,
        faltante_requerido: Math.max(0, a.minimo_permitido - a.cantidad_actual)
      }));

      setNecesidades(necesidadesData);

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

  const abrirDialogTransferencia = (necesidad: NecesidadSegmentada) => {
    // Check if we have stock in almacen central
    const stockCentral = almacenCentral.find(a => a.insumo_catalogo_id === necesidad.insumo_catalogo_id);
    if (!stockCentral || stockCentral.cantidad_disponible <= 0) {
      toast.error('No hay stock disponible en el almacén central para este insumo');
      return;
    }

    setSelectedNecesidad(necesidad);
    setCantidadEnviar(Math.min(necesidad.faltante_requerido, stockCentral.cantidad_disponible));
    setDialogOpen(true);
  };

  const ejecutarTransferencia = async () => {
    if (!selectedNecesidad || cantidadEnviar <= 0) return;

    setEnviando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Find almacen central item
      const stockCentral = almacenCentral.find(a => a.insumo_catalogo_id === selectedNecesidad.insumo_catalogo_id);
      if (!stockCentral || stockCentral.cantidad_disponible < cantidadEnviar) {
        toast.error('Stock insuficiente en almacén central');
        return;
      }

      // 1. Create transfer record
      const { error: transError } = await supabase
        .from('transferencias_central_hospital')
        .insert({
          hospital_destino_id: selectedNecesidad.hospital_id,
          insumo_catalogo_id: selectedNecesidad.insumo_catalogo_id,
          cantidad_enviada: cantidadEnviar,
          estado: 'enviado',
          enviado_por: user?.id
        });

      if (transError) throw transError;

      // 2. Decrease almacen central
      const { error: almacenError } = await supabase
        .from('almacen_central')
        .update({
          cantidad_disponible: stockCentral.cantidad_disponible - cantidadEnviar,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockCentral.id);

      if (almacenError) throw almacenError;

      // 3. Increase hospital inventory
      // First check if inventory exists
      const { data: inventarioExistente } = await supabase
        .from('inventario_hospital')
        .select('*')
        .eq('hospital_id', selectedNecesidad.hospital_id)
        .eq('insumo_catalogo_id', selectedNecesidad.insumo_catalogo_id)
        .maybeSingle();

      if (inventarioExistente) {
        // Update existing
        const { error: invError } = await supabase
          .from('inventario_hospital')
          .update({
            cantidad_actual: inventarioExistente.cantidad_actual + cantidadEnviar,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventarioExistente.id);

        if (invError) throw invError;
      } else {
        // Get almacen for this hospital
        const { data: almacenHospital } = await supabase
          .from('almacenes')
          .select('id')
          .eq('hospital_id', selectedNecesidad.hospital_id)
          .maybeSingle();

        if (almacenHospital) {
          // Create new inventory record
          const { error: invError } = await supabase
            .from('inventario_hospital')
            .insert({
              hospital_id: selectedNecesidad.hospital_id,
              almacen_id: almacenHospital.id,
              insumo_catalogo_id: selectedNecesidad.insumo_catalogo_id,
              cantidad_actual: cantidadEnviar,
              cantidad_inicial: cantidadEnviar,
              cantidad_minima: selectedNecesidad.minimo
            });

          if (invError) throw invError;
        }
      }

      toast.success(`Transferencia de ${cantidadEnviar} unidades enviada a ${selectedNecesidad.hospital_nombre}`);
      setDialogOpen(false);
      fetchData();

    } catch (error) {
      console.error('Error executing transfer:', error);
      toast.error('Error al ejecutar transferencia');
    } finally {
      setEnviando(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'secondary';
      case 'enviado': return 'outline';
      case 'recibido': return 'outline';
      default: return 'outline';
    }
  };

  const getDisponibilidadCentral = (insumoId: string) => {
    const item = almacenCentral.find(a => a.insumo_catalogo_id === insumoId);
    return item?.cantidad_disponible || 0;
  };

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
            <CardTitle className="text-sm font-medium">Necesidades Activas</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{necesidades.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hospitales con Faltantes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(necesidades.map(n => n.hospital_id)).size}
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

      <Tabs defaultValue="necesidades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="necesidades">Necesidades por Hospital</TabsTrigger>
          <TabsTrigger value="almacen">Almacén Central</TabsTrigger>
          <TabsTrigger value="transferencias">Historial de Transferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="necesidades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pulverización de Insumos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona una necesidad para enviar insumos desde el almacén central
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : necesidades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay necesidades pendientes
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
                      <TableHead className="text-right">Stock Central</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {necesidades.map((n) => {
                      const stockCentral = getDisponibilidadCentral(n.insumo_catalogo_id);
                      const puedeEnviar = stockCentral > 0;
                      
                      return (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.hospital_nombre}</TableCell>
                          <TableCell className="font-mono text-sm">{n.insumo_clave}</TableCell>
                          <TableCell>{n.insumo_nombre}</TableCell>
                          <TableCell className="text-right font-mono">{n.existencia_actual}</TableCell>
                          <TableCell className="text-right font-mono">{n.minimo}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-destructive">
                            {n.faltante_requerido}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${stockCentral > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {stockCentral}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="default" 
                              size="sm"
                              disabled={!puedeEnviar}
                              onClick={() => abrirDialogTransferencia(n)}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferencias.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {new Date(t.fecha).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {t.hospital?.display_name || t.hospital?.nombre}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{t.insumo?.nombre}</div>
                            <div className="text-sm text-muted-foreground">{t.insumo?.clave}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {t.cantidad_enviada}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEstadoColor(t.estado)}>{t.estado}</Badge>
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

      {/* Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Insumo a Hospital</DialogTitle>
          </DialogHeader>
          {selectedNecesidad && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Hospital</Label>
                  <p className="font-medium">{selectedNecesidad.hospital_nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Insumo</Label>
                  <p className="font-medium">{selectedNecesidad.insumo_nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Faltante Requerido</Label>
                  <p className="font-mono text-destructive">{selectedNecesidad.faltante_requerido}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock Central Disponible</Label>
                  <p className="font-mono text-green-600">
                    {getDisponibilidadCentral(selectedNecesidad.insumo_catalogo_id)}
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="cantidad">Cantidad a Enviar</Label>
                <Input
                  id="cantidad"
                  type="number"
                  value={cantidadEnviar}
                  onChange={(e) => setCantidadEnviar(parseInt(e.target.value) || 0)}
                  min={1}
                  max={Math.min(
                    selectedNecesidad.faltante_requerido,
                    getDisponibilidadCentral(selectedNecesidad.insumo_catalogo_id)
                  )}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={ejecutarTransferencia} disabled={enviando || cantidadEnviar <= 0}>
              {enviando ? 'Enviando...' : 'Confirmar Envío'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CadenaSuministrosDashboard;
