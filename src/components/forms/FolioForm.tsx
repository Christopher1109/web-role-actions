import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useHospital } from "@/contexts/HospitalContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { InsumoCombobox } from "./InsumoCombobox"; // actualmente no se usa
import { toast } from "sonner";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Insumo = {
  id: string;
  nombre: string;
  lote: string;
  cantidadDefault: number;
  cantidadMinima: number | null;
  cantidadMaxima: number | null;
  condicionante: string | null;
  grupoExclusivo: string | null;
  tieneConfiguracion: boolean; // Indica si tiene configuración para el tipo de anestesia actual
};

type FolioInsumo = {
  insumo: {
    id: string;
    nombre: string;
    lote: string;
  };
  cantidad: number;
  cantidadMinima: number | null;
  cantidadMaxima: number | null;
  condicionante: string | null;
  grupoExclusivo: string | null;
  tieneConfiguracion: boolean;
};

/*
 * Mapeo de nombres de procedimientos (como vienen de la tabla procedimientos)
 * a los valores usados en insumo_configuracion.tipo_anestesia
 */
const procedimientoToTipoAnestesia: Record<string, string> = {
  Sedación: "sedacion",
  "Cuidados Anestésicos Monitoreados": "cuidados_monitoreados",
  "Anestesia Loco Regional": "loco_regional",
  "Anestesia General Loco Regional": "loco_regional",
  "Anestesia General Balanceada Adulto": "general_balanceada_adulto",
  "Anestesia General Balanceada Pediátrica": "general_balanceada_pediatrica",
  "Anestesia General Endovenosa": "general_endovenosa",
  "Anestesia General de Alta Especialidad": "alta_especialidad",
  "Alta Especialidad Trasplante Renal": "trasplante_renal",
  "Anestesia de Alta Especialidad en Trasplante Renal": "trasplante_renal",
  "Anestesia de Alta Especialidad en Trasplante Hepático": "trasplante_hepatico",
  "Anestesia de Alta Especialidad en Neurocirugía": "neurocirugia",
};

// Mapeo de labels para mostrar nombres amigables (los textos que quieres ver en la página)
const tipoAnestesiaLabels: Record<string, string> = {
  Sedación: "Sedación",
  "Cuidados Anestésicos Monitoreados": "Cuidados Anestésicos Monitoreados",
  "Anestesia Loco Regional": "Anestesia Loco Regional",
  "Anestesia General Loco Regional": "Anestesia Loco Regional",
  "Anestesia General Balanceada Adulto": "Anestesia General Balanceada Adulto",
  "Anestesia General Balanceada Pediátrica": "Anestesia General Balanceada Pediátrica",
  "Anestesia General Endovenosa": "Anestesia General Endovenosa",
  "Anestesia General de Alta Especialidad": "Anestesia General de Alta Especialidad",
  "Alta Especialidad Trasplante Renal": "Anestesia de Alta Especialidad en Trasplante Renal",
  "Anestesia de Alta Especialidad en Trasplante Renal": "Anestesia de Alta Especialidad en Trasplante Renal",
  anestesia_mixta: "Anestesia mixta",
};

// Mapeo de claves de procedimiento por tipo de anestesia (proc.nombre)
const tipoAnestesiaCodigos: Record<string, string> = {
  "Anestesia General Balanceada Adulto": "19.01.001",
  "Anestesia General de Alta Especialidad": "19.01.002",
  "Anestesia General Endovenosa": "19.01.003",
  "Anestesia General Balanceada Pediátrica": "19.01.004",
  "Anestesia Loco Regional": "19.01.005",
  Sedación: "19.01.006",
  "Anestesia de Alta Especialidad en Neurocirugía": "19.01.007",
  "Anestesia de Alta Especialidad en Trasplante Hepático": "19.01.008",
  "Anestesia de Alta Especialidad en Trasplante Renal": "19.01.009",
  "Alta Especialidad Trasplante Renal": "19.01.009",
  "Cuidados Anestésicos Monitoreados": "19.01.010",
};

// Esquema de validación de los campos del folio T33
const folioSchema = z.object({
  unidad: z.string().nonempty("Debes seleccionar un hospital"),
  numeroQuirofano: z.string().optional(),
  inicioProcedimiento: z.string().optional(),
  finProcedimiento: z.string().optional(),
  inicioAnestesia: z.string().optional(),
  finAnestesia: z.string().optional(),
  pacienteApellidoPaterno: z.string().nonempty("El apellido paterno es obligatorio"),
  pacienteApellidoMaterno: z.string().optional(),
  pacienteNombre: z.string().nonempty("El nombre del paciente es obligatorio"),
  pacienteNSS: z.string().optional(),
  pacienteEdadValor: z.number().min(0, "La edad no puede ser negativa"),
  pacienteEdadUnidad: z.enum(["días", "semanas", "meses", "años"]),
  pacienteGenero: z.enum(["M", "F", "Otro"]).optional(),
  procedimientoQuirurgico: z.string().nonempty("El procedimiento es obligatorio"),
  especialidadQuirurgica: z.string().optional(),
  tipoCirugia: z.string().optional(),
  tipoEvento: z.string().optional(),
  tipo_anestesia: z.string().nonempty("El tipo de anestesia es obligatorio"),
  cirujano: z.string().optional(),
  anestesiologo: z.string().optional(),
});

type FolioFormValues = z.infer<typeof folioSchema>;

interface FolioFormProps {
  onClose: () => void;
  onSubmit: (values: any) => void;
  defaultValues?: Partial<FolioFormValues>;
}

type Medico = {
  id: string;
  nombre: string;
  especialidad: string;
};

export default function FolioForm({ onClose, onSubmit, defaultValues }: FolioFormProps) {
  const { selectedHospital, availableHospitals, canSelectHospital, setSelectedHospital } = useHospital();

  // Estado para tipo de anestesia (anestesia normal o mixta)
  const [tipoAnestesia, setTipoAnestesia] = useState<string>("");
  // En caso de anestesia mixta, estos guardan los tipos seleccionados
  const [anestesiaPrincipal, setAnestesiaPrincipal] = useState<string>("");
  const [anestesiaSecundaria, setAnestesiaSecundaria] = useState<string>("");
  // Listas de insumos disponibles por anestesia
  const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
  const [insumosDisponiblesPrincipal, setInsumosDisponiblesPrincipal] = useState<Insumo[]>([]);
  const [insumosDisponiblesSecundaria, setInsumosDisponiblesSecundaria] = useState<Insumo[]>([]);
  // Insumos actualmente seleccionados en el folio
  const [insumosFolio, setInsumosFolio] = useState<FolioInsumo[]>([]);
  // Listas de médicos para selects
  const [cirujanos, setCirujanos] = useState<Medico[]>([]);
  const [anestesiologos, setAnestesiologos] = useState<Medico[]>([]);
  // Control del modal de agregar insumo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>("");
  // Lista de tipos de anestesia disponibles para el hospital seleccionado
  const [tiposAnestesiaDisponibles, setTiposAnestesiaDisponibles] = useState<Array<{ value: string; label: string }>>(
    [],
  );
  const [loadingProcedimientos, setLoadingProcedimientos] = useState(false);
  // Validaciones y alertas
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Configuración inicial del formulario
  const form = useForm<FolioFormValues>({
    resolver: zodResolver(folioSchema),
    defaultValues: {
      unidad: selectedHospital?.display_name || "",
      numeroQuirofano: "",
      inicioProcedimiento: "",
      finProcedimiento: "",
      inicioAnestesia: "",
      finAnestesia: "",
      pacienteApellidoPaterno: "",
      pacienteApellidoMaterno: "",
      pacienteNombre: "",
      pacienteNSS: "",
      pacienteEdadValor: 0,
      pacienteEdadUnidad: "años",
      pacienteGenero: undefined,
      procedimientoQuirurgico: "",
      especialidadQuirurgica: "",
      tipoCirugia: "",
      tipoEvento: "",
      tipo_anestesia: "",
      cirujano: "",
      anestesiologo: "",
      ...defaultValues,
    },
  });

  // Para mostrar la clave del procedimiento del tipo seleccionado
  const selectedTipoAnestesia = form.watch("tipo_anestesia");

  // Sincroniza el campo 'unidad' con el hospital seleccionado
  useEffect(() => {
    if (selectedHospital) {
      form.setValue("unidad", selectedHospital.display_name);
    }
  }, [selectedHospital, form]);

  // Cargar tipos de anestesia disponibles para el hospital seleccionado
  useEffect(() => {
    const loadProcedimientosHospital = async () => {
      if (!selectedHospital?.id) {
        setTiposAnestesiaDisponibles([]);
        return;
      }

      setLoadingProcedimientos(true);
      try {
        const { data: procedimientos, error } = await supabase
          .from("procedimientos")
          .select("nombre, descripcion")
          .eq("hospital_id", selectedHospital.id);

        if (error) throw error;

        if (procedimientos && procedimientos.length > 0) {
          // Mapear los procedimientos a formato de select
          const tiposDisponibles = procedimientos.map((proc) => ({
            value: proc.nombre,
            label: tipoAnestesiaLabels[proc.nombre] || proc.descripcion || proc.nombre,
          }));

          // Agregar la opción de anestesia mixta si hay más de un tipo disponible
          if (tiposDisponibles.length > 1) {
            tiposDisponibles.push({
              value: "anestesia_mixta",
              label: tipoAnestesiaLabels.anestesia_mixta,
            });
          }

          setTiposAnestesiaDisponibles(tiposDisponibles);
          console.log(`✅ Tipos de anestesia cargados para ${selectedHospital.display_name}:`, tiposDisponibles.length);
        } else {
          console.warn(`⚠️ No hay procedimientos configurados para ${selectedHospital.display_name}`);
          setTiposAnestesiaDisponibles([]);
          toast.error("Este hospital no tiene tipos de anestesia configurados");
        }
      } catch (error) {
        console.error("Error al cargar procedimientos del hospital:", error);
        toast.error("Error al cargar los tipos de anestesia disponibles");
        setTiposAnestesiaDisponibles([]);
      } finally {
        setLoadingProcedimientos(false);
      }
    };

    loadProcedimientosHospital();
  }, [selectedHospital]);

  // Carga las listas de médicos filtradas por hospital
  useEffect(() => {
    const loadMedicos = async () => {
      if (!selectedHospital?.id) {
        setCirujanos([]);
        setAnestesiologos([]);
        return;
      }

      try {
        const { data: medicosData, error } = await supabase
          .from("medicos")
          .select("*")
          .eq("activo", true)
          .eq("hospital_id", selectedHospital.id)
          .order("nombre");

        if (error) throw error;

        if (medicosData) {
          const cirujanosList = medicosData.filter(
            (m) => m.especialidad.toLowerCase().includes("ciruj") || m.especialidad.toLowerCase().includes("cirugía"),
          );
          const anestesiologosList = medicosData.filter(
            (m) =>
              m.especialidad.toLowerCase().includes("anestesia") ||
              m.especialidad.toLowerCase().includes("anestesiología"),
          );

          setCirujanos(cirujanosList.length > 0 ? cirujanosList : medicosData);
          setAnestesiologos(anestesiologosList.length > 0 ? anestesiologosList : medicosData);
        }
      } catch (error) {
        console.error("Error loading médicos:", error);
      }
    };

    loadMedicos();
  }, [selectedHospital]);

  /**
   * Combina insumos de dos anestesias en modo mixta.
   * Si un insumo está en ambas, suma las cantidades.
   * Muestra hasta 10 insumos (5 de cada tipo).
   */
  const combinarInsumosAnestesiaMixta = (principal: Insumo[], secundaria: Insumo[]) => {
    const insumosMap = new Map<string, FolioInsumo>();

    // Agregar los primeros 5 de la principal
    principal.slice(0, 5).forEach((insumo) => {
      insumosMap.set(insumo.id, {
        insumo: { id: insumo.id, nombre: insumo.nombre, lote: insumo.lote },
        cantidad: insumo.cantidadDefault,
        cantidadMinima: insumo.cantidadMinima,
        cantidadMaxima: insumo.cantidadMaxima,
        condicionante: insumo.condicionante,
        grupoExclusivo: insumo.grupoExclusivo,
        tieneConfiguracion: insumo.tieneConfiguracion,
      });
    });

    // Agregar los primeros 5 de la secundaria (o sumar si ya existe)
    secundaria.slice(0, 5).forEach((insumo) => {
      const existing = insumosMap.get(insumo.id);
      if (existing) {
        // Si ya existe, sumar la cantidad
        existing.cantidad += insumo.cantidadDefault;
      } else {
        // Si no existe, agregarlo
        insumosMap.set(insumo.id, {
          insumo: { id: insumo.id, nombre: insumo.nombre, lote: insumo.lote },
          cantidad: insumo.cantidadDefault,
          cantidadMinima: insumo.cantidadMinima,
          cantidadMaxima: insumo.cantidadMaxima,
          condicionante: insumo.condicionante,
          grupoExclusivo: insumo.grupoExclusivo,
          tieneConfiguracion: insumo.tieneConfiguracion,
        });
      }
    });

    setInsumosFolio(Array.from(insumosMap.values()));
  };

  /**
   * Carga los insumos de una anestesia específica desde `insumo_configuracion`
   * usando el catálogo nuevo (insumos_catalogo)
   */
  const loadInsumosForTipo = async (tipo: string): Promise<Insumo[]> => {
    if (!tipo) return [];

    try {
      // Convertir el nombre del procedimiento al valor usado en insumo_configuracion.tipo_anestesia
      const tipoDb = procedimientoToTipoAnestesia[tipo] ?? tipo;

      console.log(`🔍 Buscando insumos en insumo_configuracion para tipo: "${tipo}" → "${tipoDb}"`);

      // Consultar insumo_configuracion con join a insumos_catalogo
      const { data: configuracionInsumos, error } = await supabase
        .from("insumo_configuracion")
        .select(
          `
          id,
          cantidad_default,
          min_anestesia,
          max_anestesia,
          condicionante,
          grupo_exclusivo,
          nota,
          insumos_catalogo!inner (
            id,
            nombre,
            activo,
            clave
          )
        `,
        )
        .eq("tipo_anestesia", tipoDb)
        .eq("insumos_catalogo.activo", true);

      if (error) throw error;

      const insumos: Insumo[] = (configuracionInsumos || [])
        .filter((config: any) => config.insumos_catalogo)
        .map((config: any) => ({
          id: config.insumos_catalogo.id,
          nombre: config.insumos_catalogo.nombre,
          lote: config.insumos_catalogo.clave || "", // Usar clave como lote por ahora
          cantidadDefault: config.cantidad_default ?? 1,
          cantidadMinima: config.min_anestesia ?? null,
          cantidadMaxima: config.max_anestesia ?? null,
          condicionante: config.condicionante ?? null,
          grupoExclusivo: config.grupo_exclusivo ?? null,
          tieneConfiguracion: true, // Todos los de esta query tienen configuración
        }));

      console.log(`✅ Insumos cargados desde insumo_configuracion: ${insumos.length}`);

      // Si no se encontraron insumos con configuración, cargar todos los insumos activos sin configuración
      if (insumos.length === 0) {
        console.warn(`⚠️ No hay configuración para tipo "${tipoDb}", cargando insumos genéricos`);

        const { data: insumosGenericos, error: errorGenericos } = await supabase
          .from("insumos_catalogo")
          .select("id, nombre, clave, activo")
          .eq("activo", true)
          .limit(20); // Limitar a 20 para no saturar

        if (errorGenericos) throw errorGenericos;

        return (insumosGenericos || []).map((insumo: any) => ({
          id: insumo.id,
          nombre: insumo.nombre,
          lote: insumo.clave || "",
          cantidadDefault: 1,
          cantidadMinima: null,
          cantidadMaxima: null,
          condicionante: null,
          grupoExclusivo: null,
          tieneConfiguracion: false,
        }));
      }

      return insumos;
    } catch (error) {
      console.error("Error loading insumos desde insumo_configuracion:", error);
      return [];
    }
  };

  // Efecto: cuando cambia 'tipoAnestesia' en modo normal
  useEffect(() => {
    const loadInsumosForAnestesia = async () => {
      // Limpiar al cambiar o si no hay tipo
      if (!tipoAnestesia) {
        setInsumosDisponibles([]);
        setInsumosFolio([]);
        return;
      }

      if (tipoAnestesia === "anestesia_mixta") {
        // Si es mixta, limpiar y esperar a que se seleccionen los dos tipos
        setInsumosDisponibles([]);
        setInsumosFolio([]);
        return;
      }

      const insumosData = await loadInsumosForTipo(tipoAnestesia);
      setInsumosDisponibles(insumosData);

      // REEMPLAZAR con los primeros 5 insumos básicos
      const preselected: FolioInsumo[] = insumosData.slice(0, 5).map((insumo) => ({
        insumo: {
          id: insumo.id,
          nombre: insumo.nombre,
          lote: insumo.lote,
        },
        cantidad: insumo.cantidadDefault,
        cantidadMinima: insumo.cantidadMinima,
        cantidadMaxima: insumo.cantidadMaxima,
        condicionante: insumo.condicionante,
        grupoExclusivo: insumo.grupoExclusivo,
        tieneConfiguracion: insumo.tieneConfiguracion,
      }));
      setInsumosFolio(preselected);
    };

    loadInsumosForAnestesia();
  }, [tipoAnestesia]);

  // Efecto: cuando cambia anestesiaPrincipal en modo mixta
  useEffect(() => {
    const loadInsumosPrincipal = async () => {
      if (!anestesiaPrincipal || tipoAnestesia !== "anestesia_mixta") return;

      const insumosData = await loadInsumosForTipo(anestesiaPrincipal);
      setInsumosDisponiblesPrincipal(insumosData);

      // Si ya hay secundaria, recombinar ambas
      if (anestesiaSecundaria) {
        const secundariaData = await loadInsumosForTipo(anestesiaSecundaria);
        combinarInsumosAnestesiaMixta(insumosData, secundariaData);
      } else {
        // Solo principal, mostrar sus 5 insumos
        const preselected: FolioInsumo[] = insumosData.slice(0, 5).map((insumo) => ({
          insumo: {
            id: insumo.id,
            nombre: insumo.nombre,
            lote: insumo.lote,
          },
          cantidad: insumo.cantidadDefault,
          cantidadMinima: insumo.cantidadMinima,
          cantidadMaxima: insumo.cantidadMaxima,
          condicionante: insumo.condicionante,
          grupoExclusivo: insumo.grupoExclusivo,
          tieneConfiguracion: insumo.tieneConfiguracion,
        }));
        setInsumosFolio(preselected);
      }
    };

    loadInsumosPrincipal();
  }, [anestesiaPrincipal, tipoAnestesia, anestesiaSecundaria]);

  // Efecto: cuando cambia anestesiaSecundaria en modo mixta
  useEffect(() => {
    const loadInsumosSecundaria = async () => {
      if (!anestesiaSecundaria || tipoAnestesia !== "anestesia_mixta") return;

      const insumosData = await loadInsumosForTipo(anestesiaSecundaria);
      setInsumosDisponiblesSecundaria(insumosData);

      // Si ya hay principal, recombinar ambas
      if (anestesiaPrincipal) {
        const principalData = await loadInsumosForTipo(anestesiaPrincipal);
        combinarInsumosAnestesiaMixta(principalData, insumosData);
      } else {
        // Solo secundaria, mostrar sus 5 insumos
        const preselected: FolioInsumo[] = insumosData.slice(0, 5).map((insumo) => ({
          insumo: {
            id: insumo.id,
            nombre: insumo.nombre,
            lote: insumo.lote,
          },
          cantidad: insumo.cantidadDefault,
          cantidadMinima: insumo.cantidadMinima,
          cantidadMaxima: insumo.cantidadMaxima,
          condicionante: insumo.condicionante,
          grupoExclusivo: insumo.grupoExclusivo,
          tieneConfiguracion: insumo.tieneConfiguracion,
        }));
        setInsumosFolio(preselected);
      }
    };

    loadInsumosSecundaria();
  }, [anestesiaSecundaria, tipoAnestesia, anestesiaPrincipal]);

  // Calcula insumos para agregar en la UI.  En modo mixta usa la unión de insumos de ambas anestesias
  const insumosParaAgregar = React.useMemo(() => {
    let availableInsumos: Insumo[] = [];
    if (tipoAnestesia === "anestesia_mixta") {
      const unionMap = new Map<string, Insumo>();
      [...insumosDisponiblesPrincipal, ...insumosDisponiblesSecundaria].forEach((insumo) => {
        unionMap.set(insumo.id, insumo);
      });
      availableInsumos = Array.from(unionMap.values());
    } else {
      availableInsumos = insumosDisponibles;
    }
    return availableInsumos.filter((insumo) => !insumosFolio.some((fi) => fi.insumo.id === insumo.id));
  }, [tipoAnestesia, insumosDisponibles, insumosDisponiblesPrincipal, insumosDisponiblesSecundaria, insumosFolio]);

  // Validar todos los insumos actuales
  const validateAllInsumos = (insumos: FolioInsumo[]) => {
    const errors: string[] = [];

    // Validar cantidades
    insumos.forEach((fi) => {
      const min = fi.cantidadMinima ?? 0;
      const max = fi.cantidadMaxima ?? Number.MAX_SAFE_INTEGER;

      if (fi.cantidad < min && min > 0) {
        errors.push(`${fi.insumo.nombre}: cantidad mínima requerida es ${min}, actual ${fi.cantidad}`);
      }

      if (fi.cantidad > max && fi.cantidadMaxima != null) {
        errors.push(`${fi.insumo.nombre}: cantidad máxima permitida es ${max}, actual ${fi.cantidad}`);
      }
    });

    // Validar grupos exclusivos
    const gruposUsados = new Map<string, string[]>();
    insumos.forEach((fi) => {
      if (fi.grupoExclusivo) {
        if (!gruposUsados.has(fi.grupoExclusivo)) {
          gruposUsados.set(fi.grupoExclusivo, []);
        }
        gruposUsados.get(fi.grupoExclusivo)!.push(fi.insumo.nombre);
      }
    });

    gruposUsados.forEach((nombres, grupo) => {
      if (nombres.length > 1) {
        errors.push(`Grupo exclusivo "${grupo}": solo puedes seleccionar uno de: ${nombres.join(", ")}`);
      }
    });

    setValidationErrors(errors);
  };

  // Validar insumos cuando cambien
  useEffect(() => {
    validateAllInsumos(insumosFolio);
  }, [insumosFolio]);

  // Agrega un insumo manualmente desde el modal
  const handleAgregarInsumo = () => {
    const insumo = insumosParaAgregar.find((i) => i.id === selectedInsumoId);
    if (!insumo) return;

    // 🔴 VALIDAR GRUPO EXCLUSIVO: solo un insumo por grupo_exclusivo
    if (insumo.grupoExclusivo) {
      const yaExisteEnGrupo = insumosFolio.find((fi) => fi.grupoExclusivo === insumo.grupoExclusivo);

      if (yaExisteEnGrupo) {
        toast.error(`Solo puedes seleccionar un insumo del grupo: ${insumo.grupoExclusivo}`);
        return;
      }
    }

    const defaultCantidad = insumo.cantidadDefault ?? insumo.cantidadMinima ?? 1;

    setInsumosFolio([
      ...insumosFolio,
      {
        insumo: {
          id: insumo.id,
          nombre: insumo.nombre,
          lote: insumo.lote,
        },
        cantidad: defaultCantidad,
        cantidadMinima: insumo.cantidadMinima,
        cantidadMaxima: insumo.cantidadMaxima,
        condicionante: insumo.condicionante,
        grupoExclusivo: insumo.grupoExclusivo,
        tieneConfiguracion: insumo.tieneConfiguracion,
      },
    ]);
    setSelectedInsumoId("");
    setIsModalOpen(false);
  };

  // Elimina un insumo de la lista del folio
  const handleRemoveInsumo = (insumoId: string) => {
    const nuevosInsumos = insumosFolio.filter((fi) => fi.insumo.id !== insumoId);
    setInsumosFolio(nuevosInsumos);
  };

  // Actualiza la cantidad de un insumo del folio respetando min/max
  const handleUpdateCantidad = (insumoId: string, cantidad: number) => {
    setInsumosFolio((prev) =>
      prev.map((fi) => {
        if (fi.insumo.id !== insumoId) return fi;

        const min = fi.cantidadMinima ?? 0;
        const max = fi.cantidadMaxima ?? Number.MAX_SAFE_INTEGER;

        let nuevaCantidad = cantidad;

        if (nuevaCantidad < min) {
          nuevaCantidad = min;
          if (min > 0) {
            toast.error(`La cantidad mínima para ${fi.insumo.nombre} es ${min}`);
          }
        }

        if (nuevaCantidad > max) {
          nuevaCantidad = max;
          if (fi.cantidadMaxima != null) {
            toast.error(`La cantidad máxima para ${fi.insumo.nombre} es ${max}`);
          }
        }

        return { ...fi, cantidad: nuevaCantidad };
      }),
    );
  };

  // Envía el formulario completo
  const handleSubmitForm = async (values: FolioFormValues) => {
    // Validar que el tipo de anestesia sea válido para el hospital
    if (!selectedHospital?.id) {
      toast.error("Debe seleccionar un hospital");
      return;
    }

    // Validar que no haya errores de validación
    if (validationErrors.length > 0) {
      toast.error("Por favor, corrige los errores de validación antes de continuar");
      return;
    }

    // Validar anestesia mixta si aplica
    if (values.tipo_anestesia === "anestesia_mixta") {
      if (!anestesiaPrincipal || !anestesiaSecundaria) {
        toast.error("Debes seleccionar anestesia inicial y final");
        return;
      }
    }

    try {
      // Validar tipo de anestesia con el backend
      const { data: validationResult, error: validationError } = await supabase.functions.invoke("validate-folio", {
        body: {
          hospital_id: selectedHospital.id,
          tipo_anestesia: values.tipo_anestesia,
          anestesia_principal: anestesiaPrincipal || null,
          anestesia_secundaria: anestesiaSecundaria || null,
        },
      });

      if (validationError) throw validationError;

      if (!validationResult?.valid) {
        toast.error(validationResult?.error || "El tipo de anestesia no es válido para este hospital");
        return;
      }

      // Obtener nombres de médicos seleccionados
      const cirujanoSeleccionado = cirujanos.find((m) => m.id === values.cirujano);
      const anestesiologoSeleccionado = anestesiologos.find((m) => m.id === values.anestesiologo);

      // Determinar el tipo de anestesia que se va a registrar en el folio:
      // si es mixta, usamos la anestesia final (secundaria)
      const tipoAnestesiaFinal =
        values.tipo_anestesia === "anestesia_mixta" && anestesiaSecundaria
          ? anestesiaSecundaria
          : values.tipo_anestesia;

      const submitData = {
        ...values,
        tipo_anestesia: tipoAnestesiaFinal,
        cirujanoNombre: cirujanoSeleccionado?.nombre,
        anestesiologoNombre: anestesiologoSeleccionado?.nombre,
        insumos: insumosFolio,
        hospital_id: selectedHospital?.id,
        hospital_display_name: selectedHospital?.display_name,
        hospital_budget_code: selectedHospital?.budget_code,
        state_name: selectedHospital?.state_name,
        ...(tipoAnestesia === "anestesia_mixta" && {
          anestesiaPrincipal: anestesiaPrincipal,
          anestesiaSecundaria: anestesiaSecundaria,
        }),
      };
      onSubmit(submitData);
    } catch (error) {
      console.error("Error al validar el tipo de anestesia:", error);
      toast.error("Error al validar el formulario. Por favor, intente nuevamente.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
        {/* Encabezado: Unidad y Quirófano */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad Médica *</FormLabel>
                {canSelectHospital ? (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const hospital = availableHospitals.find((h) => h.display_name === value);
                      if (hospital) setSelectedHospital(hospital);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona hospital" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableHospitals.map((h) => (
                        <SelectItem key={h.budget_code} value={h.display_name}>
                          {h.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input value={selectedHospital?.display_name || ""} readOnly className="bg-muted" />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numeroQuirofano"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Quirófano *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Q-01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Horarios */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Horarios</h3>
          <div className="grid grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="inicioProcedimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inicio Procedimiento *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finProcedimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin Procedimiento *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inicioAnestesia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inicio Anestesia *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finAnestesia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin Anestesia *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Datos del paciente */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Datos del Paciente</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="pacienteApellidoPaterno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido Paterno *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pérez" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pacienteApellidoMaterno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido Materno *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="García" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pacienteNombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre(s) *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Juan" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="pacienteNSS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NSS *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="12345678901" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pacienteEdadValor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      placeholder="1"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pacienteEdadUnidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="días">Días</SelectItem>
                      <SelectItem value="semanas">Semanas</SelectItem>
                      <SelectItem value="meses">Meses</SelectItem>
                      <SelectItem value="años">Años</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="pacienteGenero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Género *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Procedimiento quirúrgico */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Procedimiento Quirúrgico</h3>
          <FormField
            control={form.control}
            name="procedimientoQuirurgico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Procedimiento Quirúrgico *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Apendicectomía" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="especialidadQuirurgica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad Quirúrgica</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Cirugía General" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoCirugia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cirugía</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="electiva">Electiva</SelectItem>
                      <SelectItem value="urgencia">Urgencia</SelectItem>
                      <SelectItem value="emergencia">Emergencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoEvento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Evento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="programado">Programado</SelectItem>
                      <SelectItem value="no_programado">No Programado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tipo de anestesia y anestesia mixta */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Tipo de Anestesia</h3>
          <FormField
            control={form.control}
            name="tipo_anestesia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Anestesia *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setTipoAnestesia(value);
                    // Si se elige una anestesia normal, reinicia campos de mixto
                    if (value !== "anestesia_mixta") {
                      setAnestesiaPrincipal("");
                      setAnestesiaSecundaria("");
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de anestesia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingProcedimientos ? (
                      <SelectItem value="_loading" disabled>
                        Cargando procedimientos...
                      </SelectItem>
                    ) : tiposAnestesiaDisponibles.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        No hay procedimientos disponibles
                      </SelectItem>
                    ) : (
                      tiposAnestesiaDisponibles.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* Clave de procedimiento para anestesia no mixta */}
                {selectedTipoAnestesia && selectedTipoAnestesia !== "anestesia_mixta" && (
                  <p className="text-sm mt-1">
                    Clave del procedimiento: {tipoAnestesiaCodigos[selectedTipoAnestesia] ?? "N/A"}
                  </p>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

          {tipoAnestesia === "anestesia_mixta" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Anestesia inicial *</Label>
                <Select value={anestesiaPrincipal} onValueChange={setAnestesiaPrincipal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAnestesiaDisponibles
                      .filter((tipo) => tipo.value !== "anestesia_mixta")
                      .map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {anestesiaPrincipal && (
                  <p className="text-sm mt-1">Clave: {tipoAnestesiaCodigos[anestesiaPrincipal] ?? "N/A"}</p>
                )}
              </div>

              <div>
                <Label>Anestesia final *</Label>
                <Select value={anestesiaSecundaria} onValueChange={setAnestesiaSecundaria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAnestesiaDisponibles
                      .filter((tipo) => tipo.value !== "anestesia_mixta")
                      .map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {anestesiaSecundaria && (
                  <p className="text-sm mt-1">Clave: {tipoAnestesiaCodigos[anestesiaSecundaria] ?? "N/A"}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Personal médico */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Personal Médico</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cirujano"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cirujano</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cirujano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cirujanos.map((medico) => (
                        <SelectItem key={medico.id} value={medico.id}>
                          {medico.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anestesiologo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anestesiólogo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar anestesiólogo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {anestesiologos.map((medico) => (
                        <SelectItem key={medico.id} value={medico.id}>
                          {medico.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Insumos */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-base">Bienes de Consumo y Medicamentos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              disabled={
                !tipoAnestesia || (tipoAnestesia === "anestesia_mixta" && (!anestesiaPrincipal || !anestesiaSecundaria))
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Insumo
            </Button>
          </div>

          {/* Alertas de validación */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationErrors.map((error, idx) => (
                    <div key={idx}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {insumosFolio.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay insumos agregados. Haz clic en "Agregar insumo" para comenzar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2">Nombre</TableHead>
                  <TableHead className="py-2">Lote</TableHead>
                  <TableHead className="w-32 py-2">Cantidad</TableHead>
                  <TableHead className="w-20 py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumosFolio.map((fi) => {
                  const min = fi.cantidadMinima ?? 0;
                  const max = fi.cantidadMaxima ?? Number.MAX_SAFE_INTEGER;
                  const cantidadValida = fi.cantidad >= min && fi.cantidad <= max;

                  return (
                    <TableRow key={fi.insumo.id} className={!cantidadValida ? "bg-destructive/10" : ""}>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          {fi.insumo.nombre}
                          {fi.grupoExclusivo && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">{fi.grupoExclusivo}</span>
                          )}
                        </div>
                        {fi.condicionante && (
                          <div className="text-xs text-muted-foreground mt-1">{fi.condicionante}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-2">{fi.insumo.lote}</TableCell>
                      <TableCell className="py-2">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min={fi.cantidadMinima ?? 0}
                            max={fi.cantidadMaxima ?? undefined}
                            value={fi.cantidad}
                            onChange={(e) => handleUpdateCantidad(fi.insumo.id, Number(e.target.value))}
                            className={`w-20 h-8 ${!cantidadValida ? "border-destructive" : ""}`}
                          />
                          {fi.tieneConfiguracion ? (
                            <div className="text-xs text-muted-foreground">
                              {fi.cantidadMinima != null || fi.cantidadMaxima != null ? (
                                <>
                                  Mín: {fi.cantidadMinima ?? 0} / Máx: {fi.cantidadMaxima ?? "∞"} / Default:{" "}
                                  {fi.cantidad}
                                </>
                              ) : (
                                "Sin límites configurados"
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-yellow-600 dark:text-yellow-500">
                              ⚠️ Sin configuración para este tipo de anestesia
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInsumo(fi.insumo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Botones de cancelar/crear */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Crear Folio</Button>
        </div>
      </form>

      {/* Modal para agregar insumo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Insumo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleccionar Insumo</Label>
              <Select value={selectedInsumoId} onValueChange={setSelectedInsumoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {insumosParaAgregar.map((insumo) => (
                    <SelectItem key={insumo.id} value={insumo.id}>
                      {insumo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAgregarInsumo} disabled={!selectedInsumoId}>
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
