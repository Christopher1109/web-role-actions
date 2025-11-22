-- 1. Agregar columnas para edad con unidad en folios
ALTER TABLE folios 
ADD COLUMN IF NOT EXISTS paciente_edad_valor INTEGER,
ADD COLUMN IF NOT EXISTS paciente_edad_unidad TEXT CHECK (paciente_edad_unidad IN ('días','semanas','meses','años'));

-- Migrar datos existentes de paciente_edad a los nuevos campos
UPDATE folios 
SET paciente_edad_valor = paciente_edad,
    paciente_edad_unidad = 'años'
WHERE paciente_edad IS NOT NULL 
  AND paciente_edad_valor IS NULL;

-- 2. Asegurar que medicos tenga hospital_id (verificar si existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medicos' AND column_name = 'hospital_id'
  ) THEN
    ALTER TABLE medicos ADD COLUMN hospital_id UUID REFERENCES hospitales(id);
  END IF;
END $$;

-- 3. Agregar columna clave_procedimiento a procedimientos si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'procedimientos' AND column_name = 'clave_procedimiento'
  ) THEN
    ALTER TABLE procedimientos ADD COLUMN clave_procedimiento TEXT;
  END IF;
END $$;

-- 4. Insertar nuevos tipos de procedimientos para UMAEs específicas
-- Primero obtenemos los IDs de los hospitales (ajustar según los nombres exactos en tu BD)

-- Para UMAE HE CMN Siglo XXI (Cuauhtémoc) - Neurocirugía, Trasplante Hepático, Trasplante Renal
INSERT INTO procedimientos (nombre, clave_procedimiento, hospital_id, descripcion)
SELECT 
  'Anestesia de Alta Especialidad en Neurocirugía',
  '19.01.007',
  h.id,
  'Alta especialidad en neurocirugía'
FROM hospitales h
WHERE h.display_name ILIKE '%HE%CMN%Siglo XXI%'
  AND NOT EXISTS (
    SELECT 1 FROM procedimientos p 
    WHERE p.clave_procedimiento = '19.01.007' AND p.hospital_id = h.id
  );

INSERT INTO procedimientos (nombre, clave_procedimiento, hospital_id, descripcion)
SELECT 
  'Anestesia de Alta Especialidad en Trasplante Hepático',
  '19.01.008',
  h.id,
  'Alta especialidad en trasplante hepático'
FROM hospitales h
WHERE h.display_name ILIKE '%HE%CMN%Siglo XXI%'
  AND NOT EXISTS (
    SELECT 1 FROM procedimientos p 
    WHERE p.clave_procedimiento = '19.01.008' AND p.hospital_id = h.id
  );

INSERT INTO procedimientos (nombre, clave_procedimiento, hospital_id, descripcion)
SELECT 
  'Anestesia de Alta Especialidad en Trasplante Renal',
  '19.01.009',
  h.id,
  'Alta especialidad en trasplante renal'
FROM hospitales h
WHERE h.display_name ILIKE '%HE%CMN%Siglo XXI%'
  AND NOT EXISTS (
    SELECT 1 FROM procedimientos p 
    WHERE p.clave_procedimiento = '19.01.009' AND p.hospital_id = h.id
  );

-- Para UMAE HC CMN Siglo XXI - Cuidados Anestésicos Monitoreados
INSERT INTO procedimientos (nombre, clave_procedimiento, hospital_id, descripcion)
SELECT 
  'Cuidados Anestésicos Monitoreados',
  '19.01.010',
  h.id,
  'Cuidados anestésicos monitoreados'
FROM hospitales h
WHERE h.display_name ILIKE '%HC%CMN%Siglo XXI%'
  AND NOT EXISTS (
    SELECT 1 FROM procedimientos p 
    WHERE p.clave_procedimiento = '19.01.010' AND p.hospital_id = h.id
  );

-- Actualizar claves existentes si no las tienen
UPDATE procedimientos SET clave_procedimiento = '19.01.001' 
WHERE nombre ILIKE '%General%Balanceada%Adulto%' AND clave_procedimiento IS NULL;

UPDATE procedimientos SET clave_procedimiento = '19.01.002' 
WHERE nombre ILIKE '%General%Alta Especialidad%' AND clave_procedimiento IS NULL;

UPDATE procedimientos SET clave_procedimiento = '19.01.003' 
WHERE nombre ILIKE '%General%Endovenosa%' AND clave_procedimiento IS NULL;

UPDATE procedimientos SET clave_procedimiento = '19.01.004' 
WHERE nombre ILIKE '%General%Balanceada%Pediátrica%' AND clave_procedimiento IS NULL;

UPDATE procedimientos SET clave_procedimiento = '19.01.005' 
WHERE nombre ILIKE '%Loco%Regional%' AND clave_procedimiento IS NULL;

UPDATE procedimientos SET clave_procedimiento = '19.01.006' 
WHERE nombre ILIKE '%Sedación%' AND clave_procedimiento IS NULL;

-- 5. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_medicos_hospital_activo ON medicos(hospital_id, activo);
CREATE INDEX IF NOT EXISTS idx_procedimientos_hospital ON procedimientos(hospital_id);
CREATE INDEX IF NOT EXISTS idx_procedimientos_clave ON procedimientos(clave_procedimiento);