import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Search, Package, Settings2, Loader2 } from 'lucide-react';

interface InventarioItem {
  id: string;
  hospital_id: string;
  insumo_catalogo_id: string;
  cantidad_actual: number;
  cantidad_minima: number;
  cantidad_maxima: number | null;
  hospital?: { id: string; nombre: string; display_name: string };
  insumo?: { id: string; nombre: string; clave: string };
}

interface Hospital {
  id: string;
  nombre: string;
  display_name: string | null;
}

interface EdicionMasivaMínimosProps {
  hospitalId?: string; // Si se pasa, solo muestra ese hospital (para Almacenista)
  esGlobal?: boolean;  // Si es true, muestra todos los hospitales (para Gerente Operaciones)
  onActualizado?: () => void;
}

const EdicionMasivaMínimos = ({ hospitalId, esGlobal = false, onActualizado }: EdicionMasivaMínimosProps) => {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [filtroHospital, setFiltroHospital] = useState<string>(hospitalId || 'todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState<Map<string, { minimo: number; maximo: number | null }>>(new Map());

  useEffect(() => {
    if (esGlobal) {
      fetchHospitales();
    }
    fetchInventario();
  }, [hospitalId, filtroHospital]);

  const fetchHospitales = async () => {
    const { data } = await supabase
      .from('hospitales')
      .select('id, nombre, display_name')
      .order('nombre');
    
    if (data) setHospitales(data);
  };

  const fetchInventario = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventario_hospital')
        .select(`
          id,
          hospital_id,
          insumo_catalogo_id,
          cantidad_actual,
          cantidad_minima,
          cantidad_maxima,
          hospital:hospitales(id, nombre, display_name),
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .order('insumo_catalogo_id');

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      } else if (filtroHospital !== 'todos') {
        query = query.eq('hospital_id', filtroHospital);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setInventario(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleMinimoChange = (id: string, value: number) => {
    const item = inventario.find(i => i.id === id);
    if (!item) return;
    
    const cambiosActuales = cambiosPendientes.get(id) || { minimo: item.cantidad_minima, maximo: item.cantidad_maxima };
    cambiosPendientes.set(id, { ...cambiosActuales, minimo: value });
    setCambiosPendientes(new Map(cambiosPendientes));
  };

  const handleMaximoChange = (id: string, value: number | null) => {
    const item = inventario.find(i => i.id === id);
    if (!item) return;
    
    const cambiosActuales = cambiosPendientes.get(id) || { minimo: item.cantidad_minima, maximo: item.cantidad_maxima };
    cambiosPendientes.set(id, { ...cambiosActuales, maximo: value });
    setCambiosPendientes(new Map(cambiosPendientes));
  };

  const guardarCambios = async () => {
    if (cambiosPendientes.size === 0) {
      toast.info('No hay cambios pendientes');
      return;
    }

    setGuardando(true);
    try {
      const updates = Array.from(cambiosPendientes.entries()).map(([id, valores]) => ({
        id,
        cantidad_minima: valores.minimo,
        cantidad_maxima: valores.maximo,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('inventario_hospital')
          .update({
            cantidad_minima: update.cantidad_minima,
            cantidad_maxima: update.cantidad_maxima,
            updated_at: update.updated_at
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      toast.success(`${updates.length} mínimos/máximos actualizados correctamente`);
      setCambiosPendientes(new Map());
      fetchInventario();
      onActualizado?.();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  };

  const getValorActual = (item: InventarioItem) => {
    const cambios = cambiosPendientes.get(item.id);
    return {
      minimo: cambios?.minimo ?? item.cantidad_minima,
      maximo: cambios?.maximo ?? item.cantidad_maxima
    };
  };

  const inventarioFiltrado = inventario.filter(item => {
    if (!busqueda) return true;
    const search = busqueda.toLowerCase();
    return (
      item.insumo?.nombre?.toLowerCase().includes(search) ||
      item.insumo?.clave?.toLowerCase().includes(search) ||
      item.hospital?.display_name?.toLowerCase().includes(search) ||
      item.hospital?.nombre?.toLowerCase().includes(search)
    );
  });

  const tieneAlertaBaja = (item: InventarioItem) => {
    return item.cantidad_actual < item.cantidad_minima;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            <span>Configuración Masiva de Mínimos y Máximos</span>
          </div>
          {cambiosPendientes.size > 0 && (
            <Button onClick={guardarCambios} disabled={guardando}>
              {guardando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar {cambiosPendientes.size} cambio{cambiosPendientes.size !== 1 ? 's' : ''}
            </Button>
          )}
        </CardTitle>
        <div className="flex gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, clave o hospital..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          {esGlobal && (
            <Select value={filtroHospital} onValueChange={setFiltroHospital}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar hospital" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los hospitales</SelectItem>
                {hospitales.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.display_name || h.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : inventarioFiltrado.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay insumos en el inventario</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  {esGlobal && <TableHead>Hospital</TableHead>}
                  <TableHead>Clave</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead className="text-right w-[120px]">Mínimo</TableHead>
                  <TableHead className="text-right w-[120px]">Máximo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventarioFiltrado.map((item) => {
                  const valores = getValorActual(item);
                  const tieneCambios = cambiosPendientes.has(item.id);
                  const esBajoStock = tieneAlertaBaja(item);
                  
                  return (
                    <TableRow 
                      key={item.id} 
                      className={`
                        ${esBajoStock ? 'bg-red-50/50' : ''}
                        ${tieneCambios ? 'bg-amber-50/50' : ''}
                      `}
                    >
                      {esGlobal && (
                        <TableCell className="font-medium text-sm">
                          {item.hospital?.display_name || item.hospital?.nombre}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                      <TableCell className="font-medium">{item.insumo?.nombre}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={esBajoStock ? 'text-destructive font-bold' : ''}>
                          {item.cantidad_actual}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          value={valores.minimo}
                          onChange={(e) => handleMinimoChange(item.id, parseInt(e.target.value) || 0)}
                          className={`w-20 text-right font-mono ${tieneCambios ? 'border-amber-500' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          value={valores.maximo ?? ''}
                          onChange={(e) => handleMaximoChange(item.id, e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="—"
                          className={`w-20 text-right font-mono ${tieneCambios ? 'border-amber-500' : ''}`}
                        />
                      </TableCell>
                      <TableCell>
                        {esBajoStock ? (
                          <Badge variant="destructive">Bajo Stock</Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && inventarioFiltrado.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Mostrando {inventarioFiltrado.length} de {inventario.length} insumos</span>
            <span>{inventarioFiltrado.filter(tieneAlertaBaja).length} con stock bajo</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EdicionMasivaMínimos;
