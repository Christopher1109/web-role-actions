import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const STALE_TIME = 30000; // 30 segundos
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

interface AlmacenProvisional {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  es_principal: boolean;
}

interface InventarioProvisional {
  id: string;
  almacen_provisional_id: string;
  insumo_catalogo_id: string;
  cantidad_disponible: number;
  insumo?: { id: string; nombre: string; clave: string };
}

// Hook para almacenes provisionales con caché
export function useAlmacenesProvisionales(hospitalId: string | undefined) {
  return useQuery({
    queryKey: ['almacenes-provisionales', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const { data, error } = await supabase
        .from('almacenes_provisionales')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AlmacenProvisional[];
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook para inventario provisional paginado
export function usePaginatedInventarioProvisional(almacenId: string | undefined, searchTerm: string = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const queryClient = useQueryClient();

  // Query para contar el total
  const countQuery = useQuery({
    queryKey: ['inventario-provisional-count', almacenId],
    queryFn: async () => {
      if (!almacenId) return 0;
      
      const { count, error } = await supabase
        .from('almacen_provisional_inventario')
        .select('id', { count: 'exact', head: true })
        .eq('almacen_provisional_id', almacenId)
        .gt('cantidad_disponible', 0);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!almacenId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Query para datos paginados
  const dataQuery = useQuery({
    queryKey: ['inventario-provisional-paginated', almacenId, page, pageSize],
    queryFn: async () => {
      if (!almacenId) return [];
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('almacen_provisional_inventario')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('almacen_provisional_id', almacenId)
        .gt('cantidad_disponible', 0)
        .range(from, to);

      if (error) throw error;
      return (data || []) as InventarioProvisional[];
    },
    enabled: !!almacenId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Filtrado client-side por búsqueda
  const filteredData = searchTerm
    ? (dataQuery.data || []).filter(item => {
        const search = searchTerm.toLowerCase();
        return (
          item.insumo?.nombre?.toLowerCase().includes(search) ||
          item.insumo?.clave?.toLowerCase().includes(search)
        );
      })
    : dataQuery.data || [];

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
    setPage(1);
  }, []);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventario-provisional-count', almacenId] });
    queryClient.invalidateQueries({ queryKey: ['inventario-provisional-paginated', almacenId] });
  }, [queryClient, almacenId]);

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
  };
}

// Hook para inventario general paginado (para traspasos)
export function usePaginatedInventarioGeneral(hospitalId: string | undefined, searchTerm: string = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const dataQuery = useQuery({
    queryKey: ['inventario-general-paginated', hospitalId, page, pageSize, searchTerm],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('inventario_consolidado')
        .select(`
          id,
          insumo_catalogo_id,
          cantidad_total,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('hospital_id', hospitalId)
        .gt('cantidad_total', 0)
        .order('insumo_catalogo_id')
        .range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        insumo_catalogo_id: item.insumo_catalogo_id,
        cantidad_actual: item.cantidad_total,
        insumo: item.insumo
      }));
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Count query
  const countQuery = useQuery({
    queryKey: ['inventario-general-count', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return 0;
      
      const { count, error } = await supabase
        .from('inventario_consolidado')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .gt('cantidad_total', 0);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Filtrado client-side por búsqueda
  const filteredData = searchTerm
    ? (dataQuery.data || []).filter(item => {
        const search = searchTerm.toLowerCase();
        return (
          item.insumo?.nombre?.toLowerCase().includes(search) ||
          item.insumo?.clave?.toLowerCase().includes(search)
        );
      })
    : dataQuery.data || [];

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
    setPage(1);
  }, []);

  return {
    data: filteredData,
    allData: dataQuery.data || [],
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
  };
}
