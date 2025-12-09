import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UNIVERSAL_PASSWORD = 'Imss2024!';

interface Hospital {
  id: string;
  display_name: string;
  budget_code: string;
  state_id: string;
  state_name?: string;
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

    // Get all hospitals with state info
    const { data: hospitalesRaw, error: hospError } = await supabaseAdmin
      .from('hospitales')
      .select('id, display_name, budget_code, state_id')
      .order('display_name');

    if (hospError) throw hospError;

    const { data: states } = await supabaseAdmin.from('states').select('id, name');

    const stateMap: Record<string, string> = {};
    for (const s of states || []) {
      stateMap[s.id] = s.name;
    }

    const hospitales: Hospital[] = (hospitalesRaw || []).map(h => ({
      ...h,
      state_name: stateMap[h.state_id] || 'Sin Estado'
    }));

    console.log(`📊 Found ${hospitales.length} hospitals`);

    // Group by state
    const hospitalsByState: Record<string, Hospital[]> = {};
    for (const h of hospitales) {
      if (!h.state_id) continue;
      if (!hospitalsByState[h.state_id]) hospitalsByState[h.state_id] = [];
      hospitalsByState[h.state_id].push(h);
    }

    // Clean existing data
    console.log('🗑️ Cleaning...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    for (const user of existingUsers?.users || []) {
      try { await supabaseAdmin.auth.admin.deleteUser(user.id); } catch {}
    }
    await supabaseAdmin.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('users').delete().neq('id', 0);

    let createdCount = 0;
    const errors: string[] = [];

    // Helper function to create a user
    async function createUser(
      username: string, 
      role: string, 
      nombre: string, 
      primaryHospital: Hospital | null,
      assignedHospitals: Hospital[]
    ) {
      try {
        const email = `${username}@sistema.local`;
        
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: UNIVERSAL_PASSWORD,
          email_confirm: true,
          user_metadata: { username, nombre_completo: nombre, role }
        });

        if (authError || !authUser?.user) {
          errors.push(`${username}: ${authError?.message || 'No user created'}`);
          return false;
        }

        // Insert profile
        await supabaseAdmin.from('profiles').insert({
          id: authUser.user.id,
          nombre,
          username,
          hospital_id: primaryHospital?.id || null
        });

        // Insert role
        await supabaseAdmin.from('user_roles').insert({
          user_id: authUser.user.id,
          role
        });

        // Insert into users table
        await supabaseAdmin.from('users').insert({
          username,
          role,
          state_name: primaryHospital?.state_name || null,
          hospital_budget_code: primaryHospital?.budget_code || null,
          hospital_display_name: primaryHospital?.display_name || null,
          assigned_hospitals: assignedHospitals.length > 1 
            ? assignedHospitals.map(h => h.budget_code).join(',') 
            : null
        });

        createdCount++;
        return true;
      } catch (e) {
        errors.push(`${username}: ${e}`);
        return false;
      }
    }

    // Create hospital-level users
    let auxNum = 1, liderNum = 1, almNum = 1;
    
    for (const hospital of hospitales) {
      await createUser(`auxiliar${String(auxNum++).padStart(2, '0')}`, 'auxiliar', 
        `Auxiliar ${hospital.display_name?.substring(0, 15)}`, hospital, [hospital]);
      
      await createUser(`lider${String(liderNum++).padStart(2, '0')}`, 'lider', 
        `Líder ${hospital.display_name?.substring(0, 15)}`, hospital, [hospital]);
      
      await createUser(`almacenista${String(almNum++).padStart(2, '0')}`, 'almacenista', 
        `Almacenista ${hospital.display_name?.substring(0, 15)}`, hospital, [hospital]);
    }

    console.log(`✅ Created ${createdCount} hospital users`);

    // Create supervisors (1 per 4 hospitals per state)
    let supNum = 1;
    for (const [stateId, stateHospitals] of Object.entries(hospitalsByState)) {
      const numSups = Math.ceil(stateHospitals.length / 4);
      const stateName = stateMap[stateId] || 'Zona';
      
      for (let i = 0; i < numSups; i++) {
        const assigned = stateHospitals.slice(i * 4, (i + 1) * 4);
        await createUser(
          `supervisor${String(supNum++).padStart(2, '0')}`, 
          'supervisor', 
          `Supervisor ${stateName} Z${i + 1}`,
          assigned[0],
          assigned
        );
      }
    }

    console.log(`✅ Created supervisors, total: ${createdCount}`);

    // Create global roles
    await createUser('operaciones01', 'gerente_operaciones', 'Gerente de Operaciones', null, hospitales);
    await createUser('almacen_gral01', 'gerente_almacen', 'Gerente de Almacén', null, hospitales);
    await createUser('suministros01', 'cadena_suministros', 'Cadena de Suministros', null, hospitales);

    console.log(`✅ Total created: ${createdCount}`);

    return new Response(JSON.stringify({
      success: true,
      created: createdCount,
      password: UNIVERSAL_PASSWORD,
      summary: {
        hospitales: hospitales.length,
        auxiliares: hospitales.length,
        lideres: hospitales.length,
        almacenistas: hospitales.length,
        supervisores: Object.values(hospitalsByState).reduce((acc, hs) => acc + Math.ceil(hs.length / 4), 0),
        globales: 3
      },
      testUsers: [
        { user: 'auxiliar01', pass: UNIVERSAL_PASSWORD, hospital: hospitales[0]?.display_name },
        { user: 'lider01', pass: UNIVERSAL_PASSWORD, hospital: hospitales[0]?.display_name },
        { user: 'supervisor01', pass: UNIVERSAL_PASSWORD, zona: '4 hospitales' },
        { user: 'operaciones01', pass: UNIVERSAL_PASSWORD, acceso: 'Todos' },
        { user: 'almacen_gral01', pass: UNIVERSAL_PASSWORD, acceso: 'Todos' },
        { user: 'suministros01', pass: UNIVERSAL_PASSWORD, acceso: 'Todos' },
      ],
      errors: errors.slice(0, 5)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
