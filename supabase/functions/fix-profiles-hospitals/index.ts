import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Iniciando corrección de hospitales en perfiles...');

    // Obtener todos los usuarios de auth con su metadata
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Error al obtener usuarios de auth: ${authError.message}`);
    }

    console.log(`Encontrados ${authUsers?.users?.length || 0} usuarios en auth`);

    // Obtener todos los hospitales para mapear budget_code a id
    const { data: hospitales, error: hospError } = await supabaseAdmin
      .from('hospitales')
      .select('id, budget_code, display_name');

    if (hospError) {
      throw new Error(`Error al obtener hospitales: ${hospError.message}`);
    }

    // Crear mapa de budget_code a hospital_id
    const hospitalMap = new Map<string, string>();
    hospitales?.forEach(h => {
      if (h.budget_code) {
        hospitalMap.set(h.budget_code, h.id);
      }
    });

    console.log(`Hospitales mapeados: ${hospitalMap.size}`);

    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const user of authUsers?.users || []) {
      try {
        const budgetCode = user.user_metadata?.hospital_budget_code;
        const hospitalId = budgetCode ? hospitalMap.get(budgetCode) : null;

        if (!hospitalId) {
          console.log(`Usuario ${user.email} sin budget_code o hospital no encontrado`);
          skipped++;
          continue;
        }

        // Verificar si existe perfil
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, hospital_id')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          // Actualizar perfil existente
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ hospital_id: hospitalId })
            .eq('id', user.id);

          if (updateError) {
            console.error(`Error actualizando perfil ${user.email}:`, updateError);
            errors.push({ email: user.email, error: updateError.message });
            continue;
          }
        } else {
          // Crear perfil si no existe
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: user.id,
              nombre: user.user_metadata?.nombre_completo || user.email?.split('@')[0] || 'Usuario',
              hospital_id: hospitalId
            });

          if (insertError) {
            console.error(`Error creando perfil ${user.email}:`, insertError);
            errors.push({ email: user.email, error: insertError.message });
            continue;
          }
        }

        console.log(`Perfil actualizado: ${user.email} -> hospital ${hospitalId}`);
        updated++;

      } catch (error) {
        console.error(`Error procesando ${user.email}:`, error);
        errors.push({ 
          email: user.email, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    }

    console.log(`Proceso completado: ${updated} actualizados, ${skipped} omitidos, ${errors.length} errores`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: authUsers?.users?.length || 0,
          updated,
          skipped,
          errors: errors.length
        },
        errors: errors.length > 0 ? errors : undefined,
        message: `Se procesaron los perfiles: ${updated} actualizados, ${skipped} omitidos`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error general:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
