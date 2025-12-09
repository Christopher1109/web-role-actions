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

    console.log('=== INICIANDO RECREACIÓN COMPLETA DE USUARIOS ===');

    // 1. Obtener todos los usuarios de la tabla users
    const { data: usersFromTable, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('state_name, role');

    if (fetchError) throw new Error(`Error obteniendo users: ${fetchError.message}`);
    console.log(`Total usuarios en tabla users: ${usersFromTable?.length || 0}`);

    // 2. Obtener todos los hospitales
    const { data: hospitales } = await supabaseAdmin
      .from('hospitales')
      .select('id, budget_code, display_name');

    const hospitalMap = new Map<string, string>();
    hospitales?.forEach(h => {
      if (h.budget_code) hospitalMap.set(h.budget_code, h.id);
    });
    console.log(`Hospitales mapeados: ${hospitalMap.size}`);

    // 3. Obtener usuarios existentes en auth (con paginación)
    let allAuthUsers: any[] = [];
    let page = 0;
    const perPage = 1000;
    
    while (true) {
      const { data: authPage } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      });
      
      if (!authPage?.users || authPage.users.length === 0) break;
      allAuthUsers = allAuthUsers.concat(authPage.users);
      console.log(`Página ${page}: ${authPage.users.length} usuarios auth`);
      
      if (authPage.users.length < perPage) break;
      page++;
    }
    
    console.log(`Total usuarios en auth: ${allAuthUsers.length}`);

    // Crear mapa de emails existentes
    const existingEmails = new Set(allAuthUsers.map(u => u.email?.toLowerCase()));

    // Mapeo de contraseñas por rol
    const passwordMapping: Record<string, string> = {
      'gerente_operaciones': 'Gerente123',
      'supervisor': 'Supervisor123',
      'lider': 'Lider123',
      'almacenista': 'Almacen123',
      'auxiliar': 'Auxiliar123'
    };

    // Mapeo de roles
    const roleMapping: Record<string, string> = {
      'gerente_operaciones': 'gerente_operaciones',
      'supervisor': 'supervisor',
      'lider': 'lider',
      'almacenista': 'almacenista',
      'auxiliar': 'auxiliar'
    };

    const extractHospitalCode = (displayName: string | null): string => {
      if (!displayName) return '';
      const match = displayName.match(/^([A-Z]+)\s*(\d+)/i);
      if (match) return `${match[1]}${match[2]}`;
      return displayName.replace(/\s+/g, '').substring(0, 10);
    };

    const createUsername = (user: any): string => {
      const role = user.role;
      const hospitalCode = extractHospitalCode(user.hospital_display_name);
      
      if (role === 'gerente_operaciones') return 'GerenteOps';
      if (role === 'supervisor') {
        const group = user.supervisor_group || 1;
        const stateShort = user.state_name?.split(' ')[0]?.substring(0, 3) || '';
        return `Supervisor_${stateShort}${group}`;
      }
      
      const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
      return `${roleCapitalized}_${hospitalCode}`;
    };

    let created = 0;
    let skipped = 0;
    let updated = 0;
    const errors: any[] = [];
    const credentials: any[] = [];

    for (const user of usersFromTable || []) {
      try {
        const username = createUsername(user);
        const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@imss.local`;
        const password = passwordMapping[user.role] || 'Usuario123';
        const hospitalId = user.hospital_budget_code ? hospitalMap.get(user.hospital_budget_code) : null;
        const appRole = roleMapping[user.role] || 'auxiliar';

        // Verificar si ya existe
        if (existingEmails.has(email.toLowerCase())) {
          // Buscar el usuario y actualizar su perfil
          const existingUser = allAuthUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
          
          if (existingUser && hospitalId) {
            // Actualizar perfil con hospital
            await supabaseAdmin
              .from('profiles')
              .upsert({
                id: existingUser.id,
                nombre: username,
                hospital_id: hospitalId
              }, { onConflict: 'id' });
            updated++;
          } else {
            skipped++;
          }
          
          credentials.push({
            usuario: username,
            email,
            password,
            role: user.role,
            hospital: user.hospital_display_name,
            estado: user.state_name,
            status: 'existente'
          });
          continue;
        }

        // Crear nuevo usuario
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nombre_completo: username,
            role: user.role,
            state_name: user.state_name,
            hospital_display_name: user.hospital_display_name,
            hospital_budget_code: user.hospital_budget_code
          }
        });

        if (authError) {
          errors.push({ usuario: username, error: authError.message });
          continue;
        }

        if (!authUser?.user) {
          errors.push({ usuario: username, error: 'No user returned' });
          continue;
        }

        // Crear perfil
        await supabaseAdmin.from('profiles').upsert({
          id: authUser.user.id,
          nombre: username,
          hospital_id: hospitalId
        }, { onConflict: 'id' });

        // Asignar rol
        await supabaseAdmin.from('user_roles').upsert({
          user_id: authUser.user.id,
          role: appRole
        }, { onConflict: 'user_id' });

        created++;
        credentials.push({
          usuario: username,
          email,
          password,
          role: user.role,
          hospital: user.hospital_display_name,
          estado: user.state_name,
          status: 'creado'
        });

        console.log(`Creado: ${username} -> ${email}`);

      } catch (error) {
        errors.push({ 
          usuario: user.username, 
          error: error instanceof Error ? error.message : 'Error' 
        });
      }
    }

    console.log(`=== RESUMEN ===`);
    console.log(`Creados: ${created}, Actualizados: ${updated}, Omitidos: ${skipped}, Errores: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: usersFromTable?.length, created, updated, skipped, errors: errors.length },
        credentials,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
