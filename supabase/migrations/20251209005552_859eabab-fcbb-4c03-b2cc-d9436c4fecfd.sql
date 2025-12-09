-- =============================================
-- FASE 4: TABLAS PARA GERENTE DE ALMACÉN
-- =============================================

-- Tabla para seguimiento de compras/pedidos del Gerente de Almacén
CREATE TABLE public.pedidos_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL,
  formato_origen_id UUID REFERENCES public.formatos_generados(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'enviado_proveedor', 'recibido_parcial', 'completado', 'cancelado')),
  proveedor TEXT,
  fecha_estimada_entrega DATE,
  notas TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_at TIMESTAMP WITH TIME ZONE,
  completado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Detalle de items en cada pedido
CREATE TABLE public.pedido_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  insumo_catalogo_id UUID NOT NULL REFERENCES public.insumos_catalogo(id) ON DELETE CASCADE,
  cantidad_solicitada INTEGER NOT NULL DEFAULT 0,
  cantidad_recibida INTEGER NOT NULL DEFAULT 0,
  precio_unitario DECIMAL(10,2),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'ordenado', 'recibido_parcial', 'recibido', 'cancelado')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_pedidos_compra_estado ON public.pedidos_compra(estado);
CREATE INDEX idx_pedidos_compra_creado_por ON public.pedidos_compra(creado_por);
CREATE INDEX idx_pedido_items_pedido ON public.pedido_items(pedido_id);

-- Habilitar RLS
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;

-- Función para verificar si usuario es gerente de almacén
CREATE OR REPLACE FUNCTION public.is_gerente_almacen(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id 
    AND role = 'gerente_almacen'::app_role
  )
$$;

-- Políticas RLS para pedidos_compra
CREATE POLICY "Gerentes pueden ver pedidos" 
ON public.pedidos_compra FOR SELECT 
USING (
  is_gerente_almacen(auth.uid()) OR 
  has_role(auth.uid(), 'gerente'::app_role) OR 
  has_role(auth.uid(), 'gerente_operaciones'::app_role)
);

CREATE POLICY "Gerente almacén puede crear pedidos" 
ON public.pedidos_compra FOR INSERT 
WITH CHECK (is_gerente_almacen(auth.uid()) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

CREATE POLICY "Gerente almacén puede actualizar pedidos" 
ON public.pedidos_compra FOR UPDATE 
USING (is_gerente_almacen(auth.uid()) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

-- Políticas RLS para pedido_items
CREATE POLICY "Gerentes pueden ver items de pedidos" 
ON public.pedido_items FOR SELECT 
USING (
  is_gerente_almacen(auth.uid()) OR 
  has_role(auth.uid(), 'gerente'::app_role) OR 
  has_role(auth.uid(), 'gerente_operaciones'::app_role)
);

CREATE POLICY "Gerente almacén puede crear items" 
ON public.pedido_items FOR INSERT 
WITH CHECK (is_gerente_almacen(auth.uid()) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

CREATE POLICY "Gerente almacén puede actualizar items" 
ON public.pedido_items FOR UPDATE 
USING (is_gerente_almacen(auth.uid()) OR has_role(auth.uid(), 'gerente_operaciones'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_pedidos_compra_updated_at
BEFORE UPDATE ON public.pedidos_compra
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Actualizar constraint de formatos_generados
ALTER TABLE public.formatos_generados 
DROP CONSTRAINT IF EXISTS formatos_generados_estado_check;

ALTER TABLE public.formatos_generados 
ADD CONSTRAINT formatos_generados_estado_check 
CHECK (estado IN ('generado', 'enviado', 'procesado', 'archivado', 'procesando_almacen'));