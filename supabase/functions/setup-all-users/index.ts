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

async function setupAllUsers() {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log('🚀 Starting background user setup...');

  // Get all hospitals with state info
  const { data: hospitalesRaw } = await supabaseAdmin
    .from('hospitales')
    .select('id, display_name, budget_code, state_id')
    .order('display_name');

  const { data: states } = await supabaseAdmin.from('states').select('id, name');

  const stateMap: Record<string, string> = {};
  for (const s of states || []) stateMap[s.id] = s.name;

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
  console.log('🗑️ Cleaning existing data...');
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  for (const user of existingUsers?.users || []) {
    try { await supabaseAdmin.auth.admin.deleteUser(user.id); } catch {}
  }
  await supabaseAdmin.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('users').delete().neq('id', 0);
  console.log('🧹 Cleaned all tables');

  let created = 0, errors = 0;

  async function createUser(
    username: string, role: string, nombre: string, 
    primaryHospital: Hospital | null, assignedHospitals: Hospital[]
  ) {
    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: `${username}@sistema.local`,
        password: UNIVERSAL_PASSWORD,
        email_confirm: true,
        user_metadata: { username, nombre_completo: nombre, role }
      });

      if (authError || !authUser?.user) {
        console.log(`❌ ${username}: ${authError?.message}`);
        errors++;
        return;
      }

      await supabaseAdmin.from('profiles').insert({
        id: authUser.user.id, nombre, username,
        hospital_id: primaryHospital?.id || null
      });

      await supabaseAdmin.from('user_roles').insert({
        user_id: authUser.user.id, role
      });

      await supabaseAdmin.from('users').insert({
        username, role,
        state_name: primaryHospital?.state_name || null,
        hospital_budget_code: primaryHospital?.budget_code || null,
        hospital_display_name: primaryHospital?.display_name || null,
        assigned_hospitals: assignedHospitals.length > 1 
          ? assignedHospitals.map(h => h.budget_code).join(',') : null
      });

      created++;
      if (created % 25 === 0) console.log(`✅ Progress: ${created} users created`);
    } catch (e) {
      console.log(`❌ ${username}: ${e}`);
      errors++;
    }
  }

  // Create hospital users
  let num = 1;
  for (const hospital of hospitales) {
    const pad = String(num).padStart(2, '0');
    await createUser(`auxiliar${pad}`, 'auxiliar', `Auxiliar ${hospital.display_name?.substring(0, 15)}`, hospital, [hospital]);
    await createUser(`lider${pad}`, 'lider', `Líder ${hospital.display_name?.substring(0, 15)}`, hospital, [hospital]);
    await createUser(`almacenista${pad}`, 'almacenista', `Almacenista ${hospital.display_name?.substring(0, 15)}`, hospital, [hospital]);
    num++;
  }

  console.log(`✅ Hospital users done: ${created}`);

  // Supervisors
  let supNum = 1;
  for (const [stateId, stateHospitals] of Object.entries(hospitalsByState)) {
    const numSups = Math.ceil(stateHospitals.length / 4);
    const stateName = stateMap[stateId] || 'Zona';
    for (let i = 0; i < numSups; i++) {
      const assigned = stateHospitals.slice(i * 4, (i + 1) * 4);
      await createUser(`supervisor${String(supNum++).padStart(2, '0')}`, 'supervisor', 
        `Supervisor ${stateName} Z${i + 1}`, assigned[0], assigned);
    }
  }

  console.log(`✅ Supervisors done: ${created}`);

  // Global roles
  await createUser('operaciones01', 'gerente_operaciones', 'Gerente de Operaciones', null, hospitales);
  await createUser('almacen_gral01', 'gerente_almacen', 'Gerente de Almacén', null, hospitales);
  await createUser('suministros01', 'cadena_suministros', 'Cadena de Suministros', null, hospitales);

  console.log(`🎉 COMPLETED: ${created} users created, ${errors} errors`);
}

declare const EdgeRuntime: { waitUntil: (promise: Promise<void>) => void };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Start background task
  EdgeRuntime.waitUntil(setupAllUsers());
  // Return immediately
  return new Response(JSON.stringify({
    success: true,
    message: 'Setup iniciado en background. Revisa los logs para ver el progreso.',
    password: UNIVERSAL_PASSWORD,
    expectedUsers: {
      auxiliares: 68,
      lideres: 68,
      almacenistas: 68,
      supervisores: '~17-20',
      globales: 3,
      total: '~224'
    },
    testCredentials: [
      { user: 'auxiliar01', pass: UNIVERSAL_PASSWORD },
      { user: 'lider01', pass: UNIVERSAL_PASSWORD },
      { user: 'almacenista01', pass: UNIVERSAL_PASSWORD },
      { user: 'supervisor01', pass: UNIVERSAL_PASSWORD },
      { user: 'operaciones01', pass: UNIVERSAL_PASSWORD },
      { user: 'almacen_gral01', pass: UNIVERSAL_PASSWORD },
      { user: 'suministros01', pass: UNIVERSAL_PASSWORD },
    ]
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
