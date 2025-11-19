-- Modificar tabla anestesia_insumos para incluir límites min/max y categoría
ALTER TABLE anestesia_insumos 
  DROP COLUMN IF EXISTS orden,
  DROP COLUMN IF EXISTS cantidad_default;

ALTER TABLE anestesia_insumos
  ADD COLUMN IF NOT EXISTS categoria text CHECK (categoria IN ('medicamento', 'bienes_consumo')),
  ADD COLUMN IF NOT EXISTS cantidad_minima integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad_maxima integer,
  ADD COLUMN IF NOT EXISTS unidad text,
  ADD COLUMN IF NOT EXISTS id_bcb text;

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_anestesia_insumos_tipo_categoria 
  ON anestesia_insumos(tipo_anestesia, categoria);

COMMENT ON COLUMN anestesia_insumos.categoria IS 'Categoría del insumo: medicamento o bienes_consumo';
COMMENT ON COLUMN anestesia_insumos.cantidad_minima IS 'Cantidad mínima permitida para este insumo en este tipo de anestesia';
COMMENT ON COLUMN anestesia_insumos.cantidad_maxima IS 'Cantidad máxima permitida para este insumo en este tipo de anestesia';
COMMENT ON COLUMN anestesia_insumos.id_bcb IS 'ID del catálogo BCB del IMSS';