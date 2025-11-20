import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InventarioItem {
  id: string;
  lote: string;
  fecha_caducidad: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  cantidad_minima?: number | null;
  cantidad_maxima?: number | null;
  ubicacion: string;
  estatus: string;
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

const Insumos = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
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
        setInventario([]);
        setLoading(false);
        return;
      }

      const { data, error} = await supabase
        .from('inventario_hospital')
        .select(`
          *,
          insumos_catalogo (
            id,
            nombre,
            clave,
            descripcion,
            categoria,
            unidad,
            familia_insumo,
            presentacion,
            tipo
          )
        `)
        .eq('almacen_id', almacen.id)
        .eq('estatus', 'activo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setInventario(data || []);
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

      // Primero verificar/crear el insumo en el catálogo
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

      // Insertar en inventario
      const { error: invError } = await supabase
        .from('inventario_hospital')
        .insert({
          almacen_id: almacen.id,
          insumo_catalogo_id: catalogoId,
          hospital_id: selectedHospital.id,
          lote: data.lote,
          fecha_caducidad: data.fecha_caducidad,
          cantidad_inicial: data.cantidad || 0,
          cantidad_actual: data.cantidad || 0,
          cantidad_minima: data.cantidad_minima ?? 10,
          cantidad_maxima: data.cantidad_maxima ?? null,
          ubicacion: 'Almacén general',
          estatus: 'activo'
        });

      if (invError) throw invError;

      toast.success('Insumo registrado exitosamente');
      setShowForm(false);
      fetchInventario();
    } catch (error: any) {
      toast.error('Error al registrar insumo', {
        description: error.message,
      });
    }
  };

  const getStockStatus = (
    cantidadActual: number,
    cantidadMinima: number = 10,
    cantidadMaxima?: number | null
  ) => {
    if (cantidadActual === 0) return { variant: 'destructive' as const, label: 'Agotado' };
    if (cantidadMaxima != null && cantidadActual > cantidadMaxima) {
      return { variant: 'secondary' as const, label: 'Exceso' };
    }
    if (cantidadActual <= cantidadMinima / 2) return { variant: 'destructive' as const, label: 'Crítico' };
    if (cantidadActual <= cantidadMinima) return { variant: 'default' as const, label: 'Bajo' };
    return { variant: 'default' as const, label: 'Normal' };
  };

  const isCaducidadProxima = (fecha: string) => {
    if (!fecha) return false;
    const diff = new Date(fecha).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 60 && days >= 0;
  };

  // Filtrar inventario
  const filteredInventario = inventario.filter(item => {
    const matchesSearch = 
      item.insumos_catalogo?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.insumos_catalogo?.clave?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lote?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStockBajo = !filterStockBajo || item.cantidad_actual < (item.cantidad_minima ?? 10);
    const matchesProximoCaducar = !filterProximosCaducar || isCaducidadProxima(item.fecha_caducidad);
    const matchesTipo = filterTipo === 'todos' || item.insumos_catalogo?.tipo === filterTipo;

    return matchesSearch && matchesStockBajo && matchesProximoCaducar && matchesTipo;
  });

  const stockBajo = inventario.filter(i => i.cantidad_actual < (i.cantidad_minima ?? 10)).length;
  const proximosVencer = inventario.filter(i => isCaducidadProxima(i.fecha_caducidad)).length;

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
                  Registros en Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventario.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registros activos en inventario
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
                  <div className="text-2xl font-bold text-orange-500">{stockBajo}</div>
                  {stockBajo > 0 && <AlertTriangle className="h-5 w-5 text-orange-500" />}
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
                  <div className="text-2xl font-bold text-red-500">{proximosVencer}</div>
                  {proximosVencer > 0 && <Calendar className="h-5 w-5 text-red-500" />}
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
          ) : filteredInventario.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No se encontraron insumos que coincidan con los filtros
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            // Vista de tarjetas (original)
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInventario.map((item) => {
                const status = getStockStatus(
                  item.cantidad_actual,
                  item.cantidad_minima ?? 10,
                  item.cantidad_maxima ?? undefined
                );
                const proximoVencer = isCaducidadProxima(item.fecha_caducidad);

                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedInsumo(item);
                      setShowDetail(true);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">
                          {item.insumos_catalogo?.nombre || 'Sin nombre'}
                        </CardTitle>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      {item.insumos_catalogo?.presentacion && (
                        <CardDescription className="text-xs">
                          {item.insumos_catalogo.presentacion}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Clave</p>
                          <p className="font-medium">{item.insumos_catalogo?.clave || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Tipo</p>
                          <Badge variant="outline" className="text-xs">
                            {item.insumos_catalogo?.tipo || 'insumo'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Lote</p>
                          <p className="font-medium">{item.lote || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Stock Actual</p>
                          <p className="font-bold text-lg">{item.cantidad_actual}</p>
                        </div>
                      </div>
                      
                      {proximoVencer && (
                        <Alert variant="destructive" className="py-2">
                          <Calendar className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            Caduca: {item.fecha_caducidad ? format(new Date(item.fecha_caducidad), 'dd/MM/yyyy') : 'N/A'}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
                        <TableHead>Presentación</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Caducidad</TableHead>
                        <TableHead className="text-right">Stock Actual</TableHead>
                        <TableHead className="text-right">Stock Inicial</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Ubicación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventario.map((item) => {
                        const status = getStockStatus(
                          item.cantidad_actual,
                          item.cantidad_minima ?? 10,
                          item.cantidad_maxima ?? undefined
                        );
                        const proximoVencer = isCaducidadProxima(item.fecha_caducidad);
                        
                        return (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedInsumo(item);
                              setShowDetail(true);
                            }}
                          >
                            <TableCell className="font-medium">
                              {item.insumos_catalogo?.nombre}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.insumos_catalogo?.presentacion || '-'}
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
                              {item.cantidad_actual}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.cantidad_inicial}
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
