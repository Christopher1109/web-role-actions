import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Iniciando configuración de insumos para nuevos tipos de anestesia...');

    // 1. Configurar insumos para Cuidados Anestésicos Monitoreados (19.01.010)
    const insumosCAM = [
      'JERINGA DE PLASTICO CON CAPACIDAD DE 10ML CON AGUJA DE 21G',
      'JERINGA DE PLASTICO CON CAPACIDAD DE 20ML SIN AGUJA',
      'GUANTES PARA EXPLORACIÓN AMBIDIESTRO ESTÉRILES DE LATEX DESECHABLES TAMAÑO CHICO',
      'GUANTES PARA EXPLORACIÓN AMBIDIESTRO ESTÉRILES DE LATEX DESECHABLES TAMAÑO GRANDE',
      'GUANTES PARA EXPLORACIÓN AMBIDIESTRO ESTÉRILES DE LATEX DESECHABLES TAMAÑO MEDIANO',
      'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 1',
      'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 2',
      'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 3',
      'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 4',
      'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 5',
      'MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 6',
      'PUNTAS NASALES PARA ADMINISTRACIÓN DE OXIGENO TAMAÑOS ADULTO',
      'PUNTAS NASALES PARA ADMINISTRACIÓN DE OXIGENO TAMAÑOS PEDIATRICO',
    ];

    let insumosCAMCreados = 0;
    let configuracionCAMCreada = 0;

    for (const nombreInsumo of insumosCAM) {
      // Verificar si el insumo ya existe en el catálogo
      const { data: insumoExistente, error: errorBusqueda } = await supabase
        .from('insumos_catalogo')
        .select('id')
        .ilike('nombre', nombreInsumo)
        .single();

      let insumoId = insumoExistente?.id;

      if (!insumoId) {
        // Crear el insumo en el catálogo
        const { data: nuevoInsumo, error: errorCreacion } = await supabase
          .from('insumos_catalogo')
          .insert({
            nombre: nombreInsumo,
            activo: true,
            tipo: 'insumo',
            unidad: 'pieza',
          })
          .select('id')
          .single();

        if (errorCreacion) {
          console.error(`Error creando insumo ${nombreInsumo}:`, errorCreacion);
          continue;
        }

        insumoId = nuevoInsumo.id;
        insumosCAMCreados++;
        console.log(`Insumo creado: ${nombreInsumo}`);
      }

      // Crear configuración para Cuidados Anestésicos Monitoreados
      const { error: errorConfig } = await supabase
        .from('insumo_configuracion')
        .upsert({
          insumo_catalogo_id: insumoId,
          tipo_anestesia: 'Cuidados Anestésicos Monitoreados',
          cantidad_default: 1,
          min_anestesia: 1,
          max_anestesia: 2,
        }, {
          onConflict: 'insumo_catalogo_id,tipo_anestesia',
          ignoreDuplicates: false,
        });

      if (!errorConfig) {
        configuracionCAMCreada++;
      } else {
        console.error(`Error configurando insumo ${nombreInsumo}:`, errorConfig);
      }
    }

    console.log(`Insumos CAM creados: ${insumosCAMCreados}`);
    console.log(`Configuraciones CAM creadas: ${configuracionCAMCreada}`);

    // 2. Copiar configuración de Trasplante Renal para Trasplante Hepático y Neurocirugía
    const { data: configTrasplanteRenal, error: errorConsulta } = await supabase
      .from('insumo_configuracion')
      .select('*')
      .eq('tipo_anestesia', 'Anestesia de Alta Especialidad en Trasplante Renal');

    if (errorConsulta) {
      throw new Error(`Error consultando configuración de Trasplante Renal: ${errorConsulta.message}`);
    }

    console.log(`Configuraciones de Trasplante Renal encontradas: ${configTrasplanteRenal?.length || 0}`);

    let configuracionHepaticaCreada = 0;
    let configuracionNeurocirugiaCreada = 0;

    if (configTrasplanteRenal && configTrasplanteRenal.length > 0) {
      // Crear configuración para Trasplante Hepático
      const configHepatica = configTrasplanteRenal.map((config) => ({
        insumo_catalogo_id: config.insumo_catalogo_id,
        tipo_anestesia: 'Anestesia de Alta Especialidad en Trasplante Hepático',
        cantidad_default: config.cantidad_default,
        min_anestesia: config.min_anestesia,
        max_anestesia: config.max_anestesia,
        min_global_inventario: config.min_global_inventario,
        max_global_inventario: config.max_global_inventario,
        tipo_limite: config.tipo_limite,
        condicionante: config.condicionante,
        grupo_exclusivo: config.grupo_exclusivo,
        nota: config.nota,
      }));

      const { data: resultHepatica, error: errorHepatica } = await supabase
        .from('insumo_configuracion')
        .upsert(configHepatica, {
          onConflict: 'insumo_catalogo_id,tipo_anestesia',
          ignoreDuplicates: true,
        })
        .select();

      if (errorHepatica) {
        console.error('Error creando configuración de Trasplante Hepático:', errorHepatica);
      } else {
        configuracionHepaticaCreada = resultHepatica?.length || 0;
        console.log(`Configuraciones de Trasplante Hepático creadas: ${configuracionHepaticaCreada}`);
      }

      // Crear configuración para Neurocirugía
      const configNeurocirugia = configTrasplanteRenal.map((config) => ({
        insumo_catalogo_id: config.insumo_catalogo_id,
        tipo_anestesia: 'Anestesia de Alta Especialidad en Neurocirugía',
        cantidad_default: config.cantidad_default,
        min_anestesia: config.min_anestesia,
        max_anestesia: config.max_anestesia,
        min_global_inventario: config.min_global_inventario,
        max_global_inventario: config.max_global_inventario,
        tipo_limite: config.tipo_limite,
        condicionante: config.condicionante,
        grupo_exclusivo: config.grupo_exclusivo,
        nota: config.nota,
      }));

      const { data: resultNeurocirugia, error: errorNeurocirugia } = await supabase
        .from('insumo_configuracion')
        .upsert(configNeurocirugia, {
          onConflict: 'insumo_catalogo_id,tipo_anestesia',
          ignoreDuplicates: true,
        })
        .select();

      if (errorNeurocirugia) {
        console.error('Error creando configuración de Neurocirugía:', errorNeurocirugia);
      } else {
        configuracionNeurocirugiaCreada = resultNeurocirugia?.length || 0;
        console.log(`Configuraciones de Neurocirugía creadas: ${configuracionNeurocirugiaCreada}`);
      }
    }

    const resultado = {
      success: true,
      message: 'Configuración de nuevos tipos de anestesia completada',
      detalles: {
        cuidados_anestesicos_monitoreados: {
          insumos_creados: insumosCAMCreados,
          configuraciones_creadas: configuracionCAMCreada,
        },
        trasplante_hepatico: {
          configuraciones_creadas: configuracionHepaticaCreada,
        },
        neurocirugia: {
          configuraciones_creadas: configuracionNeurocirugiaCreada,
        },
      },
    };

    console.log('Resultado final:', resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en setup-new-anesthesia-types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
