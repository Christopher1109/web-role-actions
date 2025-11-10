import { useState, useEffect } from 'react';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import FolioForm from '@/components/forms/FolioForm';
import FolioDetailDialog from '@/components/dialogs/FolioDetailDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FoliosProps {
  userRole: UserRole;
}

const Folios = ({ userRole }: FoliosProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [folios, setFolios] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [selectedFolioInsumos, setSelectedFolioInsumos] = useState<any[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  const canCancel = userRole === 'supervisor' || userRole === 'gerente';

  useEffect(() => {
    if (user) {
      fetchFolios();
    }
  }, [user]);

  const fetchFolios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('folios')
        .select('*')
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
      if (!user) return;

      // Obtener el hospital_id del perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('hospital_id')
        .eq('id', user.id)
        .single();

      // Insertar el folio con todos los campos del T33
      const { data: folioData, error: folioError } = await supabase
        .from('folios')
        .insert({
          numero_folio: data.numeroFolio,
          hospital_id: profile?.hospital_id,
          unidad: data.unidad,
          numero_quirofano: data.numeroQuirofano,
          hora_inicio_procedimiento: data.horaInicioProcedimiento,
          hora_fin_procedimiento: data.horaFinProcedimiento,
          hora_inicio_anestesia: data.horaInicioAnestesia,
          hora_fin_anestesia: data.horaFinAnestesia,
          paciente_nombre: `${data.pacienteNombre} ${data.pacienteApellidoPaterno} ${data.pacienteApellidoMaterno}`,
          paciente_apellido_paterno: data.pacienteApellidoPaterno,
          paciente_apellido_materno: data.pacienteApellidoMaterno,
          paciente_nss: data.pacienteNSS,
          paciente_edad: data.pacienteEdad,
          paciente_genero: data.pacienteGenero,
          cirugia: data.cirugia,
          especialidad_quirurgica: data.especialidadQuirurgica,
          tipo_cirugia: data.tipoCirugia,
          tipo_evento: data.tipoEvento,
          tipo_anestesia: data.tipoAnestesia,
          cirujano_id: null, // TODO: vincular con tabla medicos
          anestesiologo_id: null, // TODO: vincular con tabla medicos
          created_by: user.id,
          estado: 'activo',
        })
        .select()
        .single();

      if (folioError) throw folioError;

      // Insertar los insumos utilizados
      if (data.insumos && data.insumos.length > 0) {
        const insumosData = data.insumos.map((insumo: any) => ({
          folio_id: folioData.id,
          nombre_insumo: insumo.nombre,
          lote: insumo.lote,
          cantidad: insumo.cantidad,
        }));

        const { error: insumosError } = await supabase
          .from('folio_insumos')
          .insert(insumosData);

        if (insumosError) throw insumosError;

        // Descontar insumos del inventario
        for (const insumo of data.insumos) {
          // Buscar el insumo en el inventario
          const { data: insumoInventario, error: searchError } = await supabase
            .from('insumos')
            .select('*')
            .eq('nombre', insumo.nombre)
            .eq('lote', insumo.lote)
            .eq('hospital_id', profile?.hospital_id)
            .single();

          if (searchError || !insumoInventario) {
            console.warn(`No se encontró el insumo ${insumo.nombre} (${insumo.lote}) en el inventario`);
            continue;
          }

          // Verificar que hay suficiente cantidad
          if (insumoInventario.cantidad < insumo.cantidad) {
            toast.warning(`Stock insuficiente para ${insumo.nombre}`, {
              description: `Disponible: ${insumoInventario.cantidad}, Requerido: ${insumo.cantidad}`,
            });
            continue;
          }

          // Actualizar la cantidad del insumo
          const nuevaCantidad = insumoInventario.cantidad - insumo.cantidad;
          const { error: updateError } = await supabase
            .from('insumos')
            .update({ cantidad: nuevaCantidad })
            .eq('id', insumoInventario.id);

          if (updateError) {
            console.error(`Error al actualizar inventario de ${insumo.nombre}:`, updateError);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Folios</h1>
          <p className="text-muted-foreground">Gestión de procedimientos quirúrgicos</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
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
                              const { data: insumosData } = await supabase
                                .from('folio_insumos')
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
