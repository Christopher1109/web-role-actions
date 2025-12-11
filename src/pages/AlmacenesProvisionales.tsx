import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHospital } from '@/contexts/HospitalContext';
import { Plus, Warehouse, ArrowRight, ArrowLeft, Package, RefreshCw, Search, Trash2, Zap, CheckSquare } from 'lucide-react';

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

interface InventarioGeneral {
  id: string;
  insumo_catalogo_id: string;
  cantidad_actual: number;
  insumo?: { id: string; nombre: string; clave: string };
}

interface AnestesiaInsumo {
  insumo_id: string;
  cantidad_default: number;
  insumo?: { id: string; nombre: string; clave: string };
}

const PROCEDIMIENTOS_LABELS: Record<string, string> = {
  'general_balanceada_adulto': 'Anestesia General Balanceada Adulto',
  'general_endovenosa': 'Anestesia General Endovenosa',
  'general_balanceada_pediatrica': 'Anestesia General Balanceada Pediátrica',
  'loco_regional': 'Anestesia Loco Regional',
  'sedacion': 'Sedación',
  'alta_especialidad': 'Alta Especialidad',
  'alta_especialidad_neurocirugia': 'Alta Especialidad Neurocirugía',
  '19.01.008': 'Trasplante Hepático (19.01.008)',
  '19.01.009': 'Trasplante Renal (19.01.009)',
  '19.01.010': 'Procedimiento 19.01.010',
};

const AlmacenesProvisionales = () => {
  const { selectedHospital } = useHospital();
  const [almacenes, setAlmacenes] = useState<AlmacenProvisional[]>([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenProvisional | null>(null);
  const [inventarioProvisional, setInventarioProvisional] = useState<InventarioProvisional[]>([]);
  const [inventarioGeneral, setInventarioGeneral] = useState<InventarioGeneral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [dialogCrearOpen, setDialogCrearOpen] = useState(false);
  const [dialogTraspasoOpen, setDialogTraspasoOpen] = useState(false);
  const [dialogDevolucionOpen, setDialogDevolucionOpen] = useState(false);

  // Form states
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [cantidadesTraspaso, setCantidadesTraspaso] = useState<Record<string, number>>({});
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<string, number>>({});
  const [procesando, setProcesando] = useState(false);
  
  // Procedimiento selector
  const [procedimientoSeleccionado, setProcedimientoSeleccionado] = useState<string>('');
  const [procedimientosDisponibles, setProcedimientosDisponibles] = useState<string[]>([]);

  useEffect(() => {
    if (selectedHospital) {
      fetchAlmacenes();
    }
  }, [selectedHospital]);

  useEffect(() => {
    if (selectedAlmacen) {
      fetchInventarioProvisional(selectedAlmacen.id);
    }
  }, [selectedAlmacen]);

  const fetchAlmacenes = async () => {
    if (!selectedHospital) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('almacenes_provisionales')
        .select('*')
        .eq('hospital_id', selectedHospital.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlmacenes(data || []);
      
      // Auto-select first if available
      if (data && data.length > 0 && !selectedAlmacen) {
        setSelectedAlmacen(data[0]);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('Error al cargar almacenes');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventarioProvisional = async (almacenId: string) => {
    try {
      const { data, error } = await supabase
        .from('almacen_provisional_inventario')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('almacen_provisional_id', almacenId)
        .gt('cantidad_disponible', 0);

      if (error) throw error;
      setInventarioProvisional(data || []);
    } catch (error) {
      console.error('Error fetching provisional inventory:', error);
    }
  };

  const fetchInventarioGeneral = async () => {
    if (!selectedHospital) return;
    
    try {
      const { data, error } = await supabase
        .from('inventario_hospital')
        .select(`
          id,
          insumo_catalogo_id,
          cantidad_actual,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('hospital_id', selectedHospital.id)
        .gt('cantidad_actual', 0)
        .order('insumo_catalogo_id');

      if (error) throw error;
      setInventarioGeneral(data || []);
    } catch (error) {
      console.error('Error fetching general inventory:', error);
    }
  };

  const fetchProcedimientosDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from('anestesia_insumos')
        .select('tipo_anestesia')
        .eq('activo', true);

      if (error) throw error;
      
      const tipos = [...new Set(data?.map(d => d.tipo_anestesia) || [])];
      setProcedimientosDisponibles(tipos);
    } catch (error) {
      console.error('Error fetching procedures:', error);
    }
  };

  const precargarInsumosProcedimiento = async () => {
    if (!procedimientoSeleccionado) {
      toast.error('Selecciona un procedimiento');
      return;
    }

    try {
      // Obtener insumos del procedimiento
      const { data: anestesiaInsumos, error } = await supabase
        .from('anestesia_insumos')
        .select(`
          insumo_id,
          cantidad_default,
          insumo:insumos(id, nombre, clave)
        `)
        .eq('tipo_anestesia', procedimientoSeleccionado)
        .eq('activo', true);

      if (error) throw error;

      if (!anestesiaInsumos || anestesiaInsumos.length === 0) {
        toast.info('No hay insumos configurados para este procedimiento');
        return;
      }

      // Crear mapa de insumo_id a nombre para buscar en inventario
      const insumoNombres = new Map<string, { nombre: string; cantidad: number }>();
      anestesiaInsumos.forEach(ai => {
        if (ai.insumo?.nombre) {
          insumoNombres.set(ai.insumo.nombre.toUpperCase().trim(), {
            nombre: ai.insumo.nombre,
            cantidad: ai.cantidad_default || 1
          });
        }
      });

      // Buscar en inventario general por nombre (ya que los IDs pueden no coincidir)
      const nuevasCantidades: Record<string, number> = { ...cantidadesTraspaso };
      const nuevosSeleccionados = new Set(seleccionados);
      let encontrados = 0;

      for (const item of inventarioGeneral) {
        const nombreUpper = item.insumo?.nombre?.toUpperCase().trim() || '';
        const match = insumoNombres.get(nombreUpper);
        
        if (match) {
          const cantidadRequerida = Math.min(match.cantidad, item.cantidad_actual);
          if (cantidadRequerida > 0) {
            nuevasCantidades[item.id] = cantidadRequerida;
            nuevosSeleccionados.add(item.id);
            encontrados++;
          }
        }
      }

      setCantidadesTraspaso(nuevasCantidades);
      setSeleccionados(nuevosSeleccionados);
      
      toast.success(`${encontrados} insumos pre-cargados del procedimiento`);
    } catch (error) {
      console.error('Error loading procedure insumos:', error);
      toast.error('Error al cargar insumos del procedimiento');
    }
  };

  const toggleSeleccion = (id: string) => {
    const nuevos = new Set(seleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
      // También limpiar la cantidad
      const nuevasCantidades = { ...cantidadesTraspaso };
      delete nuevasCantidades[id];
      setCantidadesTraspaso(nuevasCantidades);
    } else {
      nuevos.add(id);
    }
    setSeleccionados(nuevos);
  };

  const seleccionarTodos = () => {
    const nuevos = new Set(filteredInventarioGeneral.map(item => item.id));
    setSeleccionados(nuevos);
  };

  const deseleccionarTodos = () => {
    setSeleccionados(new Set());
    setCantidadesTraspaso({});
  };

  const crearAlmacen = async () => {
    if (!selectedHospital || !nuevoNombre.trim()) return;

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('almacenes_provisionales')
        .insert({
          hospital_id: selectedHospital.id,
          nombre: nuevoNombre.trim(),
          descripcion: nuevaDescripcion.trim() || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Almacén provisional creado');
      setDialogCrearOpen(false);
      setNuevoNombre('');
      setNuevaDescripcion('');
      fetchAlmacenes();
      
      // Auto-select the new warehouse
      if (data) {
        setSelectedAlmacen(data);
      }
    } catch (error) {
      console.error('Error creating warehouse:', error);
      toast.error('Error al crear almacén');
    } finally {
      setProcesando(false);
    }
  };

  const abrirDialogTraspaso = () => {
    if (!selectedAlmacen) return;
    fetchInventarioGeneral();
    fetchProcedimientosDisponibles();
    setCantidadesTraspaso({});
    setSeleccionados(new Set());
    setProcedimientoSeleccionado('');
    setSearchTerm('');
    setDialogTraspasoOpen(true);
  };

  const ejecutarTraspaso = async () => {
    if (!selectedHospital || !selectedAlmacen) return;

    // Filtrar solo items seleccionados con cantidad > 0
    const itemsTraspaso = Object.entries(cantidadesTraspaso)
      .filter(([id, cantidad]) => seleccionados.has(id) && cantidad > 0);
    
    if (itemsTraspaso.length === 0) {
      toast.error('Selecciona al menos un insumo y asigna cantidades');
      return;
    }

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const [inventarioId, cantidad] of itemsTraspaso) {
        const item = inventarioGeneral.find(i => i.id === inventarioId);
        if (!item || cantidad > item.cantidad_actual) continue;

        // Descontar del inventario general
        await supabase
          .from('inventario_hospital')
          .update({
            cantidad_actual: item.cantidad_actual - cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventarioId);

        // Agregar al inventario provisional
        const { data: existente } = await supabase
          .from('almacen_provisional_inventario')
          .select('*')
          .eq('almacen_provisional_id', selectedAlmacen.id)
          .eq('insumo_catalogo_id', item.insumo_catalogo_id)
          .maybeSingle();

        if (existente) {
          await supabase
            .from('almacen_provisional_inventario')
            .update({
              cantidad_disponible: (existente.cantidad_disponible || 0) + cantidad,
              updated_at: new Date().toISOString()
            })
            .eq('id', existente.id);
        } else {
          await supabase
            .from('almacen_provisional_inventario')
            .insert({
              almacen_provisional_id: selectedAlmacen.id,
              insumo_catalogo_id: item.insumo_catalogo_id,
              cantidad_disponible: cantidad
            });
        }

        // Registrar movimiento
        await supabase
          .from('movimientos_almacen_provisional')
          .insert({
            almacen_provisional_id: selectedAlmacen.id,
            hospital_id: selectedHospital.id,
            insumo_catalogo_id: item.insumo_catalogo_id,
            cantidad: cantidad,
            tipo: 'entrada',
            usuario_id: user?.id,
            observaciones: 'Traspaso desde almacén general'
          });
      }

      toast.success(`${itemsTraspaso.length} insumos traspasados al almacén provisional`);
      setDialogTraspasoOpen(false);
      fetchInventarioProvisional(selectedAlmacen.id);
    } catch (error) {
      console.error('Error executing transfer:', error);
      toast.error('Error al realizar traspaso');
    } finally {
      setProcesando(false);
    }
  };

  const abrirDialogDevolucion = () => {
    if (!selectedAlmacen) return;
    setCantidadesDevolucion({});
    setDialogDevolucionOpen(true);
  };

  const ejecutarDevolucion = async () => {
    if (!selectedHospital || !selectedAlmacen) return;

    const itemsDevolucion = Object.entries(cantidadesDevolucion).filter(([_, cantidad]) => cantidad > 0);
    if (itemsDevolucion.length === 0) {
      toast.error('Selecciona al menos un insumo');
      return;
    }

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get almacen_id for general inventory
      const { data: almacenGeneral } = await supabase
        .from('almacenes')
        .select('id')
        .eq('hospital_id', selectedHospital.id)
        .maybeSingle();

      if (!almacenGeneral) {
        toast.error('No se encontró almacén general');
        return;
      }

      for (const [inventarioProvId, cantidad] of itemsDevolucion) {
        const item = inventarioProvisional.find(i => i.id === inventarioProvId);
        if (!item || cantidad > item.cantidad_disponible) continue;

        // Descontar del provisional
        await supabase
          .from('almacen_provisional_inventario')
          .update({
            cantidad_disponible: item.cantidad_disponible - cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventarioProvId);

        // Agregar al inventario general
        const { data: existenteGeneral } = await supabase
          .from('inventario_hospital')
          .select('*')
          .eq('hospital_id', selectedHospital.id)
          .eq('insumo_catalogo_id', item.insumo_catalogo_id)
          .maybeSingle();

        if (existenteGeneral) {
          await supabase
            .from('inventario_hospital')
            .update({
              cantidad_actual: (existenteGeneral.cantidad_actual || 0) + cantidad,
              updated_at: new Date().toISOString()
            })
            .eq('id', existenteGeneral.id);
        } else {
          await supabase
            .from('inventario_hospital')
            .insert({
              hospital_id: selectedHospital.id,
              almacen_id: almacenGeneral.id,
              insumo_catalogo_id: item.insumo_catalogo_id,
              cantidad_actual: cantidad,
              cantidad_inicial: cantidad,
              cantidad_minima: 10
            });
        }

        // Registrar movimiento
        await supabase
          .from('movimientos_almacen_provisional')
          .insert({
            almacen_provisional_id: selectedAlmacen.id,
            hospital_id: selectedHospital.id,
            insumo_catalogo_id: item.insumo_catalogo_id,
            cantidad: cantidad,
            tipo: 'salida',
            usuario_id: user?.id,
            observaciones: 'Devolución a almacén general'
          });
      }

      toast.success(`${itemsDevolucion.length} insumos devueltos al almacén general`);
      setDialogDevolucionOpen(false);
      fetchInventarioProvisional(selectedAlmacen.id);
    } catch (error) {
      console.error('Error executing return:', error);
      toast.error('Error al realizar devolución');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarAlmacen = async (almacen: AlmacenProvisional) => {
    if (!confirm(`¿Eliminar el almacén "${almacen.nombre}"? Los insumos serán devueltos al almacén general.`)) return;

    try {
      // First return all inventory to general
      const { data: inventario } = await supabase
        .from('almacen_provisional_inventario')
        .select('*')
        .eq('almacen_provisional_id', almacen.id);

      // Mark as inactive instead of deleting
      await supabase
        .from('almacenes_provisionales')
        .update({ activo: false })
        .eq('id', almacen.id);

      toast.success('Almacén eliminado');
      if (selectedAlmacen?.id === almacen.id) {
        setSelectedAlmacen(null);
      }
      fetchAlmacenes();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error('Error al eliminar almacén');
    }
  };

  const filteredInventarioGeneral = inventarioGeneral.filter(item =>
    item.insumo?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.insumo?.clave?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedHospital) {
    return (
      <Alert>
        <AlertDescription>
          Selecciona un hospital para gestionar almacenes provisionales.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Almacenes Provisionales</h1>
          <p className="text-muted-foreground">Gestiona almacenes temporales para procedimientos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAlmacenes}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setDialogCrearOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Almacén
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: List of warehouses */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Mis Almacenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Cargando...</p>
              ) : almacenes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Warehouse className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No tienes almacenes provisionales</p>
                  <Button variant="link" onClick={() => setDialogCrearOpen(true)}>
                    Crear uno
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {almacenes.map((almacen) => (
                    <Card
                      key={almacen.id}
                      className={`cursor-pointer transition-all ${
                        selectedAlmacen?.id === almacen.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedAlmacen(almacen)}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{almacen.nombre}</p>
                            {almacen.descripcion && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {almacen.descripcion}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarAlmacen(almacen);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Inventory of selected warehouse */}
        <div className="lg:col-span-2">
          {selectedAlmacen ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedAlmacen.nombre}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={abrirDialogTraspaso}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Agregar Insumos
                    </Button>
                    <Button variant="outline" size="sm" onClick={abrirDialogDevolucion}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Devolver al General
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inventarioProvisional.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Este almacén está vacío</p>
                    <Button variant="link" onClick={abrirDialogTraspaso}>
                      Agregar insumos desde el almacén general
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clave</TableHead>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventarioProvisional.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                          <TableCell>{item.insumo?.nombre}</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {item.cantidad_disponible}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Warehouse className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Selecciona un almacén para ver su inventario</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Crear almacén */}
      <Dialog open={dialogCrearOpen} onOpenChange={setDialogCrearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Almacén Provisional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej: Quirófano 1, Urgencias, etc."
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
                placeholder="Descripción opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCrearOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={crearAlmacen} disabled={!nuevoNombre.trim() || procesando}>
              Crear Almacén
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Traspaso desde general - Mejorado con selector de procedimiento */}
      <Dialog open={dialogTraspasoOpen} onOpenChange={setDialogTraspasoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Agregar Insumos a {selectedAlmacen?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Sección de pre-carga por procedimiento */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-1 block">
                      <Zap className="inline h-4 w-4 mr-1" />
                      Pre-cargar por Procedimiento
                    </Label>
                    <Select value={procedimientoSeleccionado} onValueChange={setProcedimientoSeleccionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un procedimiento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {procedimientosDisponibles.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {PROCEDIMIENTOS_LABELS[tipo] || tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={precargarInsumosProcedimiento}
                    disabled={!procedimientoSeleccionado}
                    variant="secondary"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Pre-cargar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Barra de búsqueda y acciones de selección */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar insumo por nombre o clave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                  <CheckSquare className="mr-1 h-4 w-4" />
                  Todos
                </Button>
                <Button variant="outline" size="sm" onClick={deseleccionarTodos}>
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Badge con conteo de seleccionados */}
            {seleccionados.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {seleccionados.size} insumos seleccionados
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Total a traspasar: {Object.values(cantidadesTraspaso).reduce((a, b) => a + b, 0)} unidades
                </span>
              </div>
            )}

            {/* Tabla con checkboxes */}
            <ScrollArea className="h-[350px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-24">Clave</TableHead>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right w-24">Disponible</TableHead>
                    <TableHead className="text-right w-28">Traspasar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventarioGeneral.map((item) => {
                    const isSelected = seleccionados.has(item.id);
                    return (
                      <TableRow 
                        key={item.id}
                        className={isSelected ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSeleccion(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.insumo?.clave}</TableCell>
                        <TableCell className="max-w-[250px] truncate text-sm">
                          {item.insumo?.nombre}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.cantidad_actual}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.cantidad_actual}
                            value={cantidadesTraspaso[item.id] || ''}
                            onChange={(e) => {
                              const valor = Math.min(Number(e.target.value), item.cantidad_actual);
                              setCantidadesTraspaso(prev => ({
                                ...prev,
                                [item.id]: valor
                              }));
                              if (valor > 0 && !seleccionados.has(item.id)) {
                                setSeleccionados(prev => new Set([...prev, item.id]));
                              }
                            }}
                            className="h-8 w-20"
                            disabled={!isSelected}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogTraspasoOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={ejecutarTraspaso} 
              disabled={procesando || seleccionados.size === 0}
            >
              {procesando ? 'Procesando...' : `Traspasar ${seleccionados.size} Insumos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Devolución a general */}
      <Dialog open={dialogDevolucionOpen} onOpenChange={setDialogDevolucionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Devolver Insumos al Almacén General</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">En Provisional</TableHead>
                  <TableHead className="text-right w-24">Devolver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventarioProvisional.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.insumo?.nombre}</TableCell>
                    <TableCell className="text-right font-mono">{item.cantidad_disponible}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.cantidad_disponible}
                        value={cantidadesDevolucion[item.id] || ''}
                        onChange={(e) => setCantidadesDevolucion(prev => ({
                          ...prev,
                          [item.id]: Math.min(Number(e.target.value), item.cantidad_disponible)
                        }))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDevolucionOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={ejecutarDevolucion} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Devolver Insumos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlmacenesProvisionales;
