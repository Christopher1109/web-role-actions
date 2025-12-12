/**
 * Helper para validar respuestas de Supabase y evitar fallos silenciosos
 * Uso: const result = await supabase.from('tabla').select('*'); assertSupabaseOk(result, 'contexto');
 */

import { toast } from 'sonner';

interface SupabaseResult<T = any> {
  data: T | null;
  error: any;
}

export function assertSupabaseOk<T>(
  result: SupabaseResult<T>,
  context: string,
  options: { silent?: boolean; throwError?: boolean } = {}
): T | null {
  const { silent = false, throwError = true } = options;

  if (result.error) {
    const errorMessage = result.error.message || JSON.stringify(result.error);
    console.error(`[SUPABASE ERROR] ${context}:`, {
      error: result.error,
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
      message: result.error.message
    });

    if (!silent) {
      toast.error(`Error: ${context}`, {
        description: errorMessage,
        duration: 8000
      });
    }

    if (throwError) {
      throw new Error(`${context}: ${errorMessage}`);
    }
  }

  return result.data;
}

/**
 * Timer helper para medir rendimiento
 */
export function createTimer(operationName: string) {
  const startTime = performance.now();
  console.time(`⏱️ ${operationName}`);
  
  return {
    log: (step: string) => {
      const elapsed = performance.now() - startTime;
      console.log(`⏱️ [${operationName}] ${step}: ${elapsed.toFixed(2)}ms`);
    },
    end: () => {
      console.timeEnd(`⏱️ ${operationName}`);
      const totalTime = performance.now() - startTime;
      if (totalTime > 3000) {
        console.warn(`⚠️ [${operationName}] Operación lenta: ${totalTime.toFixed(2)}ms`);
      }
      return totalTime;
    }
  };
}

/**
 * Logger estructurado para operaciones de inventario
 */
export function logInventoryOp(
  operation: string,
  data: Record<string, any>
) {
  const emoji = data.error ? '❌' : '✅';
  console.log(`${emoji} [INVENTORY] ${operation}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Debug function para verificar flujo completo de inventario (solo en dev)
 */
export async function debugInventoryFlow(
  supabase: any,
  hospitalId: string,
  almacenProvId: string,
  insumoId: string
) {
  if (import.meta.env.PROD) {
    console.warn('debugInventoryFlow solo disponible en desarrollo');
    return;
  }

  console.group('🔍 DEBUG: Flujo de Inventario');
  
  try {
    // 1. Leer inventario principal
    console.log('📦 1. Leyendo inventario principal...');
    const { data: invPrincipal, error: e1 } = await supabase
      .from('inventario_hospital')
      .select('id, insumo_catalogo_id, cantidad_actual')
      .eq('hospital_id', hospitalId)
      .eq('insumo_catalogo_id', insumoId);
    
    console.log('Inventario principal:', { data: invPrincipal, error: e1 });

    // 2. Leer inventario provisional
    console.log('📦 2. Leyendo inventario provisional...');
    const { data: invProv, error: e2 } = await supabase
      .from('almacen_provisional_inventario')
      .select('id, insumo_catalogo_id, cantidad_disponible')
      .eq('almacen_provisional_id', almacenProvId)
      .eq('insumo_catalogo_id', insumoId);
    
    console.log('Inventario provisional:', { data: invProv, error: e2 });

    // 3. Verificar almacén provisional existe
    console.log('🏭 3. Verificando almacén provisional...');
    const { data: almProv, error: e3 } = await supabase
      .from('almacenes_provisionales')
      .select('*')
      .eq('id', almacenProvId)
      .single();
    
    console.log('Almacén provisional:', { data: almProv, error: e3 });

    // 4. Últimos movimientos
    console.log('📋 4. Últimos movimientos del provisional...');
    const { data: movs, error: e4 } = await supabase
      .from('movimientos_almacen_provisional')
      .select('*')
      .eq('almacen_provisional_id', almacenProvId)
      .eq('insumo_catalogo_id', insumoId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('Movimientos recientes:', { data: movs, error: e4 });

    console.log('✅ Debug completado');
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
  
  console.groupEnd();
}
