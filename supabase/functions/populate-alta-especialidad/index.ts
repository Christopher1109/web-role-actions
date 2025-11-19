import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsumoConfig {
  nombre: string;
  cantidad_minima: number;
  cantidad_maxima: number;
  tipo_limite: 'fijo' | 'rango' | 'a_eleccion' | 'desactivado';
  nota?: string;
  cantidad_default: number;
  activo: boolean;
  orden: number;
}

const insumosGeneralBalanceadaAdulto: InsumoConfig[] = [
  {
    nombre: 'CIRCUITO CIRCULAR CERRADO EXPANDIBLE CON BOLSA Y MASCARILLA',
    cantidad_minima: 1,
    cantidad_maxima: 1,
    tipo_limite: 'fijo',
    cantidad_default: 1,
    activo: true,
    orden: 1
  },
  {
    nombre: 'TUBO ENDOTRAQUEAL DE PLÁSTICO',
    cantidad_minima: 1,
    cantidad_maxima: 2,
    tipo_limite: 'a_eleccion',
    nota: 'El anestesiólogo elige la medida',
    cantidad_default: 1,
    activo: true,
    orden: 2
  },
  {
    nombre: 'TUBO ENDOTRAQUEAL PREFORMADO CON GLOBO',
    cantidad_minima: 0,
    cantidad_maxima: 0,
    tipo_limite: 'desactivado',
    nota: 'No aplica para esta categoría',
    cantidad_default: 0,
    activo: false,
    orden: 3
  },
  {
    nombre: 'TUBO ENDOBRONQUIAL',
    cantidad_minima: 0,
    cantidad_maxima: 0,
    tipo_limite: 'desactivado',
    nota: 'No aplica para esta categoría',
    cantidad_default: 0,
    activo: false,
    orden: 4
  },
  {
    nombre: 'CÁNULA OROFARÍNGEA TIPO GUEDEL',
    cantidad_minima: 1,
    cantidad_maxima: 1,
    tipo_limite: 'fijo',
    cantidad_default: 1,
    activo: true,
    orden: 5
  },
  {
    nombre: 'LLAVE DE 3 VÍAS CON EXTENSIÓN',
    cantidad_minima: 1,
    cantidad_maxima: 3,
    tipo_limite: 'a_eleccion',
    nota: 'A elección del anestesiólogo',
    cantidad_default: 1,
    activo: true,
    orden: 6
  },
  {
    nombre: 'LLAVE DE 3 O 4 VÍAS SIN EXTENSIÓN',
    cantidad_minima: 0,
    cantidad_maxima: 0,
    tipo_limite: 'desactivado',
    cantidad_default: 0,
    activo: false,
    orden: 7
  },
  {
    nombre: 'EQUIPO DE VENOCLISIS PARA BOMBA DE INFUSIÓN',
    cantidad_minima: 1,
    cantidad_maxima: 1,
    tipo_limite: 'fijo',
    cantidad_default: 1,
    activo: true,
    orden: 8
  },
  {
    nombre: 'MEDIAS DE COMPRESIÓN ANTITROMBÓTICAS',
    cantidad_minima: 1,
    cantidad_maxima: 1,
    tipo_limite: 'fijo',
    cantidad_default: 1,
    activo: true,
    orden: 9
  },
  {
    nombre: 'ELECTRODOS PARA ELECTROCARDIOGRAMA',
    cantidad_minima: 3,
    cantidad_maxima: 5,
    tipo_limite: 'rango',
    cantidad_default: 3,
    activo: true,
    orden: 10
  },
  {
    nombre: 'CATÉTER PARA VENOCLISIS',
    cantidad_minima: 2,
    cantidad_maxima: 3,
    tipo_limite: 'rango',
    cantidad_default: 2,
    activo: true,
    orden: 11
  },
  {
    nombre: 'EQUIPO PARA VENOCLISIS MICROGOTERO Y NORMOGOTERO',
    cantidad_minima: 1,
    cantidad_maxima: 3,
    tipo_limite: 'rango',
    cantidad_default: 1,
    activo: true,
    orden: 12
  },
  {
    nombre: 'JERINGA DE PLÁSTICO CON CAPACIDAD DE 10ML CON AGUJA DE 21G',
    cantidad_minima: 3,
    cantidad_maxima: 6,
    tipo_limite: 'rango',
    cantidad_default: 3,
    activo: true,
    orden: 13
  },
  {
    nombre: 'JERINGA DE PLÁSTICO CON CAPACIDAD DE 20ML SIN AGUJA',
    cantidad_minima: 1,
    cantidad_maxima: 2,
    tipo_limite: 'rango',
    cantidad_default: 1,
    activo: true,
    orden: 14
  },
  {
    nombre: 'JERINGA DE PLÁSTICO CON CAPACIDAD DE 50ML SIN AGUJA',
    cantidad_minima: 1,
    cantidad_maxima: 3,
    tipo_limite: 'rango',
    cantidad_default: 1,
    activo: true,
    orden: 15
  },
  {
    nombre: 'GUANTES PARA EXPLORACIÓN AMBIDIESTRO ESTÉRILES DE LATEX',
    cantidad_minima: 1,
    cantidad_maxima: 2,
    tipo_limite: 'a_eleccion',
    nota: 'Talla a elección del anestesiólogo',
    cantidad_default: 1,
    activo: true,
    orden: 16
  },
  {
    nombre: 'JERINGA DE PLÁSTICO CON CAPACIDAD DE 5ML CON AGUJA 20G',
    cantidad_minima: 3,
    cantidad_maxima: 4,
    tipo_limite: 'rango',
    cantidad_default: 3,
    activo: true,
    orden: 17
  },
  {
    nombre: 'JERINGA DE INSULINA',
    cantidad_minima: 1,
    cantidad_maxima: 4,
    tipo_limite: 'rango',
    cantidad_default: 1,
    activo: true,
    orden: 18
  },
  {
    nombre: 'AGUJA HIPODÉRMICA DESECHABLE CALIBRES: 20G, 21G, 22G, 25G',
    cantidad_minima: 5,
    cantidad_maxima: 8,
    tipo_limite: 'rango',
    cantidad_default: 5,
    activo: true,
    orden: 19
  },
  {
    nombre: 'CAL SODADA: ABSORBEDOR PARA UNIDAD DE ANESTESIA, DE DIÓXIDO DE CARBONO',
    cantidad_minima: 2,
    cantidad_maxima: 3,
    tipo_limite: 'rango',
    cantidad_default: 2,
    activo: true,
    orden: 20
  },
  {
    nombre: 'EQUIPO DE APLICACIÓN DE VOLUMEN MEDIDO CON CAPACIDAD DE 100ML',
    cantidad_minima: 1,
    cantidad_maxima: 3,
    tipo_limite: 'rango',
    cantidad_default: 1,
    activo: true,
    orden: 21
  },
  {
    nombre: 'ELECTRODOS PARA MONITOREO DE PROFUNDIDAD ANESTÉSICA',
    cantidad_minima: 1,
    cantidad_maxima: 1,
    tipo_limite: 'fijo',
    cantidad_default: 1,
    activo: true,
    orden: 22
  },
  {
    nombre: 'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO',
    cantidad_minima: 1,
    cantidad_maxima: 1,
    tipo_limite: 'fijo',
    cantidad_default: 1,
    activo: true,
    orden: 23
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando población de insumos para Anestesia General Balanceada Adulto...');

    const tipoAnestesia = 'general_balanceada_adulto';
    let insumosCreados = 0;
    let insumosActualizados = 0;
    const errores: string[] = [];

    for (const insumoConfig of insumosGeneralBalanceadaAdulto) {
      try {
        // Buscar si el insumo ya existe en la tabla insumos
        const { data: insumoExistente, error: searchError } = await supabase
          .from('insumos')
          .select('id')
          .ilike('nombre', `%${insumoConfig.nombre}%`)
          .limit(1)
          .maybeSingle();

        if (searchError) {
          console.error(`Error buscando insumo ${insumoConfig.nombre}:`, searchError);
          errores.push(`Error buscando ${insumoConfig.nombre}: ${searchError.message}`);
          continue;
        }

        let insumoId: string;

        if (!insumoExistente) {
          // Crear el insumo si no existe
          const { data: nuevoInsumo, error: createError } = await supabase
            .from('insumos')
            .insert({
              nombre: insumoConfig.nombre,
              descripcion: insumoConfig.nota || '',
              cantidad: insumoConfig.cantidad_default,
            })
            .select('id')
            .single();

          if (createError || !nuevoInsumo) {
            console.error(`Error creando insumo ${insumoConfig.nombre}:`, createError);
            errores.push(`Error creando ${insumoConfig.nombre}: ${createError?.message}`);
            continue;
          }

          insumoId = nuevoInsumo.id;
          console.log(`Insumo creado: ${insumoConfig.nombre}`);
        } else {
          insumoId = insumoExistente.id;
        }

        // Verificar si ya existe la relación anestesia_insumos
        const { data: relacionExistente } = await supabase
          .from('anestesia_insumos')
          .select('id')
          .eq('insumo_id', insumoId)
          .eq('tipo_anestesia', tipoAnestesia)
          .maybeSingle();

        if (relacionExistente) {
          // Actualizar la relación existente
          const { error: updateError } = await supabase
            .from('anestesia_insumos')
            .update({
              cantidad_minima: insumoConfig.cantidad_minima,
              cantidad_maxima: insumoConfig.cantidad_maxima,
              tipo_limite: insumoConfig.tipo_limite,
              nota: insumoConfig.nota,
              cantidad_default: insumoConfig.cantidad_default,
              activo: insumoConfig.activo,
              orden: insumoConfig.orden,
            })
            .eq('id', relacionExistente.id);

          if (updateError) {
            console.error(`Error actualizando relación para ${insumoConfig.nombre}:`, updateError);
            errores.push(`Error actualizando relación ${insumoConfig.nombre}: ${updateError.message}`);
          } else {
            insumosActualizados++;
            console.log(`Relación actualizada: ${insumoConfig.nombre}`);
          }
        } else {
          // Crear nueva relación
          const { error: insertError } = await supabase
            .from('anestesia_insumos')
            .insert({
              insumo_id: insumoId,
              tipo_anestesia: tipoAnestesia,
              cantidad_minima: insumoConfig.cantidad_minima,
              cantidad_maxima: insumoConfig.cantidad_maxima,
              tipo_limite: insumoConfig.tipo_limite,
              nota: insumoConfig.nota,
              cantidad_default: insumoConfig.cantidad_default,
              activo: insumoConfig.activo,
              orden: insumoConfig.orden,
            });

          if (insertError) {
            console.error(`Error creando relación para ${insumoConfig.nombre}:`, insertError);
            errores.push(`Error creando relación ${insumoConfig.nombre}: ${insertError.message}`);
          } else {
            insumosCreados++;
            console.log(`Relación creada: ${insumoConfig.nombre}`);
          }
        }
      } catch (error: any) {
        console.error(`Error procesando ${insumoConfig.nombre}:`, error);
        errores.push(`Error procesando ${insumoConfig.nombre}: ${error.message}`);
      }
    }

    const resultado = {
      success: true,
      mensaje: 'Población de insumos completada',
      tipo_anestesia: tipoAnestesia,
      total_insumos: insumosGeneralBalanceadaAdulto.length,
      insumos_creados: insumosCreados,
      insumos_actualizados: insumosActualizados,
      errores: errores.length > 0 ? errores : null,
    };

    console.log('Resultado final:', resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error general:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
