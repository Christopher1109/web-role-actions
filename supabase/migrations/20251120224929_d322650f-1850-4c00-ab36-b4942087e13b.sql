-- Agregar campos cantidad_minima y cantidad_maxima a inventario_hospital
ALTER TABLE public.inventario_hospital
ADD COLUMN cantidad_minima INTEGER DEFAULT 10,
ADD COLUMN cantidad_maxima INTEGER;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.inventario_hospital.cantidad_minima IS 'Cantidad mínima de stock para alertas de reabastecimiento';
COMMENT ON COLUMN public.inventario_hospital.cantidad_maxima IS 'Cantidad máxima de stock permitida (opcional)';