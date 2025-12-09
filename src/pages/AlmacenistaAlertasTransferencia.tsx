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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Package, CheckCircle, AlertTriangle, XCircle, Settings2 } from 'lucide-react';
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
  insumo?: { id: string; nombre: string; clave: string };
}

const AlmacenistaAlertasTransferencia = () => {
  const { selectedHospital } = useHospital();
  const [alertas, setAlertas] = useState<AlertaTransferencia[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaTransferencia | null>(null);
  const [cantidadAceptada, setCantidadAceptada] = useState<number>(0);
  const [cantidadMerma, setCantidadMerma] = useState<number>(0);
  const [motivoMerma, setMotivoMerma] = useState<string>('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (selectedHospital) {
      fetchAlertas();
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
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogProcesar = (alerta: AlertaTransferencia) => {
    setSelectedAlerta(alerta);
    setCantidadAceptada(alerta.cantidad_enviada);
    setCantidadMerma(0);
    setMotivoMerma('');
    setDialogOpen(true);
  };

  const procesarAlerta = async (aceptar: boolean) => {
    if (!selectedAlerta || !selectedHospital) return;

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (aceptar) {
        // Calculate actual amounts
        const cantidadFinal = cantidadAceptada;
        const merma = cantidadMerma;
        
        // Validate
        if (cantidadFinal + merma !== selectedAlerta.cantidad_enviada) {
          toast.error('La suma de cantidad aceptada y merma debe igual a la cantidad enviada');
          return;
        }

        // Update alert
        const { error: alertaError } = await supabase
          .from('alertas_transferencia')
          .update({
            cantidad_aceptada: cantidadFinal,
            cantidad_merma: merma,
            motivo_merma: merma > 0 ? motivoMerma : null,
            estado: merma > 0 ? 'aceptada_parcial' : 'aceptada',
            aceptada_at: new Date().toISOString(),
            aceptada_por: user?.id
          })
          .eq('id', selectedAlerta.id);

        if (alertaError) throw alertaError;

        // Update hospital inventory
        const { data: inventarioExistente } = await supabase
          .from('inventario_hospital')
          .select('*')
          .eq('hospital_id', selectedHospital.id)
          .eq('insumo_catalogo_id', selectedAlerta.insumo_catalogo_id)
          .maybeSingle();

        if (inventarioExistente) {
          await supabase
            .from('inventario_hospital')
            .update({
              cantidad_actual: inventarioExistente.cantidad_actual + cantidadFinal,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventarioExistente.id);
        } else {
          // Get almacen
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
                insumo_catalogo_id: selectedAlerta.insumo_catalogo_id,
                cantidad_actual: cantidadFinal,
                cantidad_inicial: cantidadFinal,
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
          .eq('id', selectedAlerta.transferencia_id);

        toast.success(merma > 0 
          ? `Transferencia aceptada con ${merma} unidades de merma` 
          : 'Transferencia aceptada completamente'
        );
      } else {
        // Rechazar
        await supabase
          .from('alertas_transferencia')
          .update({
            estado: 'rechazada',
            notas: motivoMerma || 'Rechazada por almacenista',
            aceptada_at: new Date().toISOString(),
            aceptada_por: user?.id
          })
          .eq('id', selectedAlerta.id);

        toast.success('Transferencia rechazada');
      }

      setDialogOpen(false);
      fetchAlertas();

    } catch (error) {
      console.error('Error processing alert:', error);
      toast.error('Error al procesar alerta');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'destructive';
      case 'aceptada': return 'outline';
      case 'aceptada_parcial': return 'secondary';
      case 'rechazada': return 'destructive';
      default: return 'outline';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <AlertTriangle className="h-4 w-4" />;
      case 'aceptada': return <CheckCircle className="h-4 w-4" />;
      case 'aceptada_parcial': return <AlertTriangle className="h-4 w-4" />;
      case 'rechazada': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const alertasPendientes = alertas.filter(a => a.estado === 'pendiente');
  const alertasProcesadas = alertas.filter(a => a.estado !== 'pendiente');

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
          <p className="text-muted-foreground">Alertas de transferencia y configuración de inventario</p>
        </div>
        <Button onClick={fetchAlertas} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>
      
      <Tabs defaultValue="transferencias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transferencias">Alertas de Transferencia</TabsTrigger>
          <TabsTrigger value="minimos" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Configurar Mínimos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transferencias" className="space-y-4">

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertasPendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceptadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alertas.filter(a => a.estado === 'aceptada' || a.estado === 'aceptada_parcial').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Mermas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alertas.filter(a => a.cantidad_merma > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Transferencias Pendientes de Recepción
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : alertasPendientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay transferencias pendientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Cantidad Enviada</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertasPendientes.map((alerta) => (
                  <TableRow key={alerta.id}>
                    <TableCell>
                      {new Date(alerta.created_at).toLocaleDateString('es-MX', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{alerta.insumo?.clave}</TableCell>
                    <TableCell className="font-medium">{alerta.insumo?.nombre}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {alerta.cantidad_enviada}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => abrirDialogProcesar(alerta)}
                      >
                        Procesar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Transferencias</CardTitle>
        </CardHeader>
        <CardContent>
          {alertasProcesadas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Sin historial</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Enviada</TableHead>
                  <TableHead className="text-right">Aceptada</TableHead>
                  <TableHead className="text-right">Merma</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertasProcesadas.map((alerta) => (
                  <TableRow key={alerta.id}>
                    <TableCell>
                      {new Date(alerta.created_at).toLocaleDateString('es-MX', {
                        month: 'short', day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{alerta.insumo?.nombre}</TableCell>
                    <TableCell className="text-right font-mono">{alerta.cantidad_enviada}</TableCell>
                    <TableCell className="text-right font-mono">{alerta.cantidad_aceptada || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {alerta.cantidad_merma > 0 ? (
                        <span className="text-destructive">{alerta.cantidad_merma}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoColor(alerta.estado)} className="flex items-center gap-1 w-fit">
                        {getEstadoIcon(alerta.estado)}
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
          <EdicionMasivaMínimos hospitalId={selectedHospital?.id} onActualizado={fetchAlertas} />
        </TabsContent>
      </Tabs>

      {/* Process Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar Transferencia</DialogTitle>
          </DialogHeader>
          {selectedAlerta && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Insumo</Label>
                <p className="font-medium">{selectedAlerta.insumo?.nombre}</p>
                <p className="text-sm text-muted-foreground">{selectedAlerta.insumo?.clave}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cantidad Enviada</Label>
                <p className="font-mono text-lg font-bold">{selectedAlerta.cantidad_enviada}</p>
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label htmlFor="aceptada">Cantidad Aceptada</Label>
                  <Input
                    id="aceptada"
                    type="number"
                    value={cantidadAceptada}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setCantidadAceptada(val);
                      setCantidadMerma(selectedAlerta.cantidad_enviada - val);
                    }}
                    min={0}
                    max={selectedAlerta.cantidad_enviada}
                  />
                </div>
                <div>
                  <Label htmlFor="merma">Cantidad Merma (daños, faltantes)</Label>
                  <Input
                    id="merma"
                    type="number"
                    value={cantidadMerma}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setCantidadMerma(val);
                      setCantidadAceptada(selectedAlerta.cantidad_enviada - val);
                    }}
                    min={0}
                    max={selectedAlerta.cantidad_enviada}
                  />
                </div>
                {cantidadMerma > 0 && (
                  <div>
                    <Label htmlFor="motivo">Motivo de la Merma</Label>
                    <Textarea
                      id="motivo"
                      value={motivoMerma}
                      onChange={(e) => setMotivoMerma(e.target.value)}
                      placeholder="Describe el motivo de la merma..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => procesarAlerta(false)}
              disabled={procesando}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar Todo
            </Button>
            <Button 
              onClick={() => procesarAlerta(true)}
              disabled={procesando || (cantidadMerma > 0 && !motivoMerma)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {procesando ? 'Procesando...' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlmacenistaAlertasTransferencia;
