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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          hospital_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          codigo: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      estados: {
        Row: {
          codigo: string
          created_at: string
          empresa_id: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          empresa_id: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      folio_insumos: {
        Row: {
          cantidad: number
          created_at: string
          folio_id: string
          id: string
          lote: string
          nombre_insumo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          folio_id: string
          id?: string
          lote: string
          nombre_insumo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          folio_id?: string
          id?: string
          lote?: string
          nombre_insumo?: string
        }
        Relationships: [
          {
            foreignKeyName: "folio_insumos_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
        ]
      }
      folios: {
        Row: {
          anestesiologo_id: string | null
          cancelado_por: string | null
          cirugia: string
          cirujano_id: string | null
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["estado_folio"]
          hospital_id: string | null
          id: string
          numero_folio: string
          paciente_edad: number
          paciente_genero: Database["public"]["Enums"]["genero"]
          paciente_nombre: string
          tipo_anestesia: Database["public"]["Enums"]["tipo_anestesia"]
          unidad: string
          updated_at: string
        }
        Insert: {
          anestesiologo_id?: string | null
          cancelado_por?: string | null
          cirugia: string
          cirujano_id?: string | null
          created_at?: string
          created_by: string
          estado?: Database["public"]["Enums"]["estado_folio"]
          hospital_id?: string | null
          id?: string
          numero_folio: string
          paciente_edad: number
          paciente_genero: Database["public"]["Enums"]["genero"]
          paciente_nombre: string
          tipo_anestesia: Database["public"]["Enums"]["tipo_anestesia"]
          unidad: string
          updated_at?: string
        }
        Update: {
          anestesiologo_id?: string | null
          cancelado_por?: string | null
          cirugia?: string
          cirujano_id?: string | null
          created_at?: string
          created_by?: string
          estado?: Database["public"]["Enums"]["estado_folio"]
          hospital_id?: string | null
          id?: string
          numero_folio?: string
          paciente_edad?: number
          paciente_genero?: Database["public"]["Enums"]["genero"]
          paciente_nombre?: string
          tipo_anestesia?: Database["public"]["Enums"]["tipo_anestesia"]
          unidad?: string
          updated_at?: string
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
            foreignKeyName: "folios_cancelado_por_fkey"
            columns: ["cancelado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "folios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitales: {
        Row: {
          codigo: string
          created_at: string
          direccion: string | null
          estado_id: string
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          direccion?: string | null
          estado_id: string
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          direccion?: string | null
          estado_id?: string
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitales_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          cantidad: number
          categoria: string
          created_at: string
          created_by: string | null
          fecha_caducidad: string
          hospital_id: string | null
          id: string
          lote: string
          nombre: string
          origen: Database["public"]["Enums"]["origen_insumo"]
          stock_minimo: number
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          categoria: string
          created_at?: string
          created_by?: string | null
          fecha_caducidad: string
          hospital_id?: string | null
          id?: string
          lote: string
          nombre: string
          origen: Database["public"]["Enums"]["origen_insumo"]
          stock_minimo?: number
          unidad: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          categoria?: string
          created_at?: string
          created_by?: string | null
          fecha_caducidad?: string
          hospital_id?: string | null
          id?: string
          lote?: string
          nombre?: string
          origen?: Database["public"]["Enums"]["origen_insumo"]
          stock_minimo?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          activo: boolean | null
          created_at: string
          especialidad: Database["public"]["Enums"]["especialidad_medica"]
          hospital_id: string | null
          id: string
          nombre: string
          procedimientos_realizados: number | null
          subespecialidad: string | null
          telefono: string | null
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          especialidad: Database["public"]["Enums"]["especialidad_medica"]
          hospital_id?: string | null
          id?: string
          nombre: string
          procedimientos_realizados?: number | null
          subespecialidad?: string | null
          telefono?: string | null
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          especialidad?: Database["public"]["Enums"]["especialidad_medica"]
          hospital_id?: string | null
          id?: string
          nombre?: string
          procedimientos_realizados?: number | null
          subespecialidad?: string | null
          telefono?: string | null
          unidad?: string
          updated_at?: string
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
      paquete_insumos: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          nombre_insumo: string
          paquete_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          nombre_insumo: string
          paquete_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          nombre_insumo?: string
          paquete_id?: string
        }
        Relationships: [
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
          created_at: string
          descripcion: string | null
          id: string
          tipo: Database["public"]["Enums"]["tipo_anestesia"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["tipo_anestesia"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_anestesia"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          hospital_id: string | null
          id: string
          nombre_completo: string | null
          unidad: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          id: string
          nombre_completo?: string | null
          unidad?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          nombre_completo?: string | null
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
        ]
      }
      traspaso_insumos: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          nombre_insumo: string
          traspaso_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          nombre_insumo: string
          traspaso_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          nombre_insumo?: string
          traspaso_id?: string
        }
        Relationships: [
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
          aprobado_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_traspaso"]
          hospital_destino_id: string | null
          hospital_origen_id: string | null
          id: string
          motivo_rechazo: string | null
          solicitado_por: string
          unidad_destino: string
          unidad_origen: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_traspaso"]
          hospital_destino_id?: string | null
          hospital_origen_id?: string | null
          id?: string
          motivo_rechazo?: string | null
          solicitado_por: string
          unidad_destino: string
          unidad_origen: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_traspaso"]
          hospital_destino_id?: string | null
          hospital_origen_id?: string | null
          id?: string
          motivo_rechazo?: string | null
          solicitado_por?: string
          unidad_destino?: string
          unidad_origen?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traspasos_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspasos_hospital_destino_id_fkey"
            columns: ["hospital_destino_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspasos_hospital_origen_id_fkey"
            columns: ["hospital_origen_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspasos_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          codigo: string
          created_at: string
          hospital_id: string
          id: string
          nombre: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          hospital_id: string
          id?: string
          nombre: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          hospital_id?: string
          id?: string
          nombre?: string
          tipo?: string | null
          updated_at?: string
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
          alcance: string | null
          created_at: string
          empresa_id: string | null
          estado_id: string | null
          hospital_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          alcance?: string | null
          created_at?: string
          empresa_id?: string | null
          estado_id?: string | null
          hospital_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          alcance?: string | null
          created_at?: string
          empresa_id?: string | null
          estado_id?: string | null
          hospital_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      get_user_estado_id: { Args: { _user_id: string }; Returns: string }
      get_user_hospital_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_hospital_access: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "auxiliar" | "almacenista" | "lider" | "supervisor" | "gerente"
      especialidad_medica: "anestesiologo" | "cirujano"
      estado_folio: "activo" | "cancelado"
      estado_traspaso: "pendiente" | "completado" | "rechazado"
      genero: "M" | "F" | "Otro"
      origen_insumo: "LOAD" | "Prestado"
      tipo_anestesia:
        | "general_balanceada_adulto"
        | "general_balanceada_pediatrica"
        | "general_alta_especialidad"
        | "general_endovenosa"
        | "locorregional"
        | "sedacion"
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
      app_role: ["auxiliar", "almacenista", "lider", "supervisor", "gerente"],
      especialidad_medica: ["anestesiologo", "cirujano"],
      estado_folio: ["activo", "cancelado"],
      estado_traspaso: ["pendiente", "completado", "rechazado"],
      genero: ["M", "F", "Otro"],
      origen_insumo: ["LOAD", "Prestado"],
      tipo_anestesia: [
        "general_balanceada_adulto",
        "general_balanceada_pediatrica",
        "general_alta_especialidad",
        "general_endovenosa",
        "locorregional",
        "sedacion",
      ],
    },
  },
} as const
