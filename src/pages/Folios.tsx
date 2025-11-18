import { useState, useEffect } from 'react';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FolioForm from '@/components/forms/FolioForm';
import FolioDetailDialog from '@/components/dialogs/FolioDetailDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';

interface FoliosProps {
  userRole: UserRole;
}

const Folios = ({ userRole }: FoliosProps) => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [folios, setFolios] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [selectedFolioInsumos, setSelectedFolioInsumos] = useState<any[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  const canCancel = userRole === 'supervisor' || userRole === 'gerente';

  useEffect(() => {
    if (user && selectedHospital) {
      fetchFolios();
    }
  }, [user, selectedHospital]);

  const fetchFolios = async () => {
    try {
      if (!selectedHospital) return;
      
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('folios')
        .select('*')
        .eq('hospital_budget_code', selectedHospital.budget_code)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolios(data || []);
    } catch (error: any) {
      toast.error('Error al cargar folios', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolio = async (data: any) => {
    try {
      if (!user || !selectedHospital) {
        toast.error('Debes seleccionar un hospital para continuar');
        return;
      }

      // Insertar el folio con todos los campos del T33
      const { data: folioData, error: folioError } = await (supabase as any)
        .from('folios')
        .insert({
          numero_folio: data.numeroFolio,
          state_name: selectedHospital.state_name,
          hospital_budget_code: selectedHospital.budget_code,
          hospital_display_name: selectedHospital.display_name,
          tipo_anestesia: data.tipo_anestesia,
          anestesia_principal: data.anestesiaPrincipal || null,
          anestesia_secundaria: data.anestesiaSecundaria || null,
          medico_id: data.anestesiologo || null,
          observaciones: data.observaciones || null,
          estado: 'activo',
        })
        .select()
        .single();

      if (folioError) throw folioError;

      // Insertar los insumos del folio
      if (data.insumos && data.insumos.length > 0) {
        const insumosPayload = data.insumos.map((item: any) => ({
          folio_id: folioData.id,
          insumo_id: item.insumo.id,
          cantidad: item.cantidad,
        }));

        const { error: insumosError } = await (supabase as any)
          .from('folios_insumos')
          .insert(insumosPayload);

        if (insumosError) throw insumosError;

        // Descontar insumos del inventario
        for (const item of data.insumos) {
          // Buscar el insumo en el inventario
          const { data: insumoInventario, error: searchError } = await (supabase as any)
            .from('insumos')
            .select('*')
            .eq('id', item.insumo.id)
            .eq('hospital_budget_code', selectedHospital.budget_code)
            .maybeSingle();

          if (searchError || !insumoInventario) {
            console.warn(`No se encontró el insumo ${item.insumo.descripcion} en el inventario`);
            continue;
          }

          // Verificar que hay suficiente cantidad
          if (insumoInventario.cantidad < item.cantidad) {
            toast.warning(`Stock insuficiente para ${item.insumo.descripcion}`, {
              description: `Disponible: ${insumoInventario.cantidad}, Requerido: ${item.cantidad}`,
            });
            continue;
          }

          // Actualizar la cantidad del insumo
          const nuevaCantidad = insumoInventario.cantidad - item.cantidad;
          const { error: updateError } = await (supabase as any)
            .from('insumos')
            .update({ cantidad: nuevaCantidad })
            .eq('id', insumoInventario.id);

          if (updateError) {
            console.error(`Error al actualizar inventario de ${item.insumo.descripcion}:`, updateError);
          }
        }
      }

      toast.success('Folio creado exitosamente');
      setShowForm(false);
      fetchFolios();
    } catch (error: any) {
      toast.error('Error al crear folio', {
        description: error.message,
      });
    }
  };

  const handleCancelFolio = async (folioId: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('folios')
        .update({ 
          estado: 'cancelado',
          cancelado_por: user.id,
        })
        .eq('id', folioId);

      if (error) throw error;

      toast.success('Folio cancelado exitosamente');
      fetchFolios();
    } catch (error: any) {
      toast.error('Error al cancelar folio', {
        description: error.message,
      });
    }
  };

  const tiposAnestesiaLabels: Record<string, string> = {
    general_balanceada_adulto: 'General Balanceada Adulto',
    general_balanceada_pediatrica: 'General Balanceada Pediátrica',
    general_alta_especialidad: 'General Alta Especialidad',
    general_endovenosa: 'General Endovenosa',
    locorregional: 'Locorregional',
    sedacion: 'Sedación',
  };

  return (
    <div className="space-y-6">
      {!selectedHospital && (
        <Alert>
          <AlertDescription>
            Debes seleccionar un hospital para ver y gestionar los folios.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Folios</h1>
          <p className="text-muted-foreground">Gestión de procedimientos quirúrgicos</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setShowForm(true)}
          disabled={!selectedHospital}
        >
          <Plus className="h-4 w-4" />
          Nuevo Folio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, paciente o cirugía..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando folios...</p>
          ) : (
            <div className="space-y-4">
              {folios
                .filter(f => searchTerm === '' || 
                  f.numero_folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  f.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  f.cirugia?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((folio) => (
                  <Card key={folio.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{folio.numero_folio}</h3>
                            <Badge variant={folio.estado === 'activo' ? 'default' : 'destructive'}>
                              {folio.estado === 'activo' ? 'Activo' : 'Cancelado'}
                            </Badge>
                          </div>
                          <div className="grid gap-1 text-sm">
                            <p><span className="font-medium">Paciente:</span> {folio.paciente_nombre}</p>
                            <p><span className="font-medium">Cirugía:</span> {folio.cirugia}</p>
                            <p><span className="font-medium">Fecha:</span> {new Date(folio.created_at).toLocaleDateString()}</p>
                            <p><span className="font-medium">Tipo de Anestesia:</span> {tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia}</p>
                            <p><span className="font-medium">Unidad:</span> {folio.unidad}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              setSelectedFolio(folio);
                              // Fetch insumos for this folio
                              const { data: insumosData } = await (supabase as any)
                                .from('folios_insumos')
                                .select('*')
                                .eq('folio_id', folio.id);
                              setSelectedFolioInsumos(insumosData || []);
                              setShowDetail(true);
                            }}
                          >
                            Ver Detalle
                          </Button>
                          {canCancel && folio.estado === 'activo' && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => handleCancelFolio(folio.id)}
                            >
                              <FileX className="h-4 w-4" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <FolioForm onClose={() => setShowForm(false)} onSubmit={handleCreateFolio} />
        </DialogContent>
      </Dialog>

      <FolioDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        folio={selectedFolio}
        tiposAnestesiaLabels={tiposAnestesiaLabels}
        insumos={selectedFolioInsumos}
      />
    </div>
  );
};

export default Folios;
