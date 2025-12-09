-- Tabla de inventario del almacén central
create table if not exists central_inventory (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid references insumos_catalogo(id),
  cantidad_actual integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (insumo_id)
);

-- Tabla de traspasos desde el almacén central a hospitales
create table if not exists traspasos (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitales(id),
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);

-- Detalle de cada traspaso
create table if not exists traspaso_items (
  id uuid primary key default gen_random_uuid(),
  traspaso_id uuid references traspasos(id) on delete cascade,
  insumo_id uuid references insumos_catalogo(id),
  cantidad integer not null check (cantidad >= 0)
);

-- Campo para guardar URL de comprobante en pedidos_compra
alter table pedidos_compra
  add column if not exists comprobante_url text;

-- Roles nuevos para permisos
insert into roles (nombre)
values ('finanzas'), ('cadena_suministro')
on conflict (nombre) do nothing;
