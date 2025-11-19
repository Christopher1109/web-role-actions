-- Agregar campos necesarios a la tabla anestesia_insumos para control de cantidades
ALTER TABLE anestesia_insumos 
ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS nota TEXT,
ADD COLUMN IF NOT EXISTS tipo_limite TEXT DEFAULT 'rango' CHECK (tipo_limite IN ('fijo', 'rango', 'a_eleccion', 'desactivado')),
ADD COLUMN IF NOT EXISTS cantidad_default INTEGER DEFAULT 1;

-- Actualizar valores por defecto para cantidad_minima si es null
UPDATE anestesia_insumos 
SET cantidad_minima = 0 
WHERE cantidad_minima IS NULL;

-- Actualizar valores por defecto para cantidad_maxima si es null
UPDATE anestesia_insumos 
SET cantidad_maxima = 1 
WHERE cantidad_maxima IS NULL;

-- Crear índice para mejorar performance en consultas por tipo_anestesia
CREATE INDEX IF NOT EXISTS idx_anestesia_insumos_tipo ON anestesia_insumos(tipo_anestesia);
CREATE INDEX IF NOT EXISTS idx_anestesia_insumos_activo ON anestesia_insumos(activo);