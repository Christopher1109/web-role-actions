-- =============================================
-- FASE 1: SISTEMA DE ALERTAS DE INVENTARIO
-- =============================================

-- Tabla para alertas de insumos cuando bajan del mínimo
CREATE TABLE public.insumos_alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitales(id) ON DELETE CASCADE,
  insumo_catalogo_id UUID NOT NULL REFERENCES public.insumos_catalogo(id) ON DELETE CASCADE,
  inventario_id UUID REFERENCES public.inventario_hospital(id) ON DELETE SET NULL,
  cantidad_actual INTEGER NOT NULL DEFAULT 0,
  minimo_permitido INTEGER NOT NULL DEFAULT 0,
  generado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enviado_a_supervisor BOOLEAN NOT NULL DEFAULT false,
  enviado_a_gerente_operaciones BOOLEAN NOT NULL DEFAULT false,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'resuelta', 'cancelada')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  notas TEXT,
  resuelto_at TIMESTAMP WITH TIME ZONE,
  resuelto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para requerimientos consolidados (usada por Gerente de Operaciones)
CREATE TABLE public.insumos_requerimientos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitales(id) ON DELETE CASCADE,
  insumo_catalogo_id UUID NOT NULL REFERENCES public.insumos_catalogo(id) ON DELETE CASCADE,
  cantidad_requerida INTEGER NOT NULL DEFAULT 0,
  alerta_origen_id UUID REFERENCES public.insumos_alertas(id) ON DELETE SET NULL,
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'enviado_a_almacen', 'completado', 'rechazado')),
  generado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_at TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para formatos generados (PDFs, JSONs consolidados)
CREATE TABLE public.formatos_generados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('cadena_suministro', 'consolidado_almacen', 'reporte_hospital', 'reporte_supervisor')),
  generado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES public.hospitales(id) ON DELETE SET NULL,
  data_json JSONB NOT NULL DEFAULT '{}',
  pdf_url TEXT,
  estado TEXT NOT NULL DEFAULT 'generado' CHECK (estado IN ('generado', 'enviado', 'procesado', 'archivado')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar campo departamento a profiles si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS departamento TEXT DEFAULT 'operaciones' CHECK (departamento IN ('operaciones', 'almacen', 'finanzas', 'administracion'));

-- Índices para mejor rendimiento
CREATE INDEX idx_insumos_alertas_hospital ON public.insumos_alertas(hospital_id);
CREATE INDEX idx_insumos_alertas_estado ON public.insumos_alertas(estado);
CREATE INDEX idx_insumos_alertas_prioridad ON public.insumos_alertas(prioridad);
CREATE INDEX idx_insumos_requerimientos_hospital ON public.insumos_requerimientos(hospital_id);
CREATE INDEX idx_insumos_requerimientos_estado ON public.insumos_requerimientos(estado);
CREATE INDEX idx_formatos_generados_tipo ON public.formatos_generados(tipo);

-- Habilitar RLS
ALTER TABLE public.insumos_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos_requerimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_generados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para insumos_alertas
CREATE POLICY "Todos pueden ver alertas de su hospital" 
ON public.insumos_alertas FOR SELECT USING (true);

CREATE POLICY "Almacenistas y superiores pueden crear alertas" 
ON public.insumos_alertas FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Almacenistas y superiores pueden actualizar alertas" 
ON public.insumos_alertas FOR UPDATE USING (true);

-- Políticas RLS para insumos_requerimientos
CREATE POLICY "Todos pueden ver requerimientos" 
ON public.insumos_requerimientos FOR SELECT USING (true);

CREATE POLICY "Gerentes pueden crear requerimientos" 
ON public.insumos_requerimientos FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

CREATE POLICY "Gerentes pueden actualizar requerimientos" 
ON public.insumos_requerimientos FOR UPDATE 
USING (has_role(auth.uid(), 'gerente'::app_role) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

-- Políticas RLS para formatos_generados
CREATE POLICY "Todos pueden ver formatos" 
ON public.formatos_generados FOR SELECT USING (true);

CREATE POLICY "Gerentes pueden crear formatos" 
ON public.formatos_generados FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_insumos_alertas_updated_at
BEFORE UPDATE ON public.insumos_alertas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insumos_requerimientos_updated_at
BEFORE UPDATE ON public.insumos_requerimientos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear alerta automática cuando inventario baja del mínimo
CREATE OR REPLACE FUNCTION public.check_inventario_minimo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alerta_existente UUID;
BEGIN
  -- Solo verificar si la cantidad bajó del mínimo
  IF NEW.cantidad_actual < NEW.cantidad_minima THEN
    -- Verificar si ya existe una alerta activa para este inventario
    SELECT id INTO alerta_existente
    FROM public.insumos_alertas
    WHERE inventario_id = NEW.id
      AND estado = 'activa'
    LIMIT 1;
    
    -- Si no existe alerta activa, crear una nueva
    IF alerta_existente IS NULL THEN
      INSERT INTO public.insumos_alertas (
        hospital_id,
        insumo_catalogo_id,
        inventario_id,
        cantidad_actual,
        minimo_permitido,
        prioridad
      ) VALUES (
        NEW.hospital_id,
        NEW.insumo_catalogo_id,
        NEW.id,
        NEW.cantidad_actual,
        NEW.cantidad_minima,
        CASE 
          WHEN NEW.cantidad_actual = 0 THEN 'critica'
          WHEN NEW.cantidad_actual < (NEW.cantidad_minima * 0.5) THEN 'alta'
          WHEN NEW.cantidad_actual < (NEW.cantidad_minima * 0.75) THEN 'media'
          ELSE 'baja'
        END
      );
    ELSE
      -- Actualizar la alerta existente con nueva cantidad
      UPDATE public.insumos_alertas
      SET cantidad_actual = NEW.cantidad_actual,
          prioridad = CASE 
            WHEN NEW.cantidad_actual = 0 THEN 'critica'
            WHEN NEW.cantidad_actual < (NEW.cantidad_minima * 0.5) THEN 'alta'
            WHEN NEW.cantidad_actual < (NEW.cantidad_minima * 0.75) THEN 'media'
            ELSE 'baja'
          END,
          updated_at = now()
      WHERE id = alerta_existente;
    END IF;
  ELSE
    -- Si la cantidad ya no está por debajo del mínimo, resolver alertas activas
    UPDATE public.insumos_alertas
    SET estado = 'resuelta',
        resuelto_at = now(),
        updated_at = now()
    WHERE inventario_id = NEW.id
      AND estado = 'activa';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para verificar mínimos automáticamente
CREATE TRIGGER check_inventario_minimo_trigger
AFTER INSERT OR UPDATE OF cantidad_actual, cantidad_minima ON public.inventario_hospital
FOR EACH ROW EXECUTE FUNCTION public.check_inventario_minimo();