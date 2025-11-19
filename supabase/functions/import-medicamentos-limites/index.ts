import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import * as XLSX from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsumoLimite {
  id_bcb: string;
  descripcion: string;
  cantidad_minima: string;
  cantidad_maxima: string;
}

// Mapeo de códigos de procedimiento a tipos de anestesia
const procedimientoMapping: Record<string, string> = {
  '19.01.001': 'anestesia_general_balanceada_adulto',
  '19.01.002': 'anestesia_general_alta_especialidad',
  '19.01.003': 'anestesia_general_balanceada_pediatrica',
  '19.01.004': 'anestesia_general_endovenosa',
  '19.01.005': 'anestesia_loco_regional',
  '19.01.006': 'sedacion',
};

function parseQuantity(value: string): number | null {
  if (!value) return null;
  
  // Extraer número de strings como "40ml", "1 a elección del anestesiólogo", etc.
  const match = value.toString().match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function findInsumoByDescription(insumos: any[], descripcion: string): any | null {
  const cleanDesc = descripcion.toLowerCase().trim();
  
  return insumos.find(insumo => {
    const insumoDesc = insumo.descripcion?.toLowerCase().trim() || '';
    const insumoNombre = insumo.nombre?.toLowerCase().trim() || '';
    
    // Buscar coincidencia parcial en descripción o nombre
    return insumoDesc.includes(cleanDesc.substring(0, 30)) || 
           cleanDesc.includes(insumoNombre.substring(0, 20));
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No se proporcionó archivo');
    }

    console.log('Procesando archivo:', file.name);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Obtener todos los insumos para hacer matching
    const { data: insumos, error: insumosError } = await supabase
      .from('insumos')
      .select('*');

    if (insumosError) {
      throw new Error(`Error obteniendo insumos: ${insumosError.message}`);
    }

    let currentTipoAnestesia = '';
    const registrosImportados: any[] = [];
    const errores: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Detectar tipo de anestesia (códigos como 19.01.001)
      if (row[0] && typeof row[0] === 'string' && row[0].match(/^\d{2}\.\d{2}\.\d{3}$/)) {
        currentTipoAnestesia = procedimientoMapping[row[0]] || '';
        console.log(`Procesando tipo de anestesia: ${currentTipoAnestesia}`);
        continue;
      }

      // Procesar filas de datos (deben tener id_bcb, descripción, min, max)
      if (!currentTipoAnestesia || !row[0] || row[0] === 'id_bcb') continue;

      const idBcb = row[0]?.toString().trim();
      const descripcion = row[1]?.toString().trim();
      const cantidadMin = row[2];
      const cantidadMax = row[3];

      if (!idBcb || !descripcion) continue;

      // Buscar el insumo correspondiente
      const insumo = findInsumoByDescription(insumos!, descripcion);

      if (!insumo) {
        errores.push(`No se encontró insumo para: ${descripcion.substring(0, 50)}...`);
        continue;
      }

      const minima = parseQuantity(cantidadMin);
      const maxima = parseQuantity(cantidadMax);

      if (minima === null) {
        errores.push(`Cantidad mínima inválida para ${idBcb}`);
        continue;
      }

      registrosImportados.push({
        tipo_anestesia: currentTipoAnestesia,
        insumo_id: insumo.id,
        categoria: 'medicamento',
        cantidad_minima: minima,
        cantidad_maxima: maxima,
        id_bcb: idBcb,
        unidad: cantidadMin?.toString().match(/ml/i) ? 'ml' : 'unidad',
      });
    }

    console.log(`Registros a importar: ${registrosImportados.length}`);

    // Eliminar registros existentes de medicamentos
    await supabase
      .from('anestesia_insumos')
      .delete()
      .eq('categoria', 'medicamento');

    // Insertar nuevos registros
    if (registrosImportados.length > 0) {
      const { error: insertError } = await supabase
        .from('anestesia_insumos')
        .insert(registrosImportados);

      if (insertError) {
        throw new Error(`Error insertando registros: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        importados: registrosImportados.length,
        errores: errores,
        message: `Se importaron ${registrosImportados.length} registros de límites de medicamentos`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});