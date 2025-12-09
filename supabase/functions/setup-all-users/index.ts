import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UNIVERSAL_PASSWORD = 'Imss2024!';

interface UserToCreate {
  username: string;
  email: string;
  role: string;
  nombre: string;
  hospital_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🚀 Starting user setup...');

    // 1. Get all hospitals grouped by state
    const { data: hospitales, error: hospError } = await supabaseAdmin
      .from('hospitales')
      .select('id, display_name, state_id')
      .order('display_name');

    if (hospError) throw hospError;

    console.log(`📊 Found ${hospitales?.length || 0} hospitals`);

    // Group hospitals by state_id
    const hospitalsByState: Record<string, typeof hospitales> = {};
    for (const h of hospitales || []) {
      if (!h.state_id) continue;
      if (!hospitalsByState[h.state_id]) {
        hospitalsByState[h.state_id] = [];
      }
      hospitalsByState[h.state_id].push(h);
    }

    // 2. Delete existing auth users (except system users)
    console.log('🗑️ Cleaning existing users...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let deletedCount = 0;
    
    for (const user of existingUsers?.users || []) {
      // Keep only essential users if needed
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        deletedCount++;
      } catch (e) {
        console.log(`Could not delete user ${user.email}: ${e}`);
      }
    }
    console.log(`🗑️ Deleted ${deletedCount} existing users`);

    // 3. Clean profiles and user_roles tables
    await supabaseAdmin.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('🧹 Cleaned profiles and user_roles tables');

    const usersToCreate: UserToCreate[] = [];
    let auxiliarNum = 1;
    let liderNum = 1;
    let almacenistaNum = 1;
    let supervisorNum = 1;

    // 4. Create users per hospital (auxiliar, lider, almacenista)
    for (const hospital of hospitales || []) {
      // Auxiliar
      usersToCreate.push({
        username: `auxiliar${String(auxiliarNum).padStart(2, '0')}`,
        email: `auxiliar${String(auxiliarNum).padStart(2, '0')}@sistema.local`,
        role: 'auxiliar',
        nombre: `Auxiliar ${hospital.display_name?.substring(0, 20) || auxiliarNum}`,
        hospital_ids: [hospital.id]
      });
      auxiliarNum++;

      // Líder
      usersToCreate.push({
        username: `lider${String(liderNum).padStart(2, '0')}`,
        email: `lider${String(liderNum).padStart(2, '0')}@sistema.local`,
        role: 'lider',
        nombre: `Líder ${hospital.display_name?.substring(0, 20) || liderNum}`,
        hospital_ids: [hospital.id]
      });
      liderNum++;

      // Almacenista
      usersToCreate.push({
        username: `almacenista${String(almacenistaNum).padStart(2, '0')}`,
        email: `almacenista${String(almacenistaNum).padStart(2, '0')}@sistema.local`,
        role: 'almacenista',
        nombre: `Almacenista ${hospital.display_name?.substring(0, 20) || almacenistaNum}`,
        hospital_ids: [hospital.id]
      });
      almacenistaNum++;
    }

    // 5. Create supervisors (1 per 4 hospitals in same state)
    for (const [stateId, stateHospitals] of Object.entries(hospitalsByState)) {
      const numSupervisors = Math.ceil(stateHospitals.length / 4);
      
      for (let i = 0; i < numSupervisors; i++) {
        const assignedHospitals = stateHospitals.slice(i * 4, (i + 1) * 4);
        
        usersToCreate.push({
          username: `supervisor${String(supervisorNum).padStart(2, '0')}`,
          email: `supervisor${String(supervisorNum).padStart(2, '0')}@sistema.local`,
          role: 'supervisor',
          nombre: `Supervisor Zona ${supervisorNum}`,
          hospital_ids: assignedHospitals.map(h => h.id)
        });
        supervisorNum++;
      }
    }

    // 6. Create global roles (access to all hospitals)
    const allHospitalIds = (hospitales || []).map(h => h.id);

    // Gerente de Operaciones
    usersToCreate.push({
      username: 'operaciones01',
      email: 'operaciones01@sistema.local',
      role: 'gerente_operaciones',
      nombre: 'Gerente de Operaciones',
      hospital_ids: allHospitalIds
    });

    // Gerente de Almacén
    usersToCreate.push({
      username: 'almacen_gral01',
      email: 'almacen_gral01@sistema.local',
      role: 'gerente_almacen',
      nombre: 'Gerente de Almacén',
      hospital_ids: allHospitalIds
    });

    // Cadena de Suministros
    usersToCreate.push({
      username: 'suministros01',
      email: 'suministros01@sistema.local',
      role: 'cadena_suministros',
      nombre: 'Cadena de Suministros',
      hospital_ids: allHospitalIds
    });

    console.log(`📝 Will create ${usersToCreate.length} users...`);

    // 7. Create all users
    const createdUsers: { username: string; role: string; status: string }[] = [];
    const errors: { username: string; error: string }[] = [];

    for (const user of usersToCreate) {
      try {
        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: UNIVERSAL_PASSWORD,
          email_confirm: true,
          user_metadata: { 
            username: user.username,
            nombre_completo: user.nombre, 
            role: user.role 
          }
        });

        if (authError) {
          errors.push({ username: user.username, error: authError.message });
          continue;
        }

        if (authUser?.user) {
          // Create profile with username
          const { error: profileError } = await supabaseAdmin.from('profiles').insert({
            id: authUser.user.id,
            nombre: user.nombre,
            username: user.username,
            hospital_id: user.hospital_ids[0] || null
          });

          if (profileError) {
            console.log(`Profile error for ${user.username}: ${profileError.message}`);
          }

          // Assign role
          const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
            user_id: authUser.user.id,
            role: user.role
          });

          if (roleError) {
            console.log(`Role error for ${user.username}: ${roleError.message}`);
          }

          createdUsers.push({ 
            username: user.username, 
            role: user.role, 
            status: 'created' 
          });
        }
      } catch (err) {
        errors.push({ 
          username: user.username, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    console.log(`✅ Created ${createdUsers.length} users`);
    console.log(`❌ ${errors.length} errors`);

    // Summary by role
    const summary = {
      auxiliar: createdUsers.filter(u => u.role === 'auxiliar').length,
      lider: createdUsers.filter(u => u.role === 'lider').length,
      almacenista: createdUsers.filter(u => u.role === 'almacenista').length,
      supervisor: createdUsers.filter(u => u.role === 'supervisor').length,
      gerente_operaciones: createdUsers.filter(u => u.role === 'gerente_operaciones').length,
      gerente_almacen: createdUsers.filter(u => u.role === 'gerente_almacen').length,
      cadena_suministros: createdUsers.filter(u => u.role === 'cadena_suministros').length,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${createdUsers.length} users`,
        password: UNIVERSAL_PASSWORD,
        summary,
        users: createdUsers.slice(0, 50), // First 50 for reference
        errors: errors.slice(0, 10) // First 10 errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
