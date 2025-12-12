import { useState, useEffect } from "react";
import { UserRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileX, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FolioForm from "@/components/forms/FolioForm";
import FolioDetailDialog from "@/components/dialogs/FolioDetailDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHospital } from "@/contexts/HospitalContext";
import { generateFolioPDF } from "@/utils/pdfExport";
import { assertSupabaseOk, collectSupabaseErrors } from "@/utils/supabaseAssert";

interface FoliosProps {
  userRole: UserRole;
}

const Folios = ({ userRole }: FoliosProps) => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [folios, setFolios] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [selectedFolioInsumos, setSelectedFolioInsumos] = useState<any[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  const canCancel = userRole === "supervisor" || userRole === "gerente" || userRole === "gerente_operaciones";

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
        .from("folios")
        .select("*")
        .eq("hospital_budget_code", selectedHospital.budget_code)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFolios(data || []);
    } catch (error: any) {
      toast.error("Error al cargar folios", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolio = async (data: any) => {
    try {
      if (!user || !selectedHospital) {
        toast.error("Debes seleccionar un hospital para continuar");
        return;
      }

      // Validar que venga el almacén provisional seleccionado
      if (!data.almacen_provisional_id) {
        toast.error("Debe seleccionar un almacén provisional", {
          description: "Los insumos solo pueden consumirse de almacenes provisionales",
        });
        return;
      }

      // PASO 1: Obtener almacén general (para referencia) e inventario del provisional seleccionado
      const [almacenResult, provisionalResult] = await Promise.all([
        supabase.from("almacenes").select("id").eq("hospital_id", selectedHospital.id).maybeSingle(),
        supabase
          .from("almacen_provisional_inventario")
          .select(
            `
            id,
            cantidad_disponible,
            insumo_catalogo_id,
            insumo:insumos_catalogo(id, nombre)
          `,
          )
          .eq("almacen_provisional_id", data.almacen_provisional_id),
      ]);

      // No permitir fallos silenciosos
      assertSupabaseOk(almacenResult as any, "Folios.handleCreateFolio: cargar almacén general");
      assertSupabaseOk(provisionalResult as any, "Folios.handleCreateFolio: cargar inventario provisional");

      const almacen = (almacenResult as any).data;

      if (!almacen) {
        toast.error("No se encontró almacén para este hospital", {
          description: "Contacta al administrador del sistema",
        });
        return;
      }

      const inventarioProvisional = provisionalResult.data || [];

      // Crear mapa del inventario provisional - SOLO del provisional seleccionado
      const provisionalMap = new Map<string, { cantidad_disponible: number; items: any[] }>();
      inventarioProvisional.forEach((inv: any) => {
        if (inv.insumo_catalogo_id) {
          const existing = provisionalMap.get(inv.insumo_catalogo_id);
          if (existing) {
            existing.cantidad_disponible += inv.cantidad_disponible || 0;
            existing.items.push(inv);
          } else {
            provisionalMap.set(inv.insumo_catalogo_id, {
              cantidad_disponible: inv.cantidad_disponible || 0,
              items: [inv],
            });
          }
        }
      });

      // PASO 2: VALIDAR EXISTENCIAS SOLO EN EL PROVISIONAL (insumos regulares + adicionales)
      const validacionErrors: string[] = [];

      // Crear mapa de cantidades totales requeridas (regulares + adicionales)
      const cantidadesRequeridas = new Map<string, { cantidad: number; nombre: string }>();

      // Agregar insumos regulares
      if (data.insumos && data.insumos.length > 0) {
        for (const item of data.insumos) {
          const insumo_id = item.insumo?.id || item.insumo_catalogo_id;
          if (!insumo_id) {
            validacionErrors.push(`❌ ${item.insumo?.nombre || "Insumo"}: ID de insumo no encontrado`);
            continue;
          }
          const existing = cantidadesRequeridas.get(insumo_id);
          cantidadesRequeridas.set(insumo_id, {
            cantidad: (existing?.cantidad || 0) + item.cantidad,
            nombre: item.insumo?.nombre || existing?.nombre || "Insumo",
          });
        }
      }

      // Agregar insumos adicionales al total requerido
      if (data.insumosAdicionales && data.insumosAdicionales.length > 0) {
        for (const item of data.insumosAdicionales) {
          const insumo_id = item.insumo?.id;
          if (!insumo_id) {
            validacionErrors.push(`❌ ${item.insumo?.nombre || "Insumo adicional"}: ID de insumo no encontrado`);
            continue;
          }
          const existing = cantidadesRequeridas.get(insumo_id);
          cantidadesRequeridas.set(insumo_id, {
            cantidad: (existing?.cantidad || 0) + item.cantidad,
            nombre: item.insumo?.nombre || existing?.nombre || "Insumo",
          });
        }
      }

      // Validar disponibilidad de stock SOLO EN EL PROVISIONAL
      for (const [insumo_id, { cantidad, nombre }] of cantidadesRequeridas) {
        const stockProvisional = provisionalMap.get(insumo_id)?.cantidad_disponible || 0;

        if (stockProvisional < cantidad) {
          if (stockProvisional === 0) {
            validacionErrors.push(
              `❌ ${nombre}: No disponible en el almacén provisional "${data.almacen_provisional_nombre}"`,
            );
          } else {
            validacionErrors.push(
              `❌ ${nombre}: Stock insuficiente en provisional (Disponible: ${stockProvisional}, Requerido: ${cantidad})`,
            );
          }
        }
      }

      if (validacionErrors.length > 0) {
        toast.error("No se puede crear el folio - Stock insuficiente en almacén provisional", {
          description: validacionErrors.join("\n"),
          duration: 10000,
        });
        return;
      }

      // PASO 4: Generar número de folio
      const { count, error: countError } = await supabase
        .from("folios")
        .select("*", { count: "exact", head: true })
        .eq("hospital_budget_code", selectedHospital.budget_code);

      if (countError) throw countError;

      const numeroFolio = `${selectedHospital.budget_code}-${String((count || 0) + 1).padStart(6, "0")}`;

      // PASO 5: Crear el folio CON almacen_provisional_id para rastreo
      const { data: folioData, error: folioError } = await supabase
        .from("folios")
        .insert({
          numero_folio: numeroFolio,
          state_name: selectedHospital.state_name,
          hospital_budget_code: selectedHospital.budget_code,
          hospital_display_name: selectedHospital.display_name,
          hospital_id: selectedHospital.id,
          almacen_provisional_id: data.almacen_provisional_id,
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
          estado: "activo",
        })
        .select()
        .single();

      if (folioError) throw folioError;

      // PASO 6: Procesar insumos - Preparar todas las operaciones (SOLO del provisional)
      const provisionalUpdates: any[] = [];
      const movimientosProvisional: any[] = [];
      const foliosInsumos: any[] = [];
      const foliosInsumosAdicionales: any[] = [];

      // Función para procesar descuento SOLO del almacén provisional
      const procesarDescuentoProvisional = (insumo_id: string, cantidad: number, observacionExtra: string = "") => {
        let cantidadRestante = cantidad;
        const insumoProvisional = provisionalMap.get(insumo_id);

        if (insumoProvisional && insumoProvisional.cantidad_disponible > 0) {
          for (const item of insumoProvisional.items) {
            if (cantidadRestante <= 0) break;
            if (item.cantidad_disponible <= 0) continue;

            const cantidadDesdeEsteItem = Math.min(cantidadRestante, item.cantidad_disponible);

            const existingUpdate = provisionalUpdates.find((u) => u.id === item.id);
            if (existingUpdate) {
              existingUpdate.cantidad_disponible -= cantidadDesdeEsteItem;
            } else {
              provisionalUpdates.push({
                id: item.id,
                cantidad_disponible: item.cantidad_disponible - cantidadDesdeEsteItem,
              });
            }

            movimientosProvisional.push({
              almacen_provisional_id: data.almacen_provisional_id,
              hospital_id: selectedHospital.id,
              insumo_catalogo_id: insumo_id,
              cantidad: cantidadDesdeEsteItem,
              tipo: "salida",
              folio_id: folioData.id,
              usuario_id: user.id,
              observaciones: `Consumo en folio ${numeroFolio} desde ${data.almacen_provisional_nombre}${observacionExtra}`,
            });

            item.cantidad_disponible -= cantidadDesdeEsteItem;
            cantidadRestante -= cantidadDesdeEsteItem;
          }
          insumoProvisional.cantidad_disponible -= cantidad - cantidadRestante;
        }
      };

      // Procesar insumos regulares
      if (data.insumos && data.insumos.length > 0) {
        for (const item of data.insumos) {
          const insumo_id = item.insumo?.id || item.insumo_catalogo_id;
          if (!insumo_id) continue;
          procesarDescuentoProvisional(insumo_id, item.cantidad, "");
          foliosInsumos.push({
            folio_id: folioData.id,
            insumo_id: insumo_id,
            cantidad: item.cantidad,
          });
        }
      }

      // Procesar insumos adicionales
      if (data.insumosAdicionales && data.insumosAdicionales.length > 0) {
        for (const item of data.insumosAdicionales) {
          const insumo_id = item.insumo?.id;
          if (!insumo_id) continue;
          procesarDescuentoProvisional(insumo_id, item.cantidad, " [ADICIONAL]");
          foliosInsumosAdicionales.push({
            folio_id: folioData.id,
            insumo_id: insumo_id,
            cantidad: item.cantidad,
            motivo: item.motivo || null,
            created_by: user.id,
          });
        }
      }

      // PASO 7: Ejecutar todas las operaciones en paralelo
      const updateOperations = [];

      for (const upd of provisionalUpdates) {
        updateOperations.push(
          supabase
            .from("almacen_provisional_inventario")
            .update({ cantidad_disponible: upd.cantidad_disponible, updated_at: new Date().toISOString() })
            .eq("id", upd.id),
        );
      }

      if (movimientosProvisional.length > 0) {
        updateOperations.push(supabase.from("movimientos_almacen_provisional").insert(movimientosProvisional));
      }
      if (foliosInsumos.length > 0) {
        updateOperations.push(supabase.from("folios_insumos").insert(foliosInsumos));
      }
      if (foliosInsumosAdicionales.length > 0) {
        updateOperations.push(supabase.from("folios_insumos_adicionales").insert(foliosInsumosAdicionales));
      }

      // Ejecutar en paralelo y NO ignorar errores.
      const results = await Promise.all(updateOperations);
      collectSupabaseErrors(results as any, "Folios.handleCreateFolio: aplicar updates/inserts");

      toast.success("Folio creado exitosamente", {
        description: `Número de folio: ${numeroFolio} (consumido de ${data.almacen_provisional_nombre})`,
      });
      setShowForm(false);
      fetchFolios();
    } catch (error: any) {
      console.error("Error al crear folio:", error);
      toast.error("Error al crear folio", {
        description: error.message,
      });
    }
  };

  const handleCancelFolio = async (folioId: string) => {
    try {
      if (!user || !selectedHospital) return;

      // Obtener el folio con su almacén provisional y sus insumos (regulares + adicionales)
      const { data: folio, error: folioError } = await supabase
        .from("folios")
        .select(
          `
          *,
          folios_insumos (
            insumo_id,
            cantidad
          ),
          folios_insumos_adicionales (
            insumo_id,
            cantidad
          )
        `,
        )
        .eq("id", folioId)
        .single();

      if (folioError) throw folioError;

      // Determinar almacén provisional origen (primero del folio, luego de movimientos)
      let almacenProvisionalId = folio.almacen_provisional_id;

      if (!almacenProvisionalId) {
        // Fallback: obtener desde movimientos_almacen_provisional
        const { data: movimiento } = await supabase
          .from("movimientos_almacen_provisional")
          .select("almacen_provisional_id")
          .eq("folio_id", folioId)
          .eq("tipo", "salida")
          .limit(1)
          .maybeSingle();

        almacenProvisionalId = movimiento?.almacen_provisional_id;
      }

      // Actualizar estado del folio
      const { error: updateError } = await supabase
        .from("folios")
        .update({
          estado: "cancelado",
          cancelado_por: user.id,
        })
        .eq("id", folioId);

      if (updateError) throw updateError;

      // Combinar insumos regulares + adicionales para devolución
      const todosLosInsumos: { insumo_id: string; cantidad: number }[] = [
        ...(folio.folios_insumos || []),
        ...(folio.folios_insumos_adicionales || []),
      ];

      // DEVOLVER inventario AL ALMACÉN PROVISIONAL CORRECTO
      if (almacenProvisionalId && todosLosInsumos.length > 0) {
        // Obtener inventario actual del provisional para este folio
        const { data: inventarioProvisional } = await supabase
          .from("almacen_provisional_inventario")
          .select("id, insumo_catalogo_id, cantidad_disponible")
          .eq("almacen_provisional_id", almacenProvisionalId);

        const provisionalMap = new Map((inventarioProvisional || []).map((inv) => [inv.insumo_catalogo_id, inv]));

        const updatePromises: Array<PromiseLike<{ error: any }>> = [];
        const movimientosDevolucion: any[] = [];

        for (const folioInsumo of todosLosInsumos) {
          const itemProvisional = provisionalMap.get(folioInsumo.insumo_id);

          if (itemProvisional) {
            // El insumo existe en provisional - solo actualizar cantidad
            updatePromises.push(
              supabase
                .from("almacen_provisional_inventario")
                .update({
                  cantidad_disponible: itemProvisional.cantidad_disponible + folioInsumo.cantidad,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", itemProvisional.id)
                .select(),
            );
            // Actualizar mapa para evitar conflictos en múltiples items del mismo insumo
            itemProvisional.cantidad_disponible += folioInsumo.cantidad;
          } else {
            // El insumo no existe en provisional - crear nuevo registro
            updatePromises.push(
              supabase.from("almacen_provisional_inventario").insert({
                almacen_provisional_id: almacenProvisionalId,
                insumo_catalogo_id: folioInsumo.insumo_id,
                cantidad_disponible: folioInsumo.cantidad,
              }).select(),
            );
          }

          // Registrar movimiento de devolución
          movimientosDevolucion.push({
            almacen_provisional_id: almacenProvisionalId,
            hospital_id: selectedHospital.id,
            insumo_catalogo_id: folioInsumo.insumo_id,
            cantidad: folioInsumo.cantidad,
            tipo: "entrada",
            folio_id: folioId,
            usuario_id: user.id,
            observaciones: `Devolución por cancelación de folio ${folio.numero_folio}`,
          });
        }

        // Ejecutar todas las operaciones
        const res = await Promise.all(updatePromises);
        collectSupabaseErrors(res as any, "Folios.handleCancelFolio: devolver inventario a provisional");

        if (movimientosDevolucion.length > 0) {
          const movRes = await supabase.from("movimientos_almacen_provisional").insert(movimientosDevolucion);
          assertSupabaseOk(movRes as any, "Folios.handleCancelFolio: insertar movimientos devolución");
        }

        toast.success("Folio cancelado exitosamente", {
          description: "El inventario ha sido devuelto al almacén provisional",
        });
      } else {
        toast.success("Folio cancelado", {
          description: "No se encontró almacén provisional para devolución de inventario",
        });
      }

      fetchFolios();
    } catch (error: any) {
      console.error("Error al cancelar folio:", error);
      toast.error("Error al cancelar folio", {
        description: error.message,
      });
    }
  };

  const tiposAnestesiaLabels: Record<string, string> = {
    general_balanceada_adulto: "General Balanceada Adulto",
    general_balanceada_pediatrica: "General Balanceada Pediátrica",
    general_alta_especialidad: "General Alta Especialidad",
    general_endovenosa: "General Endovenosa",
    locorregional: "Locorregional",
    sedacion: "Sedación",
  };

  return (
    <div className="space-y-6">
      {!selectedHospital && (
        <Alert>
          <AlertDescription>Debes seleccionar un hospital para ver y gestionar los folios.</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Folios</h1>
          <p className="text-muted-foreground">Gestión de procedimientos quirúrgicos</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)} disabled={!selectedHospital}>
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
                .filter(
                  (f) =>
                    searchTerm === "" ||
                    f.numero_folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    f.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    f.cirugia?.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((folio) => (
                  <Card key={folio.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{folio.numero_folio}</h3>
                            <Badge variant={folio.estado === "activo" ? "default" : "destructive"}>
                              {folio.estado === "activo" ? "Activo" : "Cancelado"}
                            </Badge>
                          </div>
                          <div className="grid gap-1 text-sm">
                            <p>
                              <span className="font-medium">Paciente:</span> {folio.paciente_nombre}
                            </p>
                            <p>
                              <span className="font-medium">Cirugía:</span> {folio.cirugia}
                            </p>
                            <p>
                              <span className="font-medium">Fecha:</span>{" "}
                              {new Date(folio.created_at).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="font-medium">Tipo de Anestesia:</span>{" "}
                              {tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia}
                            </p>
                            <p>
                              <span className="font-medium">Unidad:</span> {folio.unidad}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setSelectedFolio(folio);
                              // Fetch insumos for this folio with JOIN to insumos_catalogo
                              const { data: insumosData } = await supabase
                                .from("folios_insumos")
                                .select(
                                  `
                                  cantidad,
                                  insumos_catalogo:insumo_id (
                                    id,
                                    nombre,
                                    descripcion,
                                    clave,
                                    presentacion,
                                    tipo
                                  )
                                `,
                                )
                                .eq("folio_id", folio.id);

                              // Transformar datos para el dialog
                              const insumosFormatted = (insumosData || []).map((item: any) => ({
                                cantidad: item.cantidad,
                                insumos: {
                                  nombre: item.insumos_catalogo?.nombre || "Sin nombre",
                                  descripcion: item.insumos_catalogo?.descripcion || "",
                                  clave: item.insumos_catalogo?.clave || "",
                                  presentacion: item.insumos_catalogo?.presentacion || "",
                                  tipo: item.insumos_catalogo?.tipo || "",
                                },
                              }));
                              setSelectedFolioInsumos(insumosFormatted);
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
                              // Fetch insumos for this folio with JOIN to insumos_catalogo
                              const { data: insumosData } = await supabase
                                .from("folios_insumos")
                                .select(
                                  `
                                  cantidad,
                                  insumos_catalogo:insumo_id (
                                    nombre,
                                    descripcion,
                                    clave,
                                    presentacion
                                  )
                                `,
                                )
                                .eq("folio_id", folio.id);

                              // Aplanar la estructura de datos para el PDF
                              const insumosFlat = (insumosData || []).map((item: any) => ({
                                nombre: item.insumos_catalogo?.nombre || "",
                                descripcion: item.insumos_catalogo?.descripcion || "",
                                clave: item.insumos_catalogo?.clave || "",
                                presentacion: item.insumos_catalogo?.presentacion || "",
                                cantidad: item.cantidad,
                              }));

                              generateFolioPDF(folio, insumosFlat, tiposAnestesiaLabels);
                            }}
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                          {canCancel && folio.estado === "activo" && (
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
