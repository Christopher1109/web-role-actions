import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('No autenticado');
    }

    // Verificar que sea gerente
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'gerente') {
      throw new Error('Solo gerentes pueden ejecutar esta función');
    }

    const { hospitales } = await req.json();

    if (!hospitales || !Array.isArray(hospitales)) {
      throw new Error('Datos de hospitales inválidos');
    }

    const hospitalesCreados = [];
    
    // Crear hospitales, unidades y procedimientos
    for (const hospital of hospitales) {
      // Obtener estado_id
      const { data: estado } = await supabaseAdmin
        .from('estados')
        .select('id')
        .eq('codigo', hospital.codigo_estado)
        .single();

      if (!estado) {
        console.warn(`Estado no encontrado: ${hospital.codigo_estado}`);
        continue;
      }

      // Crear hospital
      const { data: hospitalCreado, error: hospitalError } = await supabaseAdmin
        .from('hospitales')
        .upsert({
          estado_id: estado.id,
          codigo: hospital.clave_presupuestal,
          nombre: hospital.nombre,
          direccion: hospital.localidad,
        }, {
          onConflict: 'codigo',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (hospitalError) {
        console.error(`Error creando hospital ${hospital.nombre}:`, hospitalError);
        continue;
      }

      hospitalesCreados.push(hospitalCreado);

      // Crear unidades
      for (const unidadNombre of hospital.unidades) {
        await supabaseAdmin
          .from('unidades')
          .upsert({
            hospital_id: hospitalCreado.id,
            codigo: `${hospital.clave_presupuestal}-${unidadNombre.substring(0, 3).toUpperCase()}`,
            nombre: unidadNombre,
            tipo: hospital.tipo
          }, {
            onConflict: 'codigo,hospital_id',
            ignoreDuplicates: true
          });
      }

      // Insertar procedimientos
      for (const proc of hospital.procedimientos) {
        await supabaseAdmin
          .from('hospital_procedimientos')
          .upsert({
            hospital_id: hospitalCreado.id,
            clave_procedimiento: proc.clave,
            nombre_procedimiento: proc.nombre,
            precio_unitario: proc.precio,
            maximo_acumulado: proc.maximo
          }, {
            onConflict: 'hospital_id,clave_procedimiento',
            ignoreDuplicates: true
          });
      }
    }

    console.log(`Hospitales creados: ${hospitalesCreados.length}`);

    // Crear usuarios
    const usuariosCreados = await crearUsuarios(supabaseAdmin, hospitalesCreados);

    return new Response(
      JSON.stringify({ 
        success: true,
        hospitales: hospitalesCreados.length,
        usuarios: usuariosCreados,
        message: 'Datos cargados exitosamente'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Función auxiliar para convertir nombre de estado a slug
function estadoToSlug(nombreEstado: string): string {
  return nombreEstado
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/\s+/g, '') // Remover espacios
    .replace(/[^a-z0-9]/g, ''); // Solo letras y números
}

async function crearUsuarios(supabaseAdmin: any, hospitales: any[]) {
  const usuariosCreados = {
    auxiliares: 0,
    almacenistas: 0,
    lideres: 0,
    gerentes: 0
  };

  // 1. Crear gerente de operaciones (solo uno)
  try {
    const gerenteEmail = 'gerente@imss.mx';
    const gerentePassword = 'Gerente123!';
    
    const { data: gerenteUser, error: gerenteError } = await supabaseAdmin.auth.admin.createUser({
      email: gerenteEmail,
      password: gerentePassword,
      email_confirm: true,
      user_metadata: {
        nombre_completo: 'Gerente de Operaciones IMSS',
        role: 'gerente'
      }
    });

    if (!gerenteError && gerenteUser) {
      await supabaseAdmin.from('user_roles').insert({
        user_id: gerenteUser.user.id,
        role: 'gerente',
        alcance: 'empresa',
        empresa_id: '11111111-1111-1111-1111-111111111111'
      });
      usuariosCreados.gerentes++;
    }
  } catch (error) {
    console.error('Error creando gerente:', error);
  }

  // 2. Agrupar hospitales por estado para crear líderes
  const hospitalesPorEstado = new Map();
  
  for (const hospital of hospitales) {
    // Obtener nombre del estado
    const { data: estado } = await supabaseAdmin
      .from('estados')
      .select('id, nombre')
      .eq('id', hospital.estado_id)
      .single();

    if (!estado) continue;

    const estadoKey = estado.nombre;
    if (!hospitalesPorEstado.has(estadoKey)) {
      hospitalesPorEstado.set(estadoKey, {
        estado_id: hospital.estado_id,
        nombre: estadoKey,
        hospitales: []
      });
    }
    hospitalesPorEstado.get(estadoKey).hospitales.push(hospital);
  }

  // 3. Crear líderes hospitalarios (máximo 4 hospitales por líder)
  for (const [estadoNombre, estadoData] of hospitalesPorEstado) {
    const hospitalesEstado = estadoData.hospitales;
    const numLideres = Math.ceil(hospitalesEstado.length / 4);
    const estadoSlug = estadoToSlug(estadoNombre);
    
    for (let i = 0; i < numLideres; i++) {
      const hospitalesAsignados = hospitalesEstado.slice(i * 4, (i + 1) * 4);
      const primerHospital = hospitalesAsignados[0];
      
      try {
        const liderEmail = numLideres === 1 
          ? `lider.${estadoSlug}@imss.mx`
          : `lider.${estadoSlug}.${i + 1}@imss.mx`;
        const liderPassword = 'Lider123!';
        
        const { data: liderUser, error: liderError } = await supabaseAdmin.auth.admin.createUser({
          email: liderEmail,
          password: liderPassword,
          email_confirm: true,
          user_metadata: {
            nombre_completo: numLideres === 1
              ? `Líder Hospitalario ${estadoNombre}`
              : `Líder Hospitalario ${estadoNombre} ${i + 1}`,
            role: 'lider'
          }
        });

        if (!liderError && liderUser) {
          // Asignar perfil al primer hospital de su grupo
          await supabaseAdmin.from('profiles').update({
            hospital_id: primerHospital.id
          }).eq('id', liderUser.user.id);

          // Crear roles para cada hospital asignado
          for (const hosp of hospitalesAsignados) {
            await supabaseAdmin.from('user_roles').insert({
              user_id: liderUser.user.id,
              role: 'lider',
              alcance: 'hospital',
              hospital_id: hosp.id,
              estado_id: estadoData.estado_id
            });
          }
          usuariosCreados.lideres++;
        }
      } catch (error) {
        console.error('Error creando líder:', error);
      }
    }
  }

  // 4. Crear auxiliares y almacenistas por unidad con nombres legibles
  for (const hospital of hospitales) {
    // Obtener unidades del hospital
    const { data: unidades } = await supabaseAdmin
      .from('unidades')
      .select('*')
      .eq('hospital_id', hospital.id);

    if (!unidades) continue;

    // Obtener nombre del estado para el email
    const { data: estado } = await supabaseAdmin
      .from('estados')
      .select('nombre')
      .eq('id', hospital.estado_id)
      .single();

    const estadoSlug = estado ? estadoToSlug(estado.nombre) : 'unknown';

    // Contadores por tipo de usuario en este hospital
    let contadorAuxiliares = 0;
    let contadorAlmacenistas = 0;

    for (const unidad of unidades) {
      // Crear auxiliar de anestesia para cada unidad de quirófano
      if (unidad.nombre.toLowerCase().includes('quirófano') || unidad.nombre.toLowerCase().includes('quirofano')) {
        try {
          contadorAuxiliares++;
          const auxiliarEmail = contadorAuxiliares === 1
            ? `auxiliar.${estadoSlug}@imss.mx`
            : `auxiliar.${estadoSlug}.${contadorAuxiliares}@imss.mx`;
            
          const { data: auxiliarUser } = await supabaseAdmin.auth.admin.createUser({
            email: auxiliarEmail,
            password: 'Auxiliar123!',
            email_confirm: true,
            user_metadata: {
              nombre_completo: contadorAuxiliares === 1
                ? `Auxiliar ${estado?.nombre || ''}`
                : `Auxiliar ${estado?.nombre || ''} ${contadorAuxiliares}`,
              role: 'auxiliar',
              unidad: unidad.nombre
            }
          });

          if (auxiliarUser) {
            await supabaseAdmin.from('profiles').update({
              hospital_id: hospital.id,
              unidad: unidad.nombre
            }).eq('id', auxiliarUser.user.id);

            await supabaseAdmin.from('user_roles').insert({
              user_id: auxiliarUser.user.id,
              role: 'auxiliar',
              alcance: 'hospital',
              hospital_id: hospital.id
            });
            usuariosCreados.auxiliares++;
          }
        } catch (error) {
          console.error('Error creando auxiliar:', error);
        }
      }

      // Crear almacenista (solo para unidades de almacén)
      if (unidad.nombre.toLowerCase().includes('almacén') || unidad.nombre.toLowerCase().includes('almacen')) {
        try {
          contadorAlmacenistas++;
          const almacenistaEmail = contadorAlmacenistas === 1
            ? `almacenista.${estadoSlug}@imss.mx`
            : `almacenista.${estadoSlug}.${contadorAlmacenistas}@imss.mx`;
            
          const { data: almacenistaUser } = await supabaseAdmin.auth.admin.createUser({
            email: almacenistaEmail,
            password: 'Almacen123!',
            email_confirm: true,
            user_metadata: {
              nombre_completo: contadorAlmacenistas === 1
                ? `Almacenista ${estado?.nombre || ''}`
                : `Almacenista ${estado?.nombre || ''} ${contadorAlmacenistas}`,
              role: 'almacenista',
              unidad: unidad.nombre
            }
          });

          if (almacenistaUser) {
            await supabaseAdmin.from('profiles').update({
              hospital_id: hospital.id,
              unidad: unidad.nombre
            }).eq('id', almacenistaUser.user.id);

            await supabaseAdmin.from('user_roles').insert({
              user_id: almacenistaUser.user.id,
              role: 'almacenista',
              alcance: 'hospital',
              hospital_id: hospital.id
            });
            usuariosCreados.almacenistas++;
          }
        } catch (error) {
          console.error('Error creando almacenista:', error);
        }
      }
    }
  }

  return usuariosCreados;
}
