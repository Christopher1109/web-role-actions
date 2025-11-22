export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      almacenes: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          hospital_id: string
          id: string
          nombre: string
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          hospital_id: string
          id?: string
          nombre: string
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          hospital_id?: string
          id?: string
          nombre?: string
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "almacenes_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: true
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      anestesia_insumos: {
        Row: {
          activo: boolean | null
          cantidad_default: number | null
          cantidad_maxima: number | null
          cantidad_minima: number | null
          categoria: string | null
          condicionante: string | null
          created_at: string | null
          grupo_exclusivo: string | null
          id: string
          id_bcb: string | null
          insumo_id: string | null
          nota: string | null
          orden: number | null
          tipo_anestesia: string
          tipo_limite: string | null
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cantidad_default?: number | null
          cantidad_maxima?: number | null
          cantidad_minima?: number | null
          categoria?: string | null
          condicionante?: string | null
          created_at?: string | null
          grupo_exclusivo?: string | null
          id?: string
          id_bcb?: string | null
          insumo_id?: string | null
          nota?: string | null
          orden?: number | null
          tipo_anestesia: string
          tipo_limite?: string | null
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cantidad_default?: number | null
          cantidad_maxima?: number | null
          cantidad_minima?: number | null
          categoria?: string | null
          condicionante?: string | null
          created_at?: string | null
          grupo_exclusivo?: string | null
          id?: string
          id_bcb?: string | null
          insumo_id?: string | null
          nota?: string | null
          orden?: number | null
          tipo_anestesia?: string
          tipo_limite?: string | null
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anestesia_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      excel_insumo_config: {
        Row: {
          id: number
          id_bcb: string | null
          max_excel: number | null
          min_excel: number | null
          nombre_insumo: string
          observaciones: string | null
          tiene_valores_claros: boolean | null
          tipo_anestesia: string
        }
        Insert: {
          id?: number
          id_bcb?: string | null
          max_excel?: number | null
          min_excel?: number | null
          nombre_insumo: string
          observaciones?: string | null
          tiene_valores_claros?: boolean | null
          tipo_anestesia: string
        }
        Update: {
          id?: number
          id_bcb?: string | null
          max_excel?: number | null
          min_excel?: number | null
          nombre_insumo?: string
          observaciones?: string | null
          tiene_valores_claros?: boolean | null
          tipo_anestesia?: string
        }
        Relationships: []
      }
      folios: {
        Row: {
          anestesia_principal: string | null
          anestesia_secundaria: string | null
          anestesiologo_id: string | null
          anestesiologo_nombre: string | null
          cancelado_por: string | null
          cirugia: string | null
          cirujano_id: string | null
          cirujano_nombre: string | null
          created_at: string | null
          especialidad_quirurgica: string | null
          estado: Database["public"]["Enums"]["estado_folio"] | null
          fecha: string | null
          hora_fin_anestesia: string | null
          hora_fin_procedimiento: string | null
          hora_inicio_anestesia: string | null
          hora_inicio_procedimiento: string | null
          hospital_budget_code: string | null
          hospital_display_name: string | null
          hospital_id: string | null
          id: string
          medico_id: string | null
          numero_folio: string
          numero_quirofano: string | null
          observaciones: string | null
          paciente_apellido_materno: string | null
          paciente_apellido_paterno: string | null
          paciente_edad: number | null
          paciente_edad_unidad: string | null
          paciente_edad_valor: number | null
          paciente_genero: string | null
          paciente_nombre: string | null
          paciente_nss: string | null
          state_name: string | null
          tipo_anestesia: string | null
          tipo_cirugia: string | null
          tipo_evento: string | null
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          anestesia_principal?: string | null
          anestesia_secundaria?: string | null
          anestesiologo_id?: string | null
          anestesiologo_nombre?: string | null
          cancelado_por?: string | null
          cirugia?: string | null
          cirujano_id?: string | null
          cirujano_nombre?: string | null
          created_at?: string | null
          especialidad_quirurgica?: string | null
          estado?: Database["public"]["Enums"]["estado_folio"] | null
          fecha?: string | null
          hora_fin_anestesia?: string | null
          hora_fin_procedimiento?: string | null
          hora_inicio_anestesia?: string | null
          hora_inicio_procedimiento?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          hospital_id?: string | null
          id?: string
          medico_id?: string | null
          numero_folio: string
          numero_quirofano?: string | null
          observaciones?: string | null
          paciente_apellido_materno?: string | null
          paciente_apellido_paterno?: string | null
          paciente_edad?: number | null
          paciente_edad_unidad?: string | null
          paciente_edad_valor?: number | null
          paciente_genero?: string | null
          paciente_nombre?: string | null
          paciente_nss?: string | null
          state_name?: string | null
          tipo_anestesia?: string | null
          tipo_cirugia?: string | null
          tipo_evento?: string | null
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          anestesia_principal?: string | null
          anestesia_secundaria?: string | null
          anestesiologo_id?: string | null
          anestesiologo_nombre?: string | null
          cancelado_por?: string | null
          cirugia?: string | null
          cirujano_id?: string | null
          cirujano_nombre?: string | null
          created_at?: string | null
          especialidad_quirurgica?: string | null
          estado?: Database["public"]["Enums"]["estado_folio"] | null
          fecha?: string | null
          hora_fin_anestesia?: string | null
          hora_fin_procedimiento?: string | null
          hora_inicio_anestesia?: string | null
          hora_inicio_procedimiento?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          hospital_id?: string | null
          id?: string
          medico_id?: string | null
          numero_folio?: string
          numero_quirofano?: string | null
          observaciones?: string | null
          paciente_apellido_materno?: string | null
          paciente_apellido_paterno?: string | null
          paciente_edad?: number | null
          paciente_edad_unidad?: string | null
          paciente_edad_valor?: number | null
          paciente_genero?: string | null
          paciente_nombre?: string | null
          paciente_nss?: string | null
          state_name?: string | null
          tipo_anestesia?: string | null
          tipo_cirugia?: string | null
          tipo_evento?: string | null
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folios_anestesiologo_id_fkey"
            columns: ["anestesiologo_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_cirujano_id_fkey"
            columns: ["cirujano_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      folios_insumos: {
        Row: {
          cantidad: number
          created_at: string | null
          folio_id: string | null
          id: string
          insumo_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          folio_id?: string | null
          id?: string
          insumo_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          folio_id?: string | null
          id?: string
          insumo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folio_insumos_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitales: {
        Row: {
          budget_code: string | null
          clinic_number: string | null
          codigo: string | null
          created_at: string | null
          display_name: string | null
          empresa_id: string | null
          estado_id: string | null
          hospital_type: string | null
          id: string
          locality: string | null
          nombre: string
          state_id: string | null
          updated_at: string | null
        }
        Insert: {
          budget_code?: string | null
          clinic_number?: string | null
          codigo?: string | null
          created_at?: string | null
          display_name?: string | null
          empresa_id?: string | null
          estado_id?: string | null
          hospital_type?: string | null
          id?: string
          locality?: string | null
          nombre: string
          state_id?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_code?: string | null
          clinic_number?: string | null
          codigo?: string | null
          created_at?: string | null
          display_name?: string | null
          empresa_id?: string | null
          estado_id?: string | null
          hospital_type?: string | null
          id?: string
          locality?: string | null
          nombre?: string
          state_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitales_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_configuracion: {
        Row: {
          cantidad_default: number | null
          condicionante: string | null
          created_at: string | null
          grupo_exclusivo: string | null
          id: string
          insumo_catalogo_id: string
          max_anestesia: number | null
          max_global_inventario: number | null
          min_anestesia: number | null
          min_global_inventario: number | null
          nota: string | null
          tipo_anestesia: string | null
          tipo_limite: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad_default?: number | null
          condicionante?: string | null
          created_at?: string | null
          grupo_exclusivo?: string | null
          id?: string
          insumo_catalogo_id: string
          max_anestesia?: number | null
          max_global_inventario?: number | null
          min_anestesia?: number | null
          min_global_inventario?: number | null
          nota?: string | null
          tipo_anestesia?: string | null
          tipo_limite?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad_default?: number | null
          condicionante?: string | null
          created_at?: string | null
          grupo_exclusivo?: string | null
          id?: string
          insumo_catalogo_id?: string
          max_anestesia?: number | null
          max_global_inventario?: number | null
          min_anestesia?: number | null
          min_global_inventario?: number | null
          nota?: string | null
          tipo_anestesia?: string | null
          tipo_limite?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumo_configuracion_insumo_catalogo_id_fkey"
            columns: ["insumo_catalogo_id"]
            isOneToOne: false
            referencedRelation: "insumos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          cantidad: number | null
          clave: string | null
          created_at: string | null
          descripcion: string | null
          fecha_caducidad: string | null
          fecha_entrada: string | null
          hospital_budget_code: string | null
          hospital_display_name: string | null
          hospital_id: string | null
          id: string
          lote: string | null
          nombre: string
          state_name: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad?: number | null
          clave?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_caducidad?: string | null
          fecha_entrada?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          hospital_id?: string | null
          id?: string
          lote?: string | null
          nombre: string
          state_name?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad?: number | null
          clave?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_caducidad?: string | null
          fecha_entrada?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          hospital_id?: string | null
          id?: string
          lote?: string | null
          nombre?: string
          state_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_catalogo: {
        Row: {
          activo: boolean | null
          categoria: string | null
          clave: string | null
          created_at: string | null
          descripcion: string | null
          familia_insumo: string | null
          id: string
          nombre: string
          presentacion: string | null
          tipo: string | null
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          clave?: string | null
          created_at?: string | null
          descripcion?: string | null
          familia_insumo?: string | null
          id?: string
          nombre: string
          presentacion?: string | null
          tipo?: string | null
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          clave?: string | null
          created_at?: string | null
          descripcion?: string | null
          familia_insumo?: string | null
          id?: string
          nombre?: string
          presentacion?: string | null
          tipo?: string | null
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventario_hospital: {
        Row: {
          almacen_id: string
          cantidad_actual: number | null
          cantidad_inicial: number | null
          cantidad_maxima: number | null
          cantidad_minima: number | null
          created_at: string | null
          estatus: string | null
          fecha_caducidad: string | null
          hospital_id: string
          id: string
          insumo_catalogo_id: string
          lote: string | null
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          almacen_id: string
          cantidad_actual?: number | null
          cantidad_inicial?: number | null
          cantidad_maxima?: number | null
          cantidad_minima?: number | null
          created_at?: string | null
          estatus?: string | null
          fecha_caducidad?: string | null
          hospital_id: string
          id?: string
          insumo_catalogo_id: string
          lote?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          almacen_id?: string
          cantidad_actual?: number | null
          cantidad_inicial?: number | null
          cantidad_maxima?: number | null
          cantidad_minima?: number | null
          created_at?: string | null
          estatus?: string | null
          fecha_caducidad?: string | null
          hospital_id?: string
          id?: string
          insumo_catalogo_id?: string
          lote?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_hospital_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_hospital_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_hospital_insumo_catalogo_id_fkey"
            columns: ["insumo_catalogo_id"]
            isOneToOne: false
            referencedRelation: "insumos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          especialidad: Database["public"]["Enums"]["especialidad_medica"]
          hospital_budget_code: string | null
          hospital_display_name: string | null
          hospital_id: string | null
          id: string
          nombre: string
          state_name: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          especialidad: Database["public"]["Enums"]["especialidad_medica"]
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          hospital_id?: string | null
          id?: string
          nombre: string
          state_name?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          especialidad?: Database["public"]["Enums"]["especialidad_medica"]
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          hospital_id?: string | null
          id?: string
          nombre?: string
          state_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          cantidad_anterior: number | null
          cantidad_nueva: number | null
          created_at: string | null
          folio_id: string | null
          hospital_id: string
          id: string
          inventario_id: string
          observaciones: string | null
          tipo_movimiento: string
          traspaso_id: string | null
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          cantidad_anterior?: number | null
          cantidad_nueva?: number | null
          created_at?: string | null
          folio_id?: string | null
          hospital_id: string
          id?: string
          inventario_id: string
          observaciones?: string | null
          tipo_movimiento: string
          traspaso_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_anterior?: number | null
          cantidad_nueva?: number | null
          created_at?: string | null
          folio_id?: string | null
          hospital_id?: string
          id?: string
          inventario_id?: string
          observaciones?: string | null
          tipo_movimiento?: string
          traspaso_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario_hospital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_traspaso_id_fkey"
            columns: ["traspaso_id"]
            isOneToOne: false
            referencedRelation: "traspasos"
            referencedColumns: ["id"]
          },
        ]
      }
      paquete_insumos: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          insumo_id: string | null
          paquete_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          paquete_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          paquete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paquete_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paquete_insumos_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes_anestesia"
            referencedColumns: ["id"]
          },
        ]
      }
      paquetes_anestesia: {
        Row: {
          created_at: string | null
          descripcion: string | null
          hospital_budget_code: string | null
          hospital_display_name: string | null
          id: string
          nombre: string
          state_name: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          id?: string
          nombre: string
          state_name?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          id?: string
          nombre?: string
          state_name?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      procedimientos: {
        Row: {
          clave_procedimiento: string | null
          created_at: string | null
          descripcion: string | null
          hospital_id: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          clave_procedimiento?: string | null
          created_at?: string | null
          descripcion?: string | null
          hospital_id?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          clave_procedimiento?: string | null
          created_at?: string | null
          descripcion?: string | null
          hospital_id?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedimientos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          hospital_id: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hospital_id?: string | null
          id: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      states: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      traspaso_insumos: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          insumo_id: string | null
          traspaso_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          traspaso_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          traspaso_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traspaso_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspaso_insumos_traspaso_id_fkey"
            columns: ["traspaso_id"]
            isOneToOne: false
            referencedRelation: "traspasos"
            referencedColumns: ["id"]
          },
        ]
      }
      traspasos: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_traspaso"] | null
          fecha: string | null
          hospital_budget_code_destino: string | null
          hospital_budget_code_origen: string | null
          hospital_display_name_destino: string | null
          hospital_display_name_origen: string | null
          id: string
          numero_traspaso: string
          observaciones: string | null
          state_name_destino: string | null
          state_name_origen: string | null
          unidad_destino: string | null
          unidad_origen: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_traspaso"] | null
          fecha?: string | null
          hospital_budget_code_destino?: string | null
          hospital_budget_code_origen?: string | null
          hospital_display_name_destino?: string | null
          hospital_display_name_origen?: string | null
          id?: string
          numero_traspaso: string
          observaciones?: string | null
          state_name_destino?: string | null
          state_name_origen?: string | null
          unidad_destino?: string | null
          unidad_origen?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_traspaso"] | null
          fecha?: string | null
          hospital_budget_code_destino?: string | null
          hospital_budget_code_origen?: string | null
          hospital_display_name_destino?: string | null
          hospital_display_name_origen?: string | null
          id?: string
          numero_traspaso?: string
          observaciones?: string | null
          state_name_destino?: string | null
          state_name_origen?: string | null
          unidad_destino?: string | null
          unidad_origen?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          created_at: string | null
          hospital_id: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          assigned_hospitals: string | null
          created_at: string | null
          hospital_budget_code: string | null
          hospital_display_name: string | null
          id: number
          role: string
          state_name: string | null
          supervisor_group: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          assigned_hospitals?: string | null
          created_at?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          id?: number
          role: string
          state_name?: string | null
          supervisor_group?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          assigned_hospitals?: string | null
          created_at?: string | null
          hospital_budget_code?: string | null
          hospital_display_name?: string | null
          id?: number
          role?: string
          state_name?: string | null
          supervisor_group?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "gerente"
        | "supervisor"
        | "lider"
        | "almacenista"
        | "auxiliar"
        | "gerente_operaciones"
      especialidad_medica:
        | "anestesiologia"
        | "cirugia_general"
        | "traumatologia"
        | "ginecologia"
        | "urologia"
        | "otra"
      estado_folio: "activo" | "cancelado" | "completado"
      estado_traspaso: "pendiente" | "aprobado" | "rechazado" | "completado"
      genero: "masculino" | "femenino"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "gerente",
        "supervisor",
        "lider",
        "almacenista",
        "auxiliar",
        "gerente_operaciones",
      ],
      especialidad_medica: [
        "anestesiologia",
        "cirugia_general",
        "traumatologia",
        "ginecologia",
        "urologia",
        "otra",
      ],
      estado_folio: ["activo", "cancelado", "completado"],
      estado_traspaso: ["pendiente", "aprobado", "rechazado", "completado"],
      genero: ["masculino", "femenino"],
    },
  },
} as const
