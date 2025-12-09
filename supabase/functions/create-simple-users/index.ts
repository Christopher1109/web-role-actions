import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserCredential {
  usuario: string;
  password: string;
  role: string;
  hospital: string | null;
  estado: string | null;
}

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

    console.log('Iniciando creación de usuarios con credenciales simples...');

    // Obtener todos los usuarios de la tabla users
    const { data: usersFromTable, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('role');

    if (fetchError) {
      throw new Error(`Error al obtener usuarios: ${fetchError.message}`);
    }

    if (!usersFromTable || usersFromTable.length === 0) {
      throw new Error('No hay usuarios en la tabla users');
    }

    console.log(`Encontrados ${usersFromTable.length} usuarios para crear`);

    const credentials: UserCredential[] = [];
    const errors: any[] = [];
    let created = 0;
    let skipped = 0;

    // Mapeo de roles
    const roleMapping: Record<string, string> = {
      'gerente_operaciones': 'gerente_operaciones',
      'supervisor': 'supervisor',
      'lider': 'lider',
      'almacenista': 'almacenista',
      'auxiliar': 'auxiliar'
    };

    // Contraseñas simples por rol
    const passwordMapping: Record<string, string> = {
      'gerente_operaciones': 'Gerente123',
      'supervisor': 'Supervisor123',
      'lider': 'Lider123',
      'almacenista': 'Almacen123',
      'auxiliar': 'Auxiliar123'
    };

    // Función para extraer número de hospital del display_name
    const extractHospitalNumber = (displayName: string | null): string => {
      if (!displayName) return '';
      // Extrae el número y las primeras letras del tipo de hospital
      // Ej: "HGZ 30 Mexicali" -> "HGZ30"
      const match = displayName.match(/^([A-Z]+)\s*(\d+)/i);
      if (match) {
        return `${match[1]}${match[2]}`;
      }
      return displayName.replace(/\s+/g, '').substring(0, 10);
    };

    // Función para crear username simple
    const createSimpleUsername = (user: any): string => {
      const role = user.role;
      const hospitalCode = extractHospitalNumber(user.hospital_display_name);
      
      if (role === 'gerente_operaciones') {
        return 'GerenteOps';
      }
      
      if (role === 'supervisor') {
        // Usar el número de grupo si existe
        const group = user.supervisor_group || 1;
        const stateShort = user.state_name?.split(' ')[0]?.substring(0, 3) || '';
        return `Supervisor_${stateShort}${group}`;
      }
      
      // Para otros roles: Rol_TipoHospitalNumero
      const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
      return `${roleCapitalized}_${hospitalCode}`;
    };

    for (const user of usersFromTable) {
      try {
        const simpleUsername = createSimpleUsername(user);
        const email = `${simpleUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}@imss.local`;
        const password = passwordMapping[user.role] || 'Usuario123';
        
        console.log(`Procesando: ${user.username} -> ${simpleUsername}`);

        // Verificar si el usuario ya existe por email
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users?.some(u => u.email === email);

        if (userExists) {
          console.log(`Usuario ya existe: ${simpleUsername}`);
          skipped++;
          credentials.push({
            usuario: simpleUsername,
            password,
            role: user.role,
            hospital: user.hospital_display_name,
            estado: user.state_name
          });
          continue;
        }

        // Crear usuario en auth.users
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nombre_completo: simpleUsername,
            role: user.role,
            state_name: user.state_name,
            hospital_display_name: user.hospital_display_name,
            hospital_budget_code: user.hospital_budget_code
          }
        });

        if (authError) {
          console.error(`Error creando usuario ${simpleUsername}:`, authError);
          errors.push({ usuario: simpleUsername, error: authError.message });
          continue;
        }

        if (!authUser?.user) {
          console.error(`No se pudo crear usuario ${simpleUsername}`);
          errors.push({ usuario: simpleUsername, error: 'No user returned' });
          continue;
        }

        console.log(`Usuario creado en auth: ${simpleUsername}`);

        // Buscar hospital_id basado en budget_code
        let hospitalId = null;
        if (user.hospital_budget_code) {
          const { data: hospital } = await supabaseAdmin
            .from('hospitales')
            .select('id')
            .eq('budget_code', user.hospital_budget_code)
            .single();
          hospitalId = hospital?.id || null;
        }

        // Crear perfil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authUser.user.id,
            nombre: simpleUsername,
            hospital_id: hospitalId
          });

        if (profileError) {
          console.error(`Error creando perfil para ${simpleUsername}:`, profileError);
        }

        // Asignar rol en user_roles
        const appRole = roleMapping[user.role] || 'auxiliar';
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authUser.user.id,
            role: appRole
          });

        if (roleError) {
          console.error(`Error asignando rol para ${simpleUsername}:`, roleError);
        }

        created++;
        credentials.push({
          usuario: simpleUsername,
          password,
          role: user.role,
          hospital: user.hospital_display_name,
          estado: user.state_name
        });

        console.log(`Usuario completado: ${simpleUsername}`);

      } catch (error) {
        console.error(`Error procesando usuario ${user.username}:`, error);
        errors.push({ 
          usuario: user.username, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    }

    console.log(`Proceso completado: ${created} creados, ${skipped} ya existían, ${errors.length} errores`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: usersFromTable.length,
          created,
          skipped,
          errors: errors.length
        },
        credentials,
        errors: errors.length > 0 ? errors : undefined,
        message: `Se procesaron ${usersFromTable.length} usuarios: ${created} creados, ${skipped} ya existían`
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
