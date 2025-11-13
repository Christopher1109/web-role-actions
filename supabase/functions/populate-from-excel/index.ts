import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExcelRow {
  Nombre_Usuario: string;
  Rol: string;
  Estado: string;
  Hospital: string;
  Hospitales_Asignados: string;
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

    const { data: excelData } = await req.json();

    if (!excelData || !Array.isArray(excelData)) {
      throw new Error('Invalid data format. Expected array of Excel rows.');
    }

    console.log(`Processing ${excelData.length} rows from Excel`);

    // 1. Create empresa (Grupo CB)
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({ nombre: 'Grupo CB', codigo: 'CB' })
      .select()
      .single();

    if (empresaError) throw empresaError;
    console.log('Empresa created:', empresa.id);

    // 2. Extract unique estados and create them
    const estadosSet = new Set<string>();
    excelData.forEach((row: ExcelRow) => {
      if (row.Estado && row.Estado !== 'Todos') {
        estadosSet.add(row.Estado);
      }
    });

    const estadosMap = new Map<string, string>();
    for (const estadoNombre of estadosSet) {
      const codigo = estadoNombre.substring(0, 3).toUpperCase();
      const { data: estado, error: estadoError } = await supabaseAdmin
        .from('estados')
        .insert({
          nombre: estadoNombre,
          codigo: codigo,
          empresa_id: empresa.id
        })
        .select()
        .single();

      if (estadoError) throw estadoError;
      estadosMap.set(estadoNombre, estado.id);
      console.log(`Estado created: ${estadoNombre} (${estado.id})`);
    }

    // 3. Extract unique hospitales and create them
    const hospitalesMap = new Map<string, { id: string, estado: string }>();
    for (const row of excelData) {
      if (row.Hospital && row.Hospital !== 'Todos' && !hospitalesMap.has(row.Hospital)) {
        const estadoId = estadosMap.get(row.Estado);
        if (!estadoId) continue;

        const { data: hospital, error: hospitalError } = await supabaseAdmin
          .from('hospitales')
          .insert({
            nombre: row.Hospital,
            codigo: row.Hospital.substring(0, 10).toUpperCase().replace(/\s/g, ''),
            estado_id: estadoId
          })
          .select()
          .single();

        if (hospitalError) throw hospitalError;
        hospitalesMap.set(row.Hospital, { id: hospital.id, estado: row.Estado });
        
        // Create unidades for this hospital
        await supabaseAdmin.from('unidades').insert([
          {
            nombre: 'Quirófano',
            codigo: 'QX',
            tipo: 'quirofano',
            hospital_id: hospital.id
          },
          {
            nombre: 'Almacén',
            codigo: 'ALM',
            tipo: 'almacen',
            hospital_id: hospital.id
          }
        ]);

        console.log(`Hospital created: ${row.Hospital} (${hospital.id})`);
      }
    }

    // 4. Create users
    const createdUsers = [];
    
    for (const row of excelData) {
      const email = generateEmail(row);
      const password = 'imss2024';
      
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nombre_completo: row.Nombre_Usuario
        }
      });

      if (authError) {
        console.error(`Error creating user ${email}:`, authError);
        continue;
      }

      console.log(`User created: ${email} (${authUser.user.id})`);

      // Determine role and scope
      const roleInfo = determineRoleAndScope(row, estadosMap, hospitalesMap, empresa.id);
      
      // Create profile
      const hospitalId = row.Hospital && row.Hospital !== 'Todos' 
        ? hospitalesMap.get(row.Hospital)?.id 
        : null;

      await supabaseAdmin.from('profiles').upsert({
        id: authUser.user.id,
        nombre_completo: row.Nombre_Usuario,
        unidad: row.Hospital || 'Central',
        hospital_id: hospitalId
      });

      // Create user role
      await supabaseAdmin.from('user_roles').insert({
        user_id: authUser.user.id,
        role: roleInfo.role,
        alcance: roleInfo.alcance,
        hospital_id: roleInfo.hospital_id,
        estado_id: roleInfo.estado_id,
        empresa_id: roleInfo.empresa_id
      });

      createdUsers.push({
        nombre: row.Nombre_Usuario,
        email: email,
        password: password,
        rol: row.Rol,
        estado: row.Estado,
        hospital: row.Hospital,
        hospitales_asignados: row.Hospitales_Asignados || row.Hospital
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${createdUsers.length} usuarios creados exitosamente`,
        users: createdUsers,
        summary: {
          empresa: empresa.nombre,
          estados: estadosMap.size,
          hospitales: hospitalesMap.size,
          usuarios: createdUsers.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateEmail(row: ExcelRow): string {
  const rol = row.Rol.toLowerCase();
  const estado = row.Estado.toLowerCase().replace(/\s+/g, '-');
  const hospital = row.Hospital ? row.Hospital.toLowerCase().replace(/\s+/g, '-') : '';
  
  if (rol.includes('gerente de operaciones')) {
    return 'gerente.operaciones@imss.mx';
  } else if (rol.includes('supervisor')) {
    const match = row.Nombre_Usuario.match(/Supervisor (.+) (\d+)/);
    const numero = match ? match[2] : '1';
    return `supervisor.${estado}.${numero}@imss.mx`;
  } else if (rol.includes('líder')) {
    return `lider.${estado}.${hospital}@imss.mx`;
  } else if (rol.includes('auxiliar')) {
    return `auxiliar.${estado}.${hospital}@imss.mx`;
  } else if (rol.includes('almacenista')) {
    return `almacenista.${estado}.${hospital}@imss.mx`;
  }
  
  return `${rol}.${estado}@imss.mx`;
}

function determineRoleAndScope(
  row: ExcelRow,
  estadosMap: Map<string, string>,
  hospitalesMap: Map<string, { id: string, estado: string }>,
  empresaId: string
): {
  role: string;
  alcance: string;
  hospital_id: string | null;
  estado_id: string | null;
  empresa_id: string | null;
} {
  const rol = row.Rol.toLowerCase();
  
  if (rol.includes('gerente de operaciones')) {
    return {
      role: 'gerente',
      alcance: 'empresa',
      hospital_id: null,
      estado_id: null,
      empresa_id: empresaId
    };
  } else if (rol.includes('supervisor')) {
    return {
      role: 'supervisor',
      alcance: 'estado',
      hospital_id: null,
      estado_id: estadosMap.get(row.Estado) || null,
      empresa_id: null
    };
  } else if (rol.includes('líder')) {
    return {
      role: 'lider',
      alcance: 'hospital',
      hospital_id: hospitalesMap.get(row.Hospital)?.id || null,
      estado_id: null,
      empresa_id: null
    };
  } else if (rol.includes('auxiliar')) {
    return {
      role: 'auxiliar',
      alcance: 'hospital',
      hospital_id: hospitalesMap.get(row.Hospital)?.id || null,
      estado_id: null,
      empresa_id: null
    };
  } else if (rol.includes('almacenista')) {
    return {
      role: 'almacenista',
      alcance: 'hospital',
      hospital_id: hospitalesMap.get(row.Hospital)?.id || null,
      estado_id: null,
      empresa_id: null
    };
  }
  
  return {
    role: 'auxiliar',
    alcance: 'hospital',
    hospital_id: null,
    estado_id: null,
    empresa_id: null
  };
}
