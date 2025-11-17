import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Datos completos extraídos de los archivos Excel
const excelDataComplete: Record<string, string[]> = {
  sedacion: [
    "CIRCUITO CIRCULAR CERRADO EXPANDIBLE (ADULTO)",
    "CIRCUITO CIRCULAR CERRADO EXPANDIBLE: (NEONATAL)",
    "CIRCUITO CIRCULAR CERRADO EXPANDIBLE CON : (PEDIÁTRICO)",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 0 LONGITUD 50MM",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 1 LONGITUD 60MM",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 2 LONGITUD 70MM",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 3 LONGITUD 80MM",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 4 LONGITUD 90MM",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 5 LONGITUD 100MM",
    "CANULA OROFARINGEA TIPO GUEDEL DE PLASTICO TRANSPARENTE DE LAS SIGUIENTES MEDIDAS: 6 LONGITUD 110MM",
    "ELECTRODOS PARA ELECTROCARDIOGRAMA CON SOPORTE ADHESIVO RECUBIERTOS DE AG E HIDROGEL CONDUCTOR",
    "CATETER PARA VENOCLISIS MEDIDAS: 14G",
    "CATETER PARA VENOCLISIS MEDIDAS: 16G",
    "CATETER PARA VENOCLISIS MEDIDAS: 18G",
    "CATETER PARA VENOCLISIS MEDIDAS: 20G",
    "CATETER PARA VENOCLISIS MEDIDAS: 22G",
    "CATETER PARA VENOCLISIS MEDIDAS: 24G",
    "EQUIPO PARA VENOCLISIS MICROGOTERO",
    "EQUIPO PARA VENOCLISIS NORMOGOTERO",
    "JERINGA DE PLASTICO CON CAPACIDAD DE 10ML CON AGUJA DE 21G",
    "JERINGA DE PLASTICO CON CAPACIDAD DE 20ML SIN AGUJA",
    "JERINGA DE PLASTICO CON CAPACIDAD DE 5ML CON AGUJA 20G",
    "JERINGA DE INSULINA",
    "EQUIPO PARA APLICACIÓN DE VOLUMEN MEDIDO CON CAPACIDAD DE 100ML, PARA LA ADMINISTRACIÓN DE MEDICAMENTOS, CONSTA DE BAYONETA, FILTRO DE AIRE, CAMARA BURETA FLEXIBLE, GRADUADA EN MILIMETROS.",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 1",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 2",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 3",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 4",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 5",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 6",
    "PUNTAS NASALES PARA ADMINISTRACIÓN DE OXIGENO TAMAÑO ADULTO",
    "PUNTAS NASALES PARA ADMINISTRACIÓN DE OXIGENO TAMAÑO PEDIATRICO",
    "SONDA YANKAUER DE PLASTICO DESECHABLE CON CONTROL",
    "SONDA YANKAUER DE PLASTICO DESECHABLE SIN CONTROL",
    "SONDA TIPO NELATON DE PVC CALIBRES: 10FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 12FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 14FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 16FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 18FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 20FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 22FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 24FR",
    "SONDA TIPO NELATON DE PVC CALIBRES: 8FR",
    "SEVOFLURANO. LIQUIDO O SOLUCION CADA ENVASE CONTIENE: SEVOFLURANO 250 ML. ENVASE CON 250 ML DE LÍQUIDO O SOLUCIÓN.",
    "DESFLURANO. LIQUIDO CADA ENVASE CONTIENE: DESFLURANO 240 ML. ENVASE CON 240 ML.",
    "PROPOFOL. EMULSIÓN INYECTABLE CADA AMPOLLETA O FRASCO ÁMPULA CONTIENE: PROPOFOL  200 MG. EN EMULSIÓN CON O SIN EDETATO DISÓDICO (DIHIDRATADO). ENVASE CON 5 AMPOLLETAS O FRASCOS ÁMPULA DE 20 ML.",
    "TIOPENTAL SÓDICO. SOLUCIÓN INYECTABLE CADA FRASCO ÁMPULA CON POLVO CONTIENE: TIOPENTAL SÓDICO 0.5 G ENVASE CON FRASCO ÁMPULA Y DILUYENTE CON 20 ML.",
    "MIDAZOLAM. SOLUCIÓN INYECTABLE CADA AMPOLLETA CONTIENE: CLORHIDRATO DE MIDAZOLAM EQUIVALENTE A 5 MG DE MIDAZOLAM O MIDAZOLAM 5 MG ENVASE CON 5 A",
    "FENTANILO. SOLUCIÓN INYECTABLE CADA AMPOLLETA O FRASCO ÁMPULA CONTIENE: CITRATO DE FENTANILO EQUIVALENTE A 0.5 MG DE FENTANILO. ENVASE CON 6 AMPOLLETAS O FRASCOS ÁMPULA CON 10 ML.",
    "ONDANSETRÓN. SOLUCIÓN INYECTABLE CADA AMPOLLETA O FRASCO AMPULA CONTIENE: CLORHIDRATO DIHIDRATADO DE ONDANSETRÓN EQUIVALENTE A 8 MG DE ONDANSETRÓN ENVASE CON 3 AMPOLLETAS O FRASCOS ÁMPULA CON 4 ML.",
    "METAMIZOL SODICO. SOLUCION INYECTABLE CADA AMPOLLETA CONTIENE: METAMIZOL SÓDICO 1 G. ENVASE CON 3 AMPOLLETAS CON 2 ML.",
    "KETOROLACO SOLUCION INYECTABLE CADA FRASCO ÁMPULA O AMPOLLETA CONTIENE: KETOROLACO-TROMETAMINA 30 MG ENVASE CON 3 FRASCOS ÁMPULA O 3 AMPOLLETAS DE 1 ML.",
    "PARACETAMOL SOLUCIÓN INYECTABLE CADA FRASCO CONTIENE: PARACETAMOL 1 G. ENVASE CON UN FRASCO CON 100",
    "ATROPINA. SOLUCION INYECTABLE CADA AMPOLLETA CONTIENE: SULFATO DE ATROPINA 1 MG. ENVASE CON 50 AMPOLLETAS CON 1 ML.",
    "LIDOCAÍNA EPINEFRINA. SOLUCIÓN INYECTABLE AL 2% CADA FRASCO ÁMPULA CONTIENE: CLORHIDRATO DE LIDOCAÍNA 1 G EPINEFRINA (1:200000) 0.25 MG ENVASE CON 5 FRASCOS ÁMPULA CON 50",
    "LIDOCAÍNA. SOLUCIÓN INYECTABLE AL 2%. CADA FRASCO ÁMPULA CONTIENE: CLORHIDRATO DE LIDOCAÍNA 1 G ENVASE CON 5 FRASCOS ÁMPULA CON 50 ML",
    "LIDOCAÍNA. SOLUCIÓN AL 10%. CADA 100 ML CONTIENE: LIDOCAÍNA 10.0 G ENVASE CON 115 ML CON ATOMIZADOR MANUAL."
  ],
  loco_regional: [
    "ELECTRODOS PARA ELECTROCARDIOGRAMA CON SOPORTE ADHESIVO RECUBIERTOS DE AG E HIDROGEL CONDUCTOR",
    "CATETER PARA VENOCLISIS MEDIDAS: 14G",
    "CATETER PARA VENOCLISIS MEDIDAS: 16G",
    "CATETER PARA VENOCLISIS MEDIDAS: 18G",
    "CATETER PARA VENOCLISIS MEDIDAS: 20G",
    "CATETER PARA VENOCLISIS MEDIDAS: 22G",
    "CATETER PARA VENOCLISIS MEDIDAS: 24G",
    "EQUIPO PARA VENOCLISIS MICROGOTERO",
    "EQUIPO PARA VENOCLISIS NORMOGOTERO",
    "JERINGA DE PLASTICO CON CAPACIDAD DE 10ML CON AGUJA DE 21G",
    "JERINGA DE PLASTICO CON CAPACIDAD DE 20ML SIN AGUJA",
    "JERINGA DE PLASTICO CON CAPACIDAD DE 5ML CON AGUJA 20G",
    "JERINGA DE INSULINA",
    "EQUIPO PARA APLICACIÓN DE VOLUMEN MEDIDO CON CAPACIDAD DE 100ML, PARA LA ADMINISTRACIÓN DE MEDICAMENTOS, CONSTA DE BAYONETA, FILTRO DE AIRE, CAMARA BURETA FLEXIBLE, GRADUADA EN MILIMETROS.",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 1",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 2",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 3",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 4",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 5",
    "MASCARILLA FACIAL PARA ADMINISTRACIÓN DE OXÍGENO CON ALMOHADILLA Y VALVULA PARA INFLADO TAMAÑOS 6",
    "PUNTAS NASALES PARA ADMINISTRACIÓN DE OXIGENO TAMAÑO ADULTO",
    "PUNTAS NASALES PARA ADMINISTRACIÓN DE OXIGENO TAMAÑO PEDIATRICO",
    "GUANTES DE LATEX NATURAL PARA CIRUGIA ESTÉRIL DESECHABLES TALLAS: 6",
    "GUANTES DE LATEX NATURAL PARA CIRUGIA ESTÉRIL DESECHABLES TALLAS: 6.5",
    "GUANTES DE LATEX NATURAL PARA CIRUGIA ESTÉRIL DESECHABLES TALLAS: 7.0",
    "GUANTES DE LATEX NATURAL PARA CIRUGIA ESTÉRIL DESECHABLES TALLAS: 7.5",
    "GUANTES DE LATEX NATURAL PARA CIRUGIA ESTÉRIL DESECHABLES TALLAS: 8.0",
    "GUANTES DE LATEX NATURAL PARA CIRUGIA ESTÉRIL DESECHABLES TALLAS: 8.5",
    "AGUJA WHITACRE PARA RAQUIANESTESIA CON PUNTA TIPO LÁPIZ CALIBRES: 22G LONGITUD 8.7 A 9.1CM",
    "AGUJA WHITACRE PARA RAQUIANESTESIA CON PUNTA TIPO LÁPIZ CALIBRES: 25G LONGITUD 11.6 A 11.9",
    "AGUJA WHITACRE PARA RAQUIANESTESIA CON PUNTA TIPO LÁPIZ CALIBRES: 25G LONGITUD 8.7 A 9.1CM",
    "AGUJA WHITACRE PARA RAQUIANESTESIA CON PUNTA TIPO LÁPIZ CALIBRES: 27G LONGITUD 11.6 A 11.9",
    "AGUJA WHITACRE PARA RAQUIANESTESIA CON PUNTA TIPO LÁPIZ CALIBRES: 27G LONGITUD 8.7 A 9.1CM",
    "CIRCUITO CIRCULAR CERRADO 60 PULGADAS TAMAÑOS ADULTO",
    "CIRCUITO CIRCULAR CERRADO 60 PULGADAS TAMAÑOS PEDIÁTRICO",
    "EQUIPO DE BLOQUEO MIXTO EPIDURAL/DURAL 17/27G ADULTO RAQUIMIX III",
    "EQUIPO DE BLOQUEO MIXTO EPIDURAL/SUBDURAL CALIBRE 17/27 PEDIATRICO RAQUIMIX II",
    "MIDAZOLAM. SOLUCIÓN INYECTABLE CADA AMPOLLETA CONTIENE: CLORHIDRATO DE MIDAZOLAM EQUIVALENTE A 5 MG DE MIDAZOLAM O MIDAZOLAM 5 MG ENVASE CON 5 A",
    "FENTANILO. SOLUCIÓN INYECTABLE CADA AMPOLLETA O FRASCO ÁMPULA CONTIENE: CITRATO DE FENTANILO EQUIVALENTE A 0.5 MG DE FENTANILO. ENVASE CON 6 AMPOLLETAS O FRASCOS ÁMPULA CON 10 ML.",
    "ONDANSETRÓN. SOLUCIÓN INYECTABLE CADA AMPOLLETA O FRASCO AMPULA CONTIENE: CLORHIDRATO DIHIDRATADO DE ONDANSETRÓN EQUIVALENTE A 8 MG DE ONDANSETRÓN ENVASE CON 3 AMPOLLETAS O FRASCOS ÁMPULA CON 4 ML.",
    "METOCLOPRAMIDA. SOLUCIÓN INYECTABLE CADA AMPOLLETA CONTIENE: CLORHIDRATO DE METOCLOPRAMIDA 10 MG ENVASE CON 6 AMPOLLETAS DE 2 ML.",
    "METAMIZOL SODICO. SOLUCION INYECTABLE CADA AMPOLLETA CONTIENE: METAMIZOL SÓDICO 1 G. ENVASE CON 3 AMPOLLETAS CON 2 ML.",
    "KETOROLACO SOLUCION INYECTABLE CADA FRASCO ÁMPULA O AMPOLLETA CONTIENE: KETOROLACO-TROMETAMINA 30 MG ENVASE CON 3 FRASCOS ÁMPULA O 3 AMPOLLETAS DE 1 ML.",
    "PARACETAMOL SOLUCIÓN INYECTABLE CADA FRASCO CONTIENE: PARACETAMOL 1 G. ENVASE CON UN FRASCO CON 100",
    "ATROPINA. SOLUCION INYECTABLE CADA AMPOLLETA CONTIENE: SULFATO DE ATROPINA 1 MG. ENVASE CON 50 AMPOLLETAS CON 1 ML.",
    "LIDOCAÍNA EPINEFRINA. SOLUCIÓN INYECTABLE AL 2% CADA FRASCO ÁMPULA CONTIENE: CLORHIDRATO DE LIDOCAÍNA 1 G EPINEFRINA (1:200000) 0.25 MG ENVASE CON 5 FRASCOS ÁMPULA CON 50",
    "ROPIVACAINA. SOLUCIÓN INYECTABLE CADA AMPOLLETA CONTIENE: CLORHIDRATO DE ROPIVACAÍNA MONOHIDRATADA EQUIVALENTE A 150 MG DE CLORHIDRATO DE ROPIVACAINA. ENVASE CON 5 AMPOLLETAS CON 20 ML.",
    "LIDOCAÍNA. SOLUCIÓN INYECTABLE AL 2%. CADA FRASCO ÁMPULA CONTIENE: CLORHIDRATO DE LIDOCAÍNA 1 G ENVASE CON 5 FRASCOS ÁMPULA CON 50 ML",
    "EFEDRINA. SOLUCIÓN INYECTABLE CADA AMPOLLETA CONTIENE: SULFATO DE EFEDRINA 50 MG ENVASE CON 100 AMPOLLETAS CON 2 ML. (25 MG/ML)",
    "BUPIVACAÍNA  CON GLUCOSA: CADA AMPOLLETA CONTIENE: CLORHIDRATO DE BUPIVACAÍNA 15 MG. DEXTROSA ANHÍDRA O GLUCOSA ANHÍDRA 240 MG."
  ]
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("=== Iniciando poblado completo de insumos ===");

    // 1. Cargar todos los insumos existentes
    const { data: insumosExistentes } = await supabaseClient
      .from("insumos")
      .select("id, nombre");

    const mapaNombresAIds = new Map<string, string>();
    if (insumosExistentes) {
      insumosExistentes.forEach((insumo: { id: string; nombre: string }) => {
        mapaNombresAIds.set(insumo.nombre, insumo.id);
      });
    }

    console.log(`✓ Insumos existentes en BD: ${mapaNombresAIds.size}`);

    // 2. Recopilar todos los nombres únicos
    const todosLosNombres = new Set<string>();
    Object.values(excelDataComplete).forEach(lista => {
      lista.forEach(nombre => todosLosNombres.add(nombre));
    });

    console.log(`✓ Total de nombres únicos en Excel: ${todosLosNombres.size}`);

    // 3. Insertar insumos nuevos en lotes
    const insumosNuevos: string[] = [];
    for (const nombre of todosLosNombres) {
      if (!mapaNombresAIds.has(nombre)) {
        insumosNuevos.push(nombre);
      }
    }

    console.log(`✓ Insumos nuevos a crear: ${insumosNuevos.length}`);

    const BATCH_SIZE = 50;
    let insumosCreados = 0;

    for (let i = 0; i < insumosNuevos.length; i += BATCH_SIZE) {
      const batch = insumosNuevos.slice(i, i + BATCH_SIZE);
      const inserts = batch.map(nombre => ({ nombre, cantidad: 0 }));
      
      const { data: nuevosCreados, error } = await supabaseClient
        .from("insumos")
        .insert(inserts)
        .select("id, nombre");

      if (error) {
        console.error(`✗ Error en batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        continue;
      }

      if (nuevosCreados) {
        nuevosCreados.forEach((insumo: { id: string; nombre: string }) => {
          mapaNombresAIds.set(insumo.nombre, insumo.id);
        });
        insumosCreados += nuevosCreados.length;
      }

      console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} insumos`);
    }

    console.log(`✓ Total insumos creados: ${insumosCreados}`);
    console.log(`✓ Total insumos en mapa: ${mapaNombresAIds.size}`);

    // 4. Limpiar relaciones existentes de sedacion y loco_regional
    console.log("✓ Limpiando relaciones antiguas de sedacion y loco_regional...");
    await supabaseClient
      .from("anestesia_insumos")
      .delete()
      .in("tipo_anestesia", ["sedacion", "loco_regional"]);

    // 5. Poblar todas las relaciones
    const estadisticas: Record<string, { total: number; ejemplos: string[] }> = {};
    let relacionesTotalesCreadas = 0;

    for (const [tipoAnestesia, nombres] of Object.entries(excelDataComplete)) {
      console.log(`\n=== Procesando ${tipoAnestesia}: ${nombres.length} insumos ===`);
      
      const relacionesNuevas = [];
      const ejemplos: string[] = [];

      for (let i = 0; i < nombres.length; i++) {
        const nombre = nombres[i];
        const insumoId = mapaNombresAIds.get(nombre);

        if (!insumoId) {
          console.warn(`✗ No se encontró ID para: ${nombre}`);
          continue;
        }

        relacionesNuevas.push({
          tipo_anestesia: tipoAnestesia,
          insumo_id: insumoId,
          orden: i + 1,
          cantidad_default: 1
        });

        if (i < 5) {
          ejemplos.push(nombre.substring(0, 60) + (nombre.length > 60 ? "..." : ""));
        }
      }

      // Insertar relaciones en lotes
      for (let i = 0; i < relacionesNuevas.length; i += BATCH_SIZE) {
        const batch = relacionesNuevas.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabaseClient
          .from("anestesia_insumos")
          .insert(batch);

        if (error) {
          console.error(`✗ Error en ${tipoAnestesia} batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        } else {
          relacionesTotalesCreadas += batch.length;
        }
      }

      estadisticas[tipoAnestesia] = {
        total: relacionesNuevas.length,
        ejemplos
      };

      console.log(`✓ ${tipoAnestesia}: ${relacionesNuevas.length} relaciones creadas`);
    }

    // 6. Obtener totales finales
    const { count: totalInsumos } = await supabaseClient
      .from("insumos")
      .select("*", { count: "exact", head: true });

    const { count: totalRelaciones } = await supabaseClient
      .from("anestesia_insumos")
      .select("*", { count: "exact", head: true });

    const resumen = {
      success: true,
      totalInsumosEnBD: totalInsumos || 0,
      totalRelacionesEnBD: totalRelaciones || 0,
      insumosCreados,
      relacionesCreadas: relacionesTotalesCreadas,
      porTipoAnestesia: estadisticas
    };

    console.log("\n=== RESUMEN FINAL ===");
    console.log(`✓ Total insumos en BD: ${resumen.totalInsumosEnBD}`);
    console.log(`✓ Total relaciones en BD: ${resumen.totalRelacionesEnBD}`);
    console.log(`✓ Insumos nuevos creados: ${resumen.insumosCreados}`);
    console.log(`✓ Relaciones totales creadas: ${resumen.relacionesCreadas}`);

    return new Response(JSON.stringify(resumen, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("✗ Error general:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: String(error)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
