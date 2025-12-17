# 🚀 Guía de Migración Completa a Supabase Propio

## Requisitos Previos

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear un nuevo proyecto
3. Obtener las credenciales:
   - Project URL
   - Anon Key
   - Service Role Key

---

## Paso 1: Ejecutar Schema

1. Ve al **SQL Editor** de tu proyecto Supabase
2. Copia y pega el contenido de `scripts/migracion_completa.sql`
3. Ejecuta el script

---

## Paso 2: Exportar Datos desde Lovable Cloud

Ejecuta estas consultas en Lovable para obtener los datos y luego insértalos en tu Supabase:

### Opción A: Exportar via API (recomendado)

Crea un Edge Function temporal en tu nuevo Supabase para importar datos.

### Opción B: Exportar manualmente

1. **Estados**: 
```sql
SELECT * FROM states;
```

2. **Hospitales**:
```sql
SELECT * FROM hospitales;
```

3. **Insumos Catálogo**:
```sql
SELECT * FROM insumos_catalogo;
```

4. **Configuración de Insumos**:
```sql
SELECT * FROM insumo_configuracion;
```

5. **Anestesia Insumos**:
```sql
SELECT * FROM anestesia_insumos;
```

6. **Inventario**:
```sql
SELECT * FROM inventario_hospital;
SELECT * FROM inventario_consolidado;
SELECT * FROM inventario_lotes;
```

---

## Paso 3: Crear Usuarios

Los usuarios en `auth.users` NO se pueden exportar (contraseñas hasheadas).

**Opciones:**

1. **Recrear usuarios**: Usa el Edge Function `create-all-users` de este proyecto
2. **Reset passwords**: Los usuarios existentes deberán hacer "Olvidé mi contraseña"

---

## Paso 4: Configurar tu App

Actualiza las variables de entorno en tu proyecto:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key
```

---

## Paso 5: Verificar

1. Abre tu app con las nuevas credenciales
2. Intenta iniciar sesión
3. Verifica que los datos aparecen correctamente

---

## Estructura de Datos Actual

| Tabla | Registros |
|-------|-----------|
| inventario_lotes | 9,262 |
| inventario_hospital | 9,039 |
| inventario_consolidado | 4,452 |
| documento_segmentado_detalle | 3,261 |
| documento_agrupado_detalle | 1,398 |
| movimientos_almacen_provisional | 964 |
| insumos_alertas | 934 |
| anestesia_insumos | 765 |
| profiles | 243 |
| users | 242 |
| insumos_catalogo | 213 |
| hospitales | 21 |

---

## Soporte

Si tienes problemas con la migración, los errores comunes son:

1. **"duplicate key"**: La tabla ya tiene datos, trunca primero
2. **"violates foreign key"**: Importa tablas padre antes que hijas
3. **"RLS violation"**: Desactiva RLS temporalmente durante import

```sql
-- Desactivar RLS temporalmente
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;

-- Importar datos...

-- Reactivar RLS
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
```
