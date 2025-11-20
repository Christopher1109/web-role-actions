-- Agregar columna grupo_exclusivo a anestesia_insumos para manejar elecciones exclusivas
ALTER TABLE anestesia_insumos 
ADD COLUMN IF NOT EXISTS grupo_exclusivo TEXT;

-- Actualizar comentarios de las columnas para clarificar su uso
COMMENT ON COLUMN anestesia_insumos.cantidad_minima IS 'Cantidad mínima permitida del insumo';
COMMENT ON COLUMN anestesia_insumos.cantidad_maxima IS 'Cantidad máxima permitida del insumo';
COMMENT ON COLUMN anestesia_insumos.nota IS 'Observaciones y condicionantes especiales (ej: "a elección del anestesiólogo")';
COMMENT ON COLUMN anestesia_insumos.grupo_exclusivo IS 'Grupo de exclusión mutua - solo se puede elegir un insumo por grupo';
COMMENT ON COLUMN anestesia_insumos.id_bcb IS 'Código BCB del insumo según los anexos de licitación';