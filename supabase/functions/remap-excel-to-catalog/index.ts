import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para normalizar nombres
function normalizarNombre(nombre: string): string {
  return nombre
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[():,.\-]/g, ' ') // Reemplazar puntuación por espacios
    .replace(/\s+/g, ' ') // Colapsar espacios múltiples
    .trim();
}

// Implementación del algoritmo Jaro-Winkler
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

interface Match {
  excelId: number;
  excelNombre: string;
  catalogoId: string;
  catalogoNombre: string;
  tipoAnestesia: string;
  minExcel: number | null;
  maxExcel: number | null;
  similitud: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando remapeo inteligente Excel → Catálogo...');

    // 1. Leer excel_insumo_config
    const { data: excelData, error: errorExcel } = await supabase
      .from('excel_insumo_config')
      .select('*')
      .order('id');

    if (errorExcel) {
      throw new Error(`Error leyendo Excel: ${errorExcel.message}`);
    }

    // 2. Leer insumos_catalogo
    const { data: catalogoData, error: errorCatalogo } = await supabase
      .from('insumos_catalogo')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre');

    if (errorCatalogo) {
      throw new Error(`Error leyendo catálogo: ${errorCatalogo.message}`);
    }

    console.log(`📊 Analizando ${excelData?.length} registros de Excel contra ${catalogoData?.length} insumos de catálogo...`);

    // 3. Matching inteligente
    const matches: Match[] = [];
    const noMapeados: Array<{ id: number; nombre: string; tipo: string }> = [];

    for (const excelRow of excelData || []) {
      const nombreExcelNorm = normalizarNombre(excelRow.nombre_insumo);
      const candidatos: Array<{ id: string; nombre: string; similitud: number }> = [];

      // Buscar candidatos
      for (const catalogoRow of catalogoData || []) {
        const nombreCatalogoNorm = normalizarNombre(catalogoRow.nombre);

        // Verificar si uno contiene al otro
        const contieneExcel = nombreCatalogoNorm.includes(nombreExcelNorm);
        const contieneCatalogo = nombreExcelNorm.includes(nombreCatalogoNorm);

        if (contieneExcel || contieneCatalogo) {
          const similitud = jaroWinklerDistance(nombreExcelNorm, nombreCatalogoNorm);
          
          if (similitud >= 0.88) {
            candidatos.push({
              id: catalogoRow.id,
              nombre: catalogoRow.nombre,
              similitud,
            });
          }
        }
      }

      // Si encontramos candidatos, agregar todos los que tengan similitud >= 0.88
      if (candidatos.length > 0) {
        // Ordenar por similitud descendente
        candidatos.sort((a, b) => b.similitud - a.similitud);

        // Para casos como "CIRCUITO CIRCULAR", permitir múltiples matches
        // Si hay varios candidatos con similitud muy cercana, incluirlos todos
        const mejorSimilitud = candidatos[0].similitud;
        const candidatosFinales = candidatos.filter(c => c.similitud >= mejorSimilitud - 0.05);

        for (const candidato of candidatosFinales) {
          matches.push({
            excelId: excelRow.id,
            excelNombre: excelRow.nombre_insumo,
            catalogoId: candidato.id,
            catalogoNombre: candidato.nombre,
            tipoAnestesia: excelRow.tipo_anestesia,
            minExcel: excelRow.min_excel,
            maxExcel: excelRow.max_excel,
            similitud: candidato.similitud,
          });
        }
      } else {
        noMapeados.push({
          id: excelRow.id,
          nombre: excelRow.nombre_insumo,
          tipo: excelRow.tipo_anestesia,
        });
      }
    }

    console.log(`✅ Generados ${matches.length} matches (algunos insumos mapeados a múltiples variantes)`);
    console.log(`⚠️  ${noMapeados.length} registros de Excel sin mapeo`);

    // 4. Obtener configuraciones existentes para identificar qué actualizar vs insertar
    const { data: configuracionesExistentes } = await supabase
      .from('insumo_configuracion')
      .select('id, insumo_catalogo_id, tipo_anestesia, min_anestesia, max_anestesia');

    const existenteMap = new Map<string, any>();
    for (const config of configuracionesExistentes || []) {
      const key = `${config.insumo_catalogo_id}|${config.tipo_anestesia}`;
      existenteMap.set(key, config);
    }

    // Separar matches en: nuevos vs actualizaciones
    const paraInsertar: any[] = [];
    const paraActualizar: any[] = [];

    for (const match of matches) {
      const key = `${match.catalogoId}|${match.tipoAnestesia}`;
      const existente = existenteMap.get(key);
      const cantidadDefault = (match.minExcel && match.minExcel > 0) ? match.minExcel : 1;

      if (existente) {
        // Solo actualizar si los valores cambiaron
        if (existente.min_anestesia !== match.minExcel || existente.max_anestesia !== match.maxExcel) {
          paraActualizar.push({
            id: existente.id,
            min_anestesia: match.minExcel,
            max_anestesia: match.maxExcel,
            cantidad_default: cantidadDefault,
          });
        }
      } else {
        paraInsertar.push({
          insumo_catalogo_id: match.catalogoId,
          tipo_anestesia: match.tipoAnestesia,
          min_anestesia: match.minExcel,
          max_anestesia: match.maxExcel,
          cantidad_default: cantidadDefault,
        });
      }
    }

    console.log(`📝 Preparando ${paraInsertar.length} inserciones y ${paraActualizar.length} actualizaciones...`);

    // Insertar en batch
    let insertados = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < paraInsertar.length; i += BATCH_SIZE) {
      const batch = paraInsertar.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('insumo_configuracion')
        .insert(batch);
      
      if (error) {
        console.error(`Error en batch insert:`, error);
      } else {
        insertados += batch.length;
      }
    }

    // Actualizar en batch (uno por uno porque Supabase no soporta bulk update fácilmente)
    let actualizados = 0;
    for (const item of paraActualizar) {
      const { error } = await supabase
        .from('insumo_configuracion')
        .update({
          min_anestesia: item.min_anestesia,
          max_anestesia: item.max_anestesia,
          cantidad_default: item.cantidad_default,
        })
        .eq('id', item.id);
      
      if (!error) {
        actualizados++;
      }
    }

    // 5. Buscar ejemplos específicos solicitados
    const ejemplosQuery = await supabase
      .from('insumo_configuracion')
      .select(`
        id,
        tipo_anestesia,
        min_anestesia,
        max_anestesia,
        insumos_catalogo!inner(nombre)
      `)
      .ilike('insumos_catalogo.nombre', '%cal%sodada%')
      .limit(5);

    const circuitosQuery = await supabase
      .from('insumo_configuracion')
      .select(`
        id,
        tipo_anestesia,
        min_anestesia,
        max_anestesia,
        insumos_catalogo!inner(nombre)
      `)
      .ilike('insumos_catalogo.nombre', '%circuito%circular%')
      .limit(10);

    const resultado = {
      success: true,
      mensaje: 'Remapeo inteligente completado exitosamente',
      estadisticas: {
        total_matches: matches.length,
        filas_insertadas: insertados,
        filas_actualizadas: actualizados,
        registros_sin_mapeo: noMapeados.length,
      },
      ejemplos_cal_sodada: ejemplosQuery.data || [],
      ejemplos_circuitos: circuitosQuery.data || [],
      muestra_matches: matches.slice(0, 10).map(m => ({
        excel: m.excelNombre,
        catalogo: m.catalogoNombre,
        tipo_anestesia: m.tipoAnestesia,
        similitud: Math.round(m.similitud * 100),
        min: m.minExcel,
        max: m.maxExcel,
      })),
      sin_mapeo_muestra: noMapeados.slice(0, 10),
    };

    console.log('✅ Remapeo completado:', resultado.estadisticas);

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error en remap-excel-to-catalog:', error);
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
