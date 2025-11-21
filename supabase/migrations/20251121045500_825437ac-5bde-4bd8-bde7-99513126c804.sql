-- Crear tabla insumo_configuracion para unificar configuración de insumos
CREATE TABLE IF NOT EXISTS public.insumo_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_catalogo_id UUID NOT NULL REFERENCES insumos_catalogo(id) ON DELETE CASCADE,
  
  -- Configuración global de inventario (por insumo, no por anestesia)
  min_global_inventario INTEGER,
  max_global_inventario INTEGER,
  
  -- Configuración específica por tipo de anestesia
  tipo_anestesia TEXT,
  min_anestesia INTEGER,
  max_anestesia INTEGER,
  cantidad_default INTEGER,
  tipo_limite TEXT,
  grupo_exclusivo TEXT,
  condicionante TEXT,
  nota TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_insumo_configuracion_catalogo_id ON public.insumo_configuracion(insumo_catalogo_id);
CREATE INDEX idx_insumo_configuracion_tipo_anestesia ON public.insumo_configuracion(tipo_anestesia);
CREATE INDEX idx_insumo_configuracion_catalogo_tipo ON public.insumo_configuracion(insumo_catalogo_id, tipo_anestesia);

-- Comentarios para documentación
COMMENT ON TABLE public.insumo_configuracion IS 'Matriz maestra de configuración de insumos unificando catálogo nuevo con reglas por tipo de anestesia';
COMMENT ON COLUMN public.insumo_configuracion.min_global_inventario IS 'Mínimo global de inventario (a configurar por familia/categoría)';
COMMENT ON COLUMN public.insumo_configuracion.max_global_inventario IS 'Máximo global de inventario (a configurar por familia/categoría)';
COMMENT ON COLUMN public.insumo_configuracion.tipo_anestesia IS 'Tipo de anestesia (general_balanceada_adulto, sedacion, etc.)';
COMMENT ON COLUMN public.insumo_configuracion.min_anestesia IS 'Mínimo específico para este tipo de anestesia';
COMMENT ON COLUMN public.insumo_configuracion.max_anestesia IS 'Máximo específico para este tipo de anestesia';

-- Trigger para updated_at
CREATE TRIGGER update_insumo_configuracion_updated_at
  BEFORE UPDATE ON public.insumo_configuracion
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.insumo_configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver configuración de insumos"
  ON public.insumo_configuracion
  FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden actualizar configuración"
  ON public.insumo_configuracion
  FOR UPDATE
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear configuración"
  ON public.insumo_configuracion
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Gerentes pueden eliminar configuración"
  ON public.insumo_configuracion
  FOR DELETE
  USING (true);