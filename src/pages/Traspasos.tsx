import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TraspasoForm from '@/components/forms/TraspasoForm';
import { toast } from 'sonner';

const Traspasos = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [showForm, setShowForm] = useState(false);
  const [selectedTraspaso, setSelectedTraspaso] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [traspasos, setTraspasos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && selectedHospital) {
      fetchTraspasos();
    }
  }, [user, selectedHospital]);

  const fetchTraspasos = async () => {
    try {
      if (!selectedHospital) return;
      
      setLoading(true);
      const { data: traspasosData, error: traspasosError } = await supabase
        .from('traspasos')
        .select('*')
        .or(`hospital_budget_code_origen.eq.${selectedHospital.budget_code},hospital_budget_code_destino.eq.${selectedHospital.budget_code}`)
        .order('created_at', { ascending: false });

      if (traspasosError) throw traspasosError;

      const traspasosConInsumos = await Promise.all(
        (traspasosData || []).map(async (traspaso) => {
          const { data: insumosData } = await supabase
            .from('traspaso_insumos')
            .select('cantidad, insumo_id, insumos(nombre)')
            .eq('traspaso_id', traspaso.id);

          return {
            ...traspaso,
            insumos: (insumosData || []).map((i: any) => ({
              id: i.insumo_id,
              nombre: i.insumos?.nombre || '',
              cantidad: i.cantidad,
            })),
          };
        })
      );

      setTraspasos(traspasosConInsumos);
    } catch (error: any) {
      toast.error('Error al cargar traspasos', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraspaso = async (data: any) => {
    try {
      if (!user || !selectedHospital) {
        toast.error('Debes seleccionar un hospital para continuar');
        return;
      }

      const { data: traspasoData, error: traspasoError } = await (supabase as any)
        .from('traspasos')
        .insert([{
          numero_traspaso: `TR-${Date.now()}`,
          unidad_origen: data.unidadOrigen,
          unidad_destino: data.unidadDestino,
          state_name_origen: selectedHospital.state_name,
          hospital_budget_code_origen: selectedHospital.budget_code,
          hospital_display_name_origen: selectedHospital.display_name,
          state_name_destino: data.stateNameDestino || selectedHospital.state_name,
          hospital_budget_code_destino: data.hospitalDestino,
          hospital_display_name_destino: data.hospitalDisplayNameDestino,
        }])
        .select()
        .single();

      if (traspasoError) throw traspasoError;

      if (data.insumos && data.insumos.length > 0) {
        const insumosData = data.insumos.map((insumo: any) => ({
          traspaso_id: traspasoData.id,
          insumo_id: insumo.id,
          cantidad: insumo.cantidad,
        }));

        const { error: insumosError } = await supabase
          .from('traspaso_insumos')
          .insert(insumosData);

        if (insumosError) throw insumosError;
      }

      toast.success('Traspaso creado exitosamente');
      setShowForm(false);
      fetchTraspasos();
    } catch (error: any) {
      toast.error('Error al crear traspaso', {
        description: error.message,
      });
    }
  };

  const handleAprobar = async (traspasoId: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('traspasos')
        .update({
          estado: 'completado',
          aprobado_por: user.id,
        })
        .eq('id', traspasoId);

      if (error) throw error;

      toast.success('Traspaso aprobado exitosamente');
      fetchTraspasos();
    } catch (error: any) {
      toast.error('Error al aprobar traspaso', {
        description: error.message,
      });
    }
  };

  const handleRechazar = async (traspasoId: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('traspasos')
        .update({
          estado: 'rechazado',
          aprobado_por: user.id,
          motivo_rechazo: 'Rechazado por el gerente',
        })
        .eq('id', traspasoId);

      if (error) throw error;

      toast.error('Traspaso rechazado');
      fetchTraspasos();
    } catch (error: any) {
      toast.error('Error al rechazar traspaso', {
        description: error.message,
      });
    }
  };

  const handleVerDetalle = (traspaso: any) => {
    setSelectedTraspaso(traspaso);
    setShowDetail(true);
  };

  const handleVerInventario = (unidad: string) => {
    toast.info('Ver Inventario', {
      description: `Mostrando inventario completo de: ${unidad}`,
    });
  };

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { 
          icon: Clock, 
          variant: 'default' as const, 
          label: 'Pendiente',
          color: 'text-warning' 
        };
      case 'completado':
        return { 
          icon: CheckCircle, 
          variant: 'default' as const, 
          label: 'Completado',
          color: 'text-success' 
        };
      case 'rechazado':
        return { 
          icon: XCircle, 
          variant: 'destructive' as const, 
          label: 'Rechazado',
          color: 'text-destructive' 
        };
      default:
        return { 
          icon: Clock, 
          variant: 'default' as const, 
          label: estado,
          color: 'text-muted-foreground' 
        };
    }
  };

  const pendientes = traspasos.filter(t => t.estado === 'pendiente').length;
  const completados = traspasos.filter(t => t.estado === 'completado').length;

  if (!selectedHospital) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Traspasos entre Hospitales</h1>
          <p className="text-muted-foreground">Gestión de movimientos de inventario</p>
        </div>
        <Alert>
          <AlertDescription>
            Debes seleccionar un hospital para ver y gestionar los traspasos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Traspasos entre Hospitales</h1>
          <p className="text-muted-foreground">
            Gestión de movimientos de inventario - {selectedHospital.display_name}
          </p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          Nuevo Traspaso
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Traspasos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendientes}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completados}</div>
            <p className="text-xs text-muted-foreground">traspasos exitosos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{traspasos.length}</div>
            <p className="text-xs text-muted-foreground">traspasos registrados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Traspasos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando traspasos...</p>
          ) : (
            <div className="space-y-4">
              {traspasos.map((traspaso) => {
                const estadoConfig = getEstadoConfig(traspaso.estado);
                const EstadoIcon = estadoConfig.icon;
                
                return (
                  <Card key={traspaso.id} className="border-l-4 border-l-role-gerente">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant={estadoConfig.variant} className="gap-1">
                                <EstadoIcon className="h-3 w-3" />
                                {estadoConfig.label}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(traspaso.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium">{traspaso.hospital_display_name_origen || traspaso.unidad_origen}</span>
                                <span className="text-xs text-muted-foreground">{traspaso.state_name_origen}</span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-medium">{traspaso.hospital_display_name_destino || traspaso.unidad_destino}</span>
                                <span className="text-xs text-muted-foreground">{traspaso.state_name_destino}</span>
                              </div>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="mb-2 text-sm font-medium">Insumos:</p>
                              <ul className="space-y-1 text-sm">
                                {traspaso.insumos?.map((insumo: any, index: number) => (
                                  <li key={index}>
                                    • {insumo.nombre}: <span className="font-medium">{insumo.cantidad} unidades</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {traspaso.motivo_rechazo && (
                              <div className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                                <span className="font-medium">Motivo:</span> {traspaso.motivo_rechazo}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {traspaso.estado === 'pendiente' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => handleAprobar(traspaso.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Aprobar
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => handleRechazar(traspaso.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                            {traspaso.estado !== 'pendiente' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleVerDetalle(traspaso)}
                              >
                                Ver Detalle
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <TraspasoForm 
            onClose={() => setShowForm(false)} 
            onSubmit={handleCreateTraspaso}
          />
        </DialogContent>
      </Dialog>

      {selectedTraspaso && (
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-2xl">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detalle del Traspaso</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Fecha:</span> {new Date(selectedTraspaso.created_at).toLocaleDateString()}</p>
                <p><span className="font-medium">Origen:</span> {selectedTraspaso.hospital_display_name_origen || selectedTraspaso.unidad_origen}</p>
                <p><span className="font-medium">Destino:</span> {selectedTraspaso.hospital_display_name_destino || selectedTraspaso.unidad_destino}</p>
                <p><span className="font-medium">Estado:</span> {selectedTraspaso.estado}</p>
                {selectedTraspaso.motivo_rechazo && (
                  <p><span className="font-medium">Motivo:</span> {selectedTraspaso.motivo_rechazo}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Traspasos;
