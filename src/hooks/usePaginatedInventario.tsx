import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const STALE_TIME = 30000; // 30 segundos
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

interface InventarioConsolidado {
  id: string;
  hospital_id: string;
  almacen_id: string;
  insumo_catalogo_id: string;
  cantidad_total: number;
  cantidad_minima: number;
  insumos_catalogo: {
    id: string;
    nombre: string;
    clave: string;
    descripcion: string;
    categoria: string;
    unidad: string;
    presentacion: string;
    tipo: string;
  };
}

interface InventarioLote {
  id: string;
  consolidado_id: string;
  lote: string | null;
  fecha_caducidad: string | null;
  fecha_entrada: string;
  cantidad: number;
  ubicacion: string;
}

interface UsePaginatedInventarioOptions {
  hospitalId: string | undefined;
  almacenId: string | undefined;
  searchTerm?: string;
  filterStockBajo?: boolean;
  filterProximosCaducar?: boolean;
  filterTipo?: 'todos' | 'insumo' | 'medicamento';
}

export function usePaginatedInventario({
  hospitalId,
  almacenId,
  searchTerm = '',
  filterStockBajo = false,
  filterProximosCaducar = false,
  filterTipo = 'todos'
}: UsePaginatedInventarioOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const queryClient = useQueryClient();

  // Query para contar el total (para paginación)
  const countQuery = useQuery({
    queryKey: ['inventario-count', hospitalId, almacenId, searchTerm, filterTipo],
    queryFn: async () => {
      if (!hospitalId || !almacenId) return 0;
      
      let query = supabase
        .from('inventario_consolidado')
        .select('id', { count: 'exact', head: true })
        .eq('almacen_id', almacenId)
        .gt('cantidad_total', 0);

      if (searchTerm) {
        // Server-side search by insumo name or clave
        query = query.or(`insumo_catalogo_id.in.(${await getMatchingInsumoIds(searchTerm)})`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!hospitalId && !!almacenId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Query para datos paginados
  const dataQuery = useQuery({
    queryKey: ['inventario-paginated', hospitalId, almacenId, page, pageSize, searchTerm, filterTipo],
    queryFn: async () => {
      if (!hospitalId || !almacenId) return [];
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('inventario_consolidado')
        .select(`
          *,
          insumos_catalogo (
            id,
            nombre,
            clave,
            descripcion,
            categoria,
            unidad,
            presentacion,
            tipo
          )
        `)
        .eq('almacen_id', almacenId)
        .gt('cantidad_total', 0)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InventarioConsolidado[];
    },
    enabled: !!hospitalId && !!almacenId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Filtrado client-side para filtros complejos
  const filteredData = useMemo(() => {
    let result = dataQuery.data || [];
    
    const search = searchTerm.toLowerCase().trim();
    if (search) {
      result = result.filter(item => {
        const matchesNombre = item.insumos_catalogo?.nombre?.toLowerCase().includes(search);
        const matchesClave = item.insumos_catalogo?.clave?.toLowerCase().includes(search);
        const searchSinPuntos = search.replace(/\./g, '');
        const claveSinPuntos = item.insumos_catalogo?.clave?.replace(/\./g, '').toLowerCase();
        const matchesClaveSinPuntos = claveSinPuntos?.includes(searchSinPuntos);
        return matchesNombre || matchesClave || matchesClaveSinPuntos;
      });
    }

    if (filterStockBajo) {
      result = result.filter(item => item.cantidad_total < (item.cantidad_minima || 10));
    }

    if (filterTipo !== 'todos') {
      result = result.filter(item => item.insumos_catalogo?.tipo === filterTipo);
    }

    return result;
  }, [dataQuery.data, searchTerm, filterStockBajo, filterTipo]);

  const totalCount = countQuery.data || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= Math.max(totalPages, 1)) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
  const previousPage = useCallback(() => goToPage(page - 1), [page, goToPage]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
  }, []);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventario-count', hospitalId] });
    queryClient.invalidateQueries({ queryKey: ['inventario-paginated', hospitalId] });
  }, [queryClient, hospitalId]);

  // Reset page when search or filters change
  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  return {
    data: filteredData,
    isLoading: dataQuery.isLoading || countQuery.isLoading,
    error: dataQuery.error || countQuery.error,
    page,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    refetch,
    resetPage,
  };
}

// Lazy loading de lotes - solo cuando se necesitan
export function useInventarioLotes(consolidadoIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['inventario-lotes', consolidadoIds],
    queryFn: async () => {
      if (consolidadoIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('inventario_lotes')
        .select('*')
        .in('consolidado_id', consolidadoIds)
        .gt('cantidad', 0)
        .order('fecha_entrada', { ascending: true });

      if (error) throw error;
      return (data || []) as InventarioLote[];
    },
    enabled: enabled && consolidadoIds.length > 0,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Helper para obtener IDs de insumos que coinciden con búsqueda
async function getMatchingInsumoIds(search: string): Promise<string> {
  const { data } = await supabase
    .from('insumos_catalogo')
    .select('id')
    .or(`nombre.ilike.%${search}%,clave.ilike.%${search}%`)
    .limit(100);
  
  const ids = data?.map(i => `'${i.id}'`).join(',') || "''";
  return ids;
}

// Hook para estadísticas rápidas del inventario
export function useInventarioStats(hospitalId: string | undefined, almacenId: string | undefined) {
  return useQuery({
    queryKey: ['inventario-stats', hospitalId, almacenId],
    queryFn: async () => {
      if (!hospitalId || !almacenId) return { total: 0, stockBajo: 0, proximosVencer: 0 };
      
      // Total items
      const { count: total } = await supabase
        .from('inventario_consolidado')
        .select('id', { count: 'exact', head: true })
        .eq('almacen_id', almacenId)
        .gt('cantidad_total', 0);

      // Stock bajo (cantidad < minima)
      const { data: stockBajoData } = await supabase
        .from('inventario_consolidado')
        .select('id')
        .eq('almacen_id', almacenId)
        .gt('cantidad_total', 0)
        .lt('cantidad_total', 10);

      // Próximos a vencer (dentro de 60 días)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 60);
      
      const { data: proximosData } = await supabase
        .from('inventario_lotes')
        .select('consolidado_id')
        .lte('fecha_caducidad', fechaLimite.toISOString())
        .gte('fecha_caducidad', new Date().toISOString())
        .gt('cantidad', 0);

      return {
        total: total || 0,
        stockBajo: stockBajoData?.length || 0,
        proximosVencer: new Set(proximosData?.map(l => l.consolidado_id)).size
      };
    },
    enabled: !!hospitalId && !!almacenId,
    staleTime: 60000, // 1 minuto
    gcTime: CACHE_TIME,
  });
}
