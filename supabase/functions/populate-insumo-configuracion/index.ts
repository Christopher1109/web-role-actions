import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Implementación del algoritmo Jaro-Winkler para similitud de strings
function jaroWinklerDistance(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / str1.length + matches / str2.length + 
                (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + (prefix * 0.1 * (1 - jaro));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando población de insumo_configuracion...');

    // 1. Leer catálogo antiguo (insumos)
    const { data: insumosAntiguos, error: errorAntiguos } = await supabase
      .from('insumos')
      .select('id, nombre')
      .order('nombre');

    if (errorAntiguos) {
      throw new Error(`Error leyendo insumos antiguos: ${errorAntiguos.message}`);
    }

    // 2. Leer catálogo nuevo (insumos_catalogo)
    const { data: insumosNuevos, error: errorNuevos } = await supabase
      .from('insumos_catalogo')
      .select('id, nombre, tipo, categoria, familia_insumo')
      .order('nombre');

    if (errorNuevos) {
      throw new Error(`Error leyendo insumos nuevos: ${errorNuevos.message}`);
    }

    console.log(`Analizando ${insumosAntiguos?.length} insumos antiguos contra ${insumosNuevos?.length} insumos nuevos...`);

    // 3. Generar mapeo MATCH_ALTO (≥90%)
    const mapeo: Record<string, string> = {}; // insumo_id_antiguo -> insumo_catalogo_id_nuevo
    const matchesAltos: Array<{ antiguo: string; nuevo: string; similitud: number }> = [];

    for (const insumoAntiguo of insumosAntiguos || []) {
      let mejorMatch = {
        insumo: null as any,
        similitud: 0,
      };

      for (const insumoNuevo of insumosNuevos || []) {
        const similitud = jaroWinklerDistance(insumoAntiguo.nombre, insumoNuevo.nombre);
        
        if (similitud > mejorMatch.similitud) {
          mejorMatch = {
            insumo: insumoNuevo,
            similitud,
          };
        }
      }

      const similitudPorcentaje = mejorMatch.similitud * 100;

      // Solo considerar MATCH_ALTO (≥90%)
      if (similitudPorcentaje >= 90 && mejorMatch.insumo) {
        mapeo[insumoAntiguo.id] = mejorMatch.insumo.id;
        matchesAltos.push({
          antiguo: insumoAntiguo.nombre,
          nuevo: mejorMatch.insumo.nombre,
          similitud: similitudPorcentaje,
        });
      }
    }

    console.log(`Generados ${Object.keys(mapeo).length} mapeos MATCH_ALTO`);

    // 4. Leer anestesia_insumos
    const { data: anestesiaInsumos, error: errorAnestesia } = await supabase
      .from('anestesia_insumos')
      .select('*');

    if (errorAnestesia) {
      throw new Error(`Error leyendo anestesia_insumos: ${errorAnestesia.message}`);
    }

    console.log(`Leyendo ${anestesiaInsumos?.length} registros de anestesia_insumos...`);

    // 5. Poblar insumo_configuracion
    const registrosInsertar: Array<any> = [];
    const noMapeados: Array<string> = [];

    for (const anestesia of anestesiaInsumos || []) {
      if (!anestesia.insumo_id) continue;

      const insumo_catalogo_id = mapeo[anestesia.insumo_id];

      if (!insumo_catalogo_id) {
        noMapeados.push(anestesia.insumo_id);
        continue;
      }

      registrosInsertar.push({
        insumo_catalogo_id,
        tipo_anestesia: anestesia.tipo_anestesia,
        min_anestesia: anestesia.cantidad_minima,
        max_anestesia: anestesia.cantidad_maxima,
        cantidad_default: anestesia.cantidad_default,
        tipo_limite: anestesia.tipo_limite,
        grupo_exclusivo: anestesia.grupo_exclusivo,
        condicionante: anestesia.condicionante,
        nota: anestesia.nota,
        min_global_inventario: null,
        max_global_inventario: null,
      });
    }

    console.log(`Insertando ${registrosInsertar.length} registros en insumo_configuracion...`);

    // Insertar en bloques de 100 para evitar límites
    const BATCH_SIZE = 100;
    let insertados = 0;

    for (let i = 0; i < registrosInsertar.length; i += BATCH_SIZE) {
      const batch = registrosInsertar.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('insumo_configuracion')
        .insert(batch);

      if (insertError) {
        console.error(`Error insertando batch ${i / BATCH_SIZE + 1}:`, insertError);
        throw new Error(`Error insertando configuración: ${insertError.message}`);
      }

      insertados += batch.length;
    }

    // 6. Obtener ejemplos de registros insertados
    const { data: ejemplos, error: errorEjemplos } = await supabase
      .from('insumo_configuracion')
      .select(`
        id,
        tipo_anestesia,
        min_anestesia,
        max_anestesia,
        cantidad_default,
        insumos_catalogo!inner(nombre, tipo, categoria)
      `)
      .limit(5);

    if (errorEjemplos) {
      console.error('Error obteniendo ejemplos:', errorEjemplos);
    }

    const resultado = {
      success: true,
      mensaje: 'Matriz maestra de configuración creada exitosamente',
      estadisticas: {
        total_insumos_antiguos: insumosAntiguos?.length || 0,
        total_insumos_nuevos: insumosNuevos?.length || 0,
        mapeos_match_alto: Object.keys(mapeo).length,
        registros_anestesia: anestesiaInsumos?.length || 0,
        registros_insertados: insertados,
        no_mapeados: noMapeados.length,
      },
      ejemplos: ejemplos || [],
      matches_altos_sample: matchesAltos.slice(0, 5),
    };

    console.log('Población completada:', resultado.estadisticas);

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error en populate-insumo-configuracion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
