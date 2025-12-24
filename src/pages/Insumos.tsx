import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertCircle, AlertTriangle, Calendar, LayoutGrid, Table2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InsumoForm from '@/components/forms/InsumoForm';
import InsumoDetailDialog from '@/components/dialogs/InsumoDetailDialog';
import { InsumoGroupedCard } from '@/components/InsumoGroupedCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Tipo para inventario consolidado (consultas rápidas)
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

// Tipo para lotes (detalles FIFO y caducidad)
interface InventarioLote {
  id: string;
  consolidado_id: string;
  lote: string | null;
  fecha_caducidad: string | null;
  fecha_entrada: string;
  cantidad: number;
  ubicacion: string;
}

interface GroupedInsumo {
  insumo_catalogo_id: string;
  consolidado_id: string;
  nombre: string;
  clave: string | null;
  tipo: string;
  stockTotal: number;
  lotes: {
    id: string;
    lote: string;
    cantidad_actual: number;
    fecha_caducidad: string | null;
    ubicacion: string;
  }[];
}

const Insumos = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [inventarioConsolidado, setInventarioConsolidado] = useState<InventarioConsolidado[]>([]);
  const [lotes, setLotes] = useState<InventarioLote[]>([]);
  const [selectedInsumo, setSelectedInsumo] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filtros avanzados
  const [filterStockBajo, setFilterStockBajo] = useState(false);
  const [filterProximosCaducar, setFilterProximosCaducar] = useState(false);
  const [filterTipo, setFilterTipo] = useState<'todos' | 'insumo' | 'medicamento'>('todos');

  useEffect(() => {
    if (user && selectedHospital) {
      fetchInventario();
    }
  }, [user, selectedHospital]);

  // Suscripción en tiempo real para actualizaciones de inventario consolidado
  useEffect(() => {
    if (!selectedHospital) return;

    const channel = supabase
      .channel(`inventario-consolidado-${selectedHospital.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventario_consolidado',
          filter: `hospital_id=eq.${selectedHospital.id}`
        },
        (payload) => {
          console.log('Cambio en inventario consolidado:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            setInventarioConsolidado(prev => prev.map(item => 
              item.id === newData.id 
                ? { ...item, cantidad_total: newData.cantidad_total, cantidad_minima: newData.cantidad_minima }
                : item
            ));
            toast.info('📦 Inventario actualizado', { duration: 3000 });
          } else {
            fetchInventario();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedHospital]);

  const fetchInventario = async () => {
    try {
      if (!selectedHospital) return;
      
      setLoading(true);
      
      // Obtener almacén del hospital
      const { data: almacen, error: almacenError } = await supabase
        .from('almacenes')
        .select('id')
        .eq('hospital_id', selectedHospital.id)
        .maybeSingle();

      if (almacenError) throw almacenError;
      
      if (!almacen) {
        setInventarioConsolidado([]);
        setLotes([]);
        setLoading(false);
        return;
      }

      // Cargar inventario consolidado (rápido - ~14k filas vs 29k)
      const { data: consolidadoData, error: consolidadoError } = await supabase
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
        .eq('almacen_id', almacen.id)
        .gt('cantidad_total', 0)
        .order('created_at', { ascending: false });

      if (consolidadoError) throw consolidadoError;
      
      setInventarioConsolidado(consolidadoData || []);

      // Cargar lotes solo para los items del hospital (para vista detallada)
      if (consolidadoData && consolidadoData.length > 0) {
        const consolidadoIds = consolidadoData.map(c => c.id);
        const { data: lotesData, error: lotesError } = await supabase
          .from('inventario_lotes')
          .select('*')
          .in('consolidado_id', consolidadoIds)
          .gt('cantidad', 0)
          .order('fecha_entrada', { ascending: true }); // FIFO order

        if (lotesError) throw lotesError;
        setLotes(lotesData || []);
      } else {
        setLotes([]);
      }
    } catch (error: any) {
      toast.error('Error al cargar inventario', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInsumo = async (data: any) => {
    try {
      if (!user || !selectedHospital) return;

      // Verificar/crear el insumo en el catálogo
      let catalogoId;
      const { data: insumosCatalogo } = await supabase
        .from('insumos_catalogo')
        .select('id')
        .eq('nombre', data.nombre)
        .maybeSingle();

      if (!insumosCatalogo) {
        const { data: nuevoCatalogo, error: createError } = await supabase
          .from('insumos_catalogo')
          .insert({
            nombre: data.nombre,
            clave: data.clave,
            descripcion: data.descripcion,
            categoria: 'Material médico',
            unidad: 'pieza',
            activo: true
          })
          .select()
          .single();

        if (createError) throw createError;
        catalogoId = nuevoCatalogo.id;
      } else {
        catalogoId = insumosCatalogo.id;
      }

      // Obtener almacén del hospital
      const { data: almacen, error: almacenError } = await supabase
        .from('almacenes')
        .select('id')
        .eq('hospital_id', selectedHospital.id)
        .single();

      if (almacenError || !almacen) throw new Error('No se encontró el almacén del hospital');

      // Verificar si ya existe un registro consolidado
      const { data: existente } = await supabase
        .from('inventario_consolidado')
        .select('id, cantidad_total')
        .eq('hospital_id', selectedHospital.id)
        .eq('almacen_id', almacen.id)
        .eq('insumo_catalogo_id', catalogoId)
        .maybeSingle();

      let consolidadoId: string;

      if (existente) {
        // Actualizar consolidado existente
        await supabase
          .from('inventario_consolidado')
          .update({ 
            cantidad_total: existente.cantidad_total + (data.cantidad || 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id);
        consolidadoId = existente.id;
      } else {
        // Crear nuevo consolidado
        const { data: nuevoConsolidado, error: consError } = await supabase
          .from('inventario_consolidado')
          .insert({
            hospital_id: selectedHospital.id,
            almacen_id: almacen.id,
            insumo_catalogo_id: catalogoId,
            cantidad_total: data.cantidad || 0,
            cantidad_minima: 10
          })
          .select()
          .single();

        if (consError) throw consError;
        consolidadoId = nuevoConsolidado.id;
      }

      // Crear registro de lote
      const { error: loteError } = await supabase
        .from('inventario_lotes')
        .insert({
          consolidado_id: consolidadoId,
          lote: data.lote,
          fecha_caducidad: data.fecha_caducidad,
          fecha_entrada: new Date().toISOString(),
          cantidad: data.cantidad || 0,
          ubicacion: 'Almacén general'
        });

      if (loteError) throw loteError;

      toast.success('Insumo registrado exitosamente');
      setShowForm(false);
      fetchInventario();
    } catch (error: any) {
      toast.error('Error al registrar insumo', {
        description: error.message,
      });
    }
  };

  const getStockStatus = (cantidadActual: number, cantidadMinima: number = 10) => {
    if (cantidadActual === 0) return { variant: 'destructive' as const, label: 'Agotado' };
    if (cantidadActual <= cantidadMinima / 2) return { variant: 'destructive' as const, label: 'Crítico' };
    if (cantidadActual <= cantidadMinima) return { variant: 'default' as const, label: 'Bajo' };
    return { variant: 'default' as const, label: 'Normal' };
  };

  const isCaducidadProxima = (fecha: string | null) => {
    if (!fecha) return false;
    const diff = new Date(fecha).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 60 && days >= 0;
  };

  // Crear mapa de lotes por consolidado_id
  const lotesPorConsolidado = useMemo(() => {
    const map = new Map<string, InventarioLote[]>();
    lotes.forEach(lote => {
      const arr = map.get(lote.consolidado_id) || [];
      arr.push(lote);
      map.set(lote.consolidado_id, arr);
    });
    return map;
  }, [lotes]);

  // Agrupar inventario para vista de cards
  const groupedInsumos = useMemo((): GroupedInsumo[] => {
    return inventarioConsolidado
      .filter(item => item.insumos_catalogo)
      .map(item => {
        const itemLotes = lotesPorConsolidado.get(item.id) || [];
        return {
          insumo_catalogo_id: item.insumo_catalogo_id,
          consolidado_id: item.id,
          nombre: item.insumos_catalogo.nombre,
          clave: item.insumos_catalogo.clave,
          tipo: item.insumos_catalogo.tipo || 'insumo',
          stockTotal: item.cantidad_total,
          lotes: itemLotes.map(l => ({
            id: l.id,
            lote: l.lote || 'N/A',
            cantidad_actual: l.cantidad,
            fecha_caducidad: l.fecha_caducidad,
            ubicacion: l.ubicacion
          }))
        };
      });
  }, [inventarioConsolidado, lotesPorConsolidado]);

  // Filtrar inventario agrupado
  const filteredGroupedInsumos = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return groupedInsumos.filter(item => {
      const matchesStockBajo = !filterStockBajo || item.stockTotal < 10;
      const matchesProximoCaducar = !filterProximosCaducar || 
        item.lotes.some(l => isCaducidadProxima(l.fecha_caducidad));
      const matchesTipo = filterTipo === 'todos' || item.tipo === filterTipo;
      return matchesStockBajo && matchesProximoCaducar && matchesTipo;
    });

    return groupedInsumos.filter(item => {
      // Buscar por nombre o clave (código BCB)
      const matchesNombre = item.nombre?.toLowerCase().includes(search);
      const matchesClave = item.clave?.toLowerCase().includes(search);
      // También buscar sin puntos para facilitar búsqueda de códigos
      const searchSinPuntos = search.replace(/\./g, '');
      const claveSinPuntos = item.clave?.replace(/\./g, '').toLowerCase();
      const matchesClaveSinPuntos = claveSinPuntos?.includes(searchSinPuntos);
      
      const matchesSearch = matchesNombre || matchesClave || matchesClaveSinPuntos;
      
      const matchesStockBajo = !filterStockBajo || item.stockTotal < 10;
      const matchesProximoCaducar = !filterProximosCaducar || 
        item.lotes.some(l => isCaducidadProxima(l.fecha_caducidad));
      const matchesTipo = filterTipo === 'todos' || item.tipo === filterTipo;

      return matchesSearch && matchesStockBajo && matchesProximoCaducar && matchesTipo;
    });
  }, [groupedInsumos, searchTerm, filterStockBajo, filterProximosCaducar, filterTipo]);

  // Crear lista plana de lotes para vista de tabla
  const flatLotes = useMemo(() => {
    return inventarioConsolidado
      .filter(item => item.insumos_catalogo)
      .flatMap(item => {
        const itemLotes = lotesPorConsolidado.get(item.id) || [];
        return itemLotes.map(lote => ({
          ...lote,
          insumos_catalogo: item.insumos_catalogo,
          cantidad_total: item.cantidad_total
        }));
      });
  }, [inventarioConsolidado, lotesPorConsolidado]);

  // Filtrar lotes para vista de tabla
  const filteredLotes = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return flatLotes.filter(item => {
      const matchesStockBajo = !filterStockBajo || item.cantidad < 10;
      const matchesProximoCaducar = !filterProximosCaducar || isCaducidadProxima(item.fecha_caducidad);
      const matchesTipo = filterTipo === 'todos' || item.insumos_catalogo?.tipo === filterTipo;
      return matchesStockBajo && matchesProximoCaducar && matchesTipo;
    });

    return flatLotes.filter(item => {
      // Buscar por nombre, clave (código BCB) o lote
      const matchesNombre = item.insumos_catalogo?.nombre?.toLowerCase().includes(search);
      const matchesClave = item.insumos_catalogo?.clave?.toLowerCase().includes(search);
      const matchesLote = item.lote?.toLowerCase().includes(search);
      // También buscar sin puntos para facilitar búsqueda de códigos
      const searchSinPuntos = search.replace(/\./g, '');
      const claveSinPuntos = item.insumos_catalogo?.clave?.replace(/\./g, '').toLowerCase();
      const matchesClaveSinPuntos = claveSinPuntos?.includes(searchSinPuntos);
      
      const matchesSearch = matchesNombre || matchesClave || matchesLote || matchesClaveSinPuntos;
      
      const matchesStockBajo = !filterStockBajo || item.cantidad < 10;
      const matchesProximoCaducar = !filterProximosCaducar || isCaducidadProxima(item.fecha_caducidad);
      const matchesTipo = filterTipo === 'todos' || item.insumos_catalogo?.tipo === filterTipo;

      return matchesSearch && matchesStockBajo && matchesProximoCaducar && matchesTipo;
    });
  }, [flatLotes, searchTerm, filterStockBajo, filterProximosCaducar, filterTipo]);

  const stockBajoCount = groupedInsumos.filter(i => i.stockTotal < 10).length;
  const proximosVencerCount = groupedInsumos.filter(i => 
    i.lotes.some(l => isCaducidadProxima(l.fecha_caducidad))
  ).length;

  return (
    <div className="space-y-6">
      {!selectedHospital && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Debes seleccionar un hospital para ver y gestionar el inventario de insumos.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario de Insumos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el inventario de insumos médicos del hospital
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={!selectedHospital}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Insumo
        </Button>
      </div>

      {selectedHospital && (
        <>
          {/* Resumen estadístico */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Productos en Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventarioConsolidado.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lotes.length} lotes activos
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Stock Bajo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-orange-500">{stockBajoCount}</div>
                  {stockBajoCount > 0 && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren reabastecimiento
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Próximos a Vencer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-red-500">{proximosVencerCount}</div>
                  {proximosVencerCount > 0 && <Calendar className="h-5 w-5 text-red-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Menos de 60 días
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Barra de búsqueda y controles */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, clave o lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                <ToggleGroupItem value="cards" aria-label="Vista tarjetas">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Vista tabla">
                  <Table2 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Filtros rápidos */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterStockBajo ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStockBajo(!filterStockBajo)}
              >
                Stock Bajo
              </Button>
              <Button
                variant={filterProximosCaducar ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProximosCaducar(!filterProximosCaducar)}
              >
                Próximos a Caducar
              </Button>
              <Button
                variant={filterTipo === 'insumo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTipo(filterTipo === 'insumo' ? 'todos' : 'insumo')}
              >
                Solo Insumos
              </Button>
              <Button
                variant={filterTipo === 'medicamento' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTipo(filterTipo === 'medicamento' ? 'todos' : 'medicamento')}
              >
                Solo Medicamentos
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando inventario...
            </div>
          ) : filteredGroupedInsumos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No se encontraron insumos que coincidan con los filtros
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            // Vista de tarjetas agrupadas
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroupedInsumos.map((item) => (
                <InsumoGroupedCard
                  key={item.consolidado_id}
                  nombre={item.nombre}
                  clave={item.clave}
                  tipo={item.tipo}
                  stockTotal={item.stockTotal}
                  lotes={item.lotes}
                  onSelectLote={(lote) => {
                    setSelectedInsumo({
                      id: lote.id,
                      lote: lote.lote,
                      cantidad_actual: lote.cantidad_actual,
                      fecha_caducidad: lote.fecha_caducidad,
                      ubicacion: lote.ubicacion,
                      insumos_catalogo: {
                        nombre: item.nombre,
                        clave: item.clave,
                        tipo: item.tipo
                      }
                    });
                    setShowDetail(true);
                  }}
                />
              ))}
            </div>
          ) : (
            // Vista de tabla
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Clave</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Caducidad</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Ubicación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLotes.map((item) => {
                        const status = getStockStatus(item.cantidad);
                        const proximoVencer = isCaducidadProxima(item.fecha_caducidad);
                        
                        return (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedInsumo({
                                id: item.id,
                                lote: item.lote,
                                cantidad_actual: item.cantidad,
                                fecha_caducidad: item.fecha_caducidad,
                                ubicacion: item.ubicacion,
                                insumos_catalogo: item.insumos_catalogo
                              });
                              setShowDetail(true);
                            }}
                          >
                            <TableCell className="font-medium">
                              {item.insumos_catalogo?.nombre}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.insumos_catalogo?.clave || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {item.insumos_catalogo?.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{item.lote || 'N/A'}</TableCell>
                            <TableCell className="text-sm">
                              {item.fecha_caducidad ? (
                                <span className={proximoVencer ? 'text-red-500 font-medium' : ''}>
                                  {format(new Date(item.fecha_caducidad), 'dd/MM/yyyy')}
                                </span>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.cantidad}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="text-xs">
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.ubicacion}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <InsumoForm
            onClose={() => setShowForm(false)}
            onSubmit={handleCreateInsumo}
          />
        </DialogContent>
      </Dialog>

      {selectedInsumo && (
        <InsumoDetailDialog
          insumo={selectedInsumo}
          open={showDetail}
          onOpenChange={(open) => {
            setShowDetail(open);
            if (!open) setSelectedInsumo(null);
          }}
        />
      )}
    </div>
  );
};

export default Insumos;
