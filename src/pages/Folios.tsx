import { useState, useEffect } from 'react';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileX, Download } from 'lucide-react';
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
import { generateFolioPDF } from '@/utils/pdfExport';

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

  const canCancel = userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones';

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

      // PASO 1: Obtener almacén del hospital
      const { data: almacen, error: almacenError } = await supabase
        .from('almacenes')
        .select('id')
        .eq('hospital_id', selectedHospital.id)
        .maybeSingle();

      if (almacenError) throw almacenError;
      
      if (!almacen) {
        toast.error('No se encontró almacén para este hospital', {
          description: 'Contacta al administrador del sistema'
        });
        return;
      }

      // PASO 2: VALIDAR EXISTENCIAS antes de crear el folio
      if (data.insumos && data.insumos.length > 0) {
        const validacionErrors: string[] = [];
        
        for (const item of data.insumos) {
          // Buscar el insumo en inventario_hospital por nombre
          const { data: inventarioItems, error: searchError } = await supabase
            .from('inventario_hospital')
            .select(`
              id,
              cantidad_actual,
              lote,
              insumos_catalogo (
                id,
                nombre
              )
            `)
            .eq('almacen_id', almacen.id)
            .eq('estatus', 'activo')
            .order('fecha_caducidad', { ascending: true });

          if (searchError) throw searchError;

          // Buscar el insumo que coincida con el nombre
          const insumoEncontrado = inventarioItems?.find(
            (inv: any) => inv.insumos_catalogo?.nombre === item.insumo.nombre
          );

          if (!insumoEncontrado) {
            validacionErrors.push(
              `❌ ${item.insumo.nombre}: No disponible en inventario`
            );
            continue;
          }

          // Verificar stock suficiente
          if (insumoEncontrado.cantidad_actual < item.cantidad) {
            validacionErrors.push(
              `❌ ${item.insumo.nombre}: Stock insuficiente (Disponible: ${insumoEncontrado.cantidad_actual}, Requerido: ${item.cantidad})`
            );
          }
        }

        // Si hay errores de validación, NO continuar
        if (validacionErrors.length > 0) {
          toast.error('No se puede crear el folio', {
            description: validacionErrors.join('\n'),
            duration: 8000
          });
          return;
        }
      }

      // PASO 3: Generar número de folio
      const { count, error: countError } = await supabase
        .from('folios')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_budget_code', selectedHospital.budget_code);

      if (countError) throw countError;

      const numeroFolio = `${selectedHospital.budget_code}-${String((count || 0) + 1).padStart(6, '0')}`;

      // PASO 4: Crear el folio
      const { data: folioData, error: folioError } = await supabase
        .from('folios')
        .insert({
          numero_folio: numeroFolio,
          state_name: selectedHospital.state_name,
          hospital_budget_code: selectedHospital.budget_code,
          hospital_display_name: selectedHospital.display_name,
          hospital_id: selectedHospital.id,
          unidad: data.unidad,
          numero_quirofano: data.numeroQuirofano,
          hora_inicio_procedimiento: data.inicioProcedimiento,
          hora_fin_procedimiento: data.finProcedimiento,
          hora_inicio_anestesia: data.inicioAnestesia,
          hora_fin_anestesia: data.finAnestesia,
          paciente_apellido_paterno: data.pacienteApellidoPaterno,
          paciente_apellido_materno: data.pacienteApellidoMaterno,
          paciente_nombre: data.pacienteNombre,
          paciente_nss: data.pacienteNSS,
          paciente_edad: data.pacienteEdad,
          paciente_genero: data.pacienteGenero,
          cirugia: data.procedimientoQuirurgico,
          especialidad_quirurgica: data.especialidadQuirurgica,
          tipo_cirugia: data.tipoCirugia,
          tipo_evento: data.tipoEvento,
          tipo_anestesia: data.tipo_anestesia,
          anestesia_principal: data.anestesiaPrincipal || null,
          anestesia_secundaria: data.anestesiaSecundaria || null,
          cirujano_id: data.cirujano || null,
          anestesiologo_id: data.anestesiologo || null,
          cirujano_nombre: data.cirujanoNombre || null,
          anestesiologo_nombre: data.anestesiologoNombre || null,
          observaciones: data.observaciones || null,
          estado: 'activo',
        })
        .select()
        .single();

      if (folioError) throw folioError;

      // PASO 5: Insertar relación folios_insumos y DESCONTAR INVENTARIO
      if (data.insumos && data.insumos.length > 0) {
        for (const item of data.insumos) {
          // Buscar el insumo en inventario nuevamente para obtener el ID correcto
          const { data: inventarioItems } = await supabase
            .from('inventario_hospital')
            .select(`
              id,
              cantidad_actual,
              insumo_catalogo_id,
              lote,
              insumos_catalogo (
                id,
                nombre
              )
            `)
            .eq('almacen_id', almacen.id)
            .eq('estatus', 'activo')
            .order('fecha_caducidad', { ascending: true });

          const insumoInventario = inventarioItems?.find(
            (inv: any) => inv.insumos_catalogo?.nombre === item.insumo.nombre
          );

          if (!insumoInventario) continue;

          // Insertar en folios_insumos
          const { error: insumosError } = await supabase
            .from('folios_insumos')
            .insert({
              folio_id: folioData.id,
              insumo_id: insumoInventario.insumo_catalogo_id,
              cantidad: item.cantidad,
            });

          if (insumosError) throw insumosError;

          // Calcular nueva cantidad
          const cantidadAnterior = insumoInventario.cantidad_actual;
          const cantidadNueva = cantidadAnterior - item.cantidad;

          // Actualizar inventario
          const { error: updateError } = await supabase
            .from('inventario_hospital')
            .update({ 
              cantidad_actual: cantidadNueva,
              updated_at: new Date().toISOString()
            })
            .eq('id', insumoInventario.id);

          if (updateError) throw updateError;

          // Registrar movimiento en kardex
          const { error: kardexError } = await supabase
            .from('movimientos_inventario')
            .insert({
              inventario_id: insumoInventario.id,
              hospital_id: selectedHospital.id,
              tipo_movimiento: 'salida_por_folio',
              cantidad: item.cantidad,
              cantidad_anterior: cantidadAnterior,
              cantidad_nueva: cantidadNueva,
              folio_id: folioData.id,
              usuario_id: user.id,
              observaciones: `Consumo en folio ${numeroFolio} - ${data.procedimientoQuirurgico}`
            });

          if (kardexError) {
            console.error('Error al registrar en kardex:', kardexError);
          }
        }
      }

      toast.success('Folio creado exitosamente', {
        description: `Número de folio: ${numeroFolio}`
      });
      setShowForm(false);
      fetchFolios();
    } catch (error: any) {
      console.error('Error al crear folio:', error);
      toast.error('Error al crear folio', {
        description: error.message,
      });
    }
  };

  const handleCancelFolio = async (folioId: string) => {
    try {
      if (!user || !selectedHospital) return;

      // Obtener el folio y sus insumos antes de cancelarlo
      const { data: folio, error: folioError } = await supabase
        .from('folios')
        .select(`
          *,
          folios_insumos (
            insumo_id,
            cantidad
          )
        `)
        .eq('id', folioId)
        .single();

      if (folioError) throw folioError;

      // Obtener almacén del hospital
      const { data: almacen } = await supabase
        .from('almacenes')
        .select('id')
        .eq('hospital_id', selectedHospital.id)
        .maybeSingle();

      // Actualizar estado del folio
      const { error: updateError } = await supabase
        .from('folios')
        .update({ 
          estado: 'cancelado',
          cancelado_por: user.id,
        })
        .eq('id', folioId);

      if (updateError) throw updateError;

      // DEVOLVER inventario y registrar movimiento
      if (almacen && folio.folios_insumos && folio.folios_insumos.length > 0) {
        for (const folioInsumo of folio.folios_insumos) {
          // Buscar el inventario correspondiente
          const { data: inventarioItems } = await supabase
            .from('inventario_hospital')
            .select('*')
            .eq('almacen_id', almacen.id)
            .eq('insumo_catalogo_id', folioInsumo.insumo_id)
            .eq('estatus', 'activo')
            .order('fecha_caducidad', { ascending: true })
            .limit(1);

          if (inventarioItems && inventarioItems.length > 0) {
            const inventario = inventarioItems[0];
            const cantidadAnterior = inventario.cantidad_actual;
            const cantidadNueva = cantidadAnterior + folioInsumo.cantidad;

            // Devolver al inventario
            const { error: devolucionError } = await supabase
              .from('inventario_hospital')
              .update({ 
                cantidad_actual: cantidadNueva,
                updated_at: new Date().toISOString()
              })
              .eq('id', inventario.id);

            if (devolucionError) {
              console.error('Error al devolver inventario:', devolucionError);
              continue;
            }

            // Registrar movimiento de devolución en kardex
            await supabase
              .from('movimientos_inventario')
              .insert({
                inventario_id: inventario.id,
                hospital_id: selectedHospital.id,
                tipo_movimiento: 'ajuste',
                cantidad: folioInsumo.cantidad,
                cantidad_anterior: cantidadAnterior,
                cantidad_nueva: cantidadNueva,
                folio_id: folioId,
                usuario_id: user.id,
                observaciones: `Devolución por cancelación de folio ${folio.numero_folio}`
              });
          }
        }
      }

      toast.success('Folio cancelado exitosamente', {
        description: 'El inventario ha sido devuelto automáticamente'
      });
      fetchFolios();
    } catch (error: any) {
      console.error('Error al cancelar folio:', error);
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
                              // Fetch insumos for this folio with JOIN to get insumo details
                              const { data: insumosData } = await (supabase as any)
                                .from('folios_insumos')
                                .select(`
                                  cantidad,
                                  insumos (
                                    nombre,
                                    descripcion,
                                    lote,
                                    clave
                                  )
                                `)
                                .eq('folio_id', folio.id);
                              setSelectedFolioInsumos(insumosData || []);
                              setShowDetail(true);
                            }}
                          >
                            Ver Detalle
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={async () => {
                              // Fetch insumos for this folio with JOIN to get insumo details
                              const { data: insumosData } = await (supabase as any)
                                .from('folios_insumos')
                                .select(`
                                  cantidad,
                                  insumos (
                                    nombre,
                                    descripcion,
                                    lote,
                                    clave
                                  )
                                `)
                                .eq('folio_id', folio.id);
                              
                              // Aplanar la estructura de datos para el PDF
                              const insumosFlat = (insumosData || []).map((item: any) => ({
                                nombre: item.insumos?.nombre || '',
                                descripcion: item.insumos?.descripcion || '',
                                lote: item.insumos?.lote || '',
                                clave: item.insumos?.clave || '',
                                cantidad: item.cantidad
                              }));
                              
                              generateFolioPDF(folio, insumosFlat, tiposAnestesiaLabels);
                            }}
                          >
                            <Download className="h-4 w-4" />
                            PDF
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
