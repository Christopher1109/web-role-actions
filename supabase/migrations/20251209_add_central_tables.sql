-- Tabla de inventario del almacén central
create table if not exists central_inventory (
  id uuid primary key default uuid_generate_v4(),
  insumo_id uuid references insumos_catalogo(id),
  cantidad_actual integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (insumo_id)
);

-- Tabla de traspasos desde el almacén central a hospitales
create table if not exists traspasos (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid references hospitales(id),
  creado_por uuid references profiles(id),
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);

create table if not exists traspaso_items (
  id uuid primary key default uuid_generate_v4(),
  traspaso_id uuid references traspasos(id) on delete cascade,
  insumo_id uuid references insumos_catalogo(id),
  cantidad integer not null,
  estado text not null default 'pendiente'
);

-- Agregar columna para comprobante de pago en pedidos_compra
alter table pedidos_compra add column if not exists comprobante_url text;

-- Roles adicionales para finanzas y cadena de suministro
insert into roles (id, name, department_id, created_at)
select uuid_generate_v4(), 'finanzas', (select id from departments where name = 'Finanzas'), now()
where not exists (select 1 from roles where name = 'finanzas');

insert into roles (id, name, department_id, created_at)
select uuid_generate_v4(), 'cadena_suministro', (select id from departments where name = 'Almacén'), now()
where not exists (select 1 from roles where name = 'cadena_suministro');
