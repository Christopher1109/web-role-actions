import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Implementación del algoritmo Jaro-Winkler para similitud de strings
function jaroWinklerDistance(s1: string, s2: string): number {
  // Normalizar strings (lowercase, trim)
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // Calcular distancia Jaro
  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  // Identificar matches
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

  // Calcular transposiciones
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / str1.length + matches / str2.length + 
                (matches - transpositions / 2) / matches) / 3;

  // Calcular prefijo común (máximo 4 caracteres)
  let prefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  // Aplicar factor de escala Winkler (0.1)
  return jaro + (prefix * 0.1 * (1 - jaro));
}

interface InsumoAntiguo {
  id: string;
  nombre: string;
}

interface InsumoNuevo {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  familia_insumo: string;
}

interface MatchResult {
  insumo_antiguo_id: string;
  insumo_antiguo_nombre: string;
  insumo_nuevo_id: string;
  insumo_nuevo_nombre: string;
  similitud_porcentaje: number;
  clasificacion: 'MATCH_ALTO' | 'MATCH_MEDIO' | 'MATCH_BAJO';
  accion_sugerida: 'Unificar' | 'Revisar manualmente' | 'No unificar';
  tipo_nuevo: string;
  categoria_nueva: string;
  familia_nueva: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando análisis de similitud...');

    // Leer catálogo antiguo (insumos)
    const { data: insumosAntiguos, error: errorAntiguos } = await supabase
      .from('insumos')
      .select('id, nombre')
      .order('nombre');

    if (errorAntiguos) {
      throw new Error(`Error leyendo insumos antiguos: ${errorAntiguos.message}`);
    }

    // Leer catálogo nuevo (insumos_catalogo)
    const { data: insumosNuevos, error: errorNuevos } = await supabase
      .from('insumos_catalogo')
      .select('id, nombre, tipo, categoria, familia_insumo')
      .order('nombre');

    if (errorNuevos) {
      throw new Error(`Error leyendo insumos nuevos: ${errorNuevos.message}`);
    }

    console.log(`Analizando ${insumosAntiguos?.length} insumos antiguos contra ${insumosNuevos?.length} insumos nuevos...`);

    // Realizar análisis de similitud
    const resultados: MatchResult[] = [];

    for (const insumoAntiguo of insumosAntiguos || []) {
      let mejorMatch = {
        insumo: null as InsumoNuevo | null,
        similitud: 0,
      };

      // Comparar con todos los insumos nuevos
      for (const insumoNuevo of insumosNuevos || []) {
        const similitud = jaroWinklerDistance(insumoAntiguo.nombre, insumoNuevo.nombre);
        
        if (similitud > mejorMatch.similitud) {
          mejorMatch = {
            insumo: insumoNuevo,
            similitud,
          };
        }
      }

      // Clasificar y determinar acción
      const similitudPorcentaje = Math.round(mejorMatch.similitud * 100);
      let clasificacion: 'MATCH_ALTO' | 'MATCH_MEDIO' | 'MATCH_BAJO';
      let accionSugerida: 'Unificar' | 'Revisar manualmente' | 'No unificar';

      if (similitudPorcentaje >= 90) {
        clasificacion = 'MATCH_ALTO';
        accionSugerida = 'Unificar';
      } else if (similitudPorcentaje >= 70) {
        clasificacion = 'MATCH_MEDIO';
        accionSugerida = 'Revisar manualmente';
      } else {
        clasificacion = 'MATCH_BAJO';
        accionSugerida = 'No unificar';
      }

      resultados.push({
        insumo_antiguo_id: insumoAntiguo.id,
        insumo_antiguo_nombre: insumoAntiguo.nombre,
        insumo_nuevo_id: mejorMatch.insumo?.id || '',
        insumo_nuevo_nombre: mejorMatch.insumo?.nombre || '',
        similitud_porcentaje: similitudPorcentaje,
        clasificacion,
        accion_sugerida: accionSugerida,
        tipo_nuevo: mejorMatch.insumo?.tipo || '',
        categoria_nueva: mejorMatch.insumo?.categoria || '',
        familia_nueva: mejorMatch.insumo?.familia_insumo || '',
      });
    }

    // Generar estadísticas
    const stats = {
      total_insumos_antiguos: insumosAntiguos?.length || 0,
      total_insumos_nuevos: insumosNuevos?.length || 0,
      match_alto: resultados.filter(r => r.clasificacion === 'MATCH_ALTO').length,
      match_medio: resultados.filter(r => r.clasificacion === 'MATCH_MEDIO').length,
      match_bajo: resultados.filter(r => r.clasificacion === 'MATCH_BAJO').length,
      para_unificar: resultados.filter(r => r.accion_sugerida === 'Unificar').length,
      para_revisar: resultados.filter(r => r.accion_sugerida === 'Revisar manualmente').length,
      no_unificar: resultados.filter(r => r.accion_sugerida === 'No unificar').length,
    };

    // Ordenar resultados por similitud descendente
    resultados.sort((a, b) => b.similitud_porcentaje - a.similitud_porcentaje);

    console.log('Análisis completado:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        estadisticas: stats,
        resultados,
        mensaje: 'Análisis de similitud completado exitosamente',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error en análisis de similitud:', error);
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
