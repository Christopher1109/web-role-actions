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
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHospital } from '@/contexts/HospitalContext';
import { Plus, Warehouse, ArrowRight, ArrowLeft, Package, RefreshCw, Search, Trash2, CheckSquare } from 'lucide-react';
import { assertSupabaseOk, createTimer, logInventoryOp } from '@/utils/supabaseAssert';
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
  const [dialogEliminarOpen, setDialogEliminarOpen] = useState(false);
  const [almacenAEliminar, setAlmacenAEliminar] = useState<AlmacenProvisional | null>(null);
  const [inventarioAlmacenEliminar, setInventarioAlmacenEliminar] = useState<InventarioProvisional[]>([]);
  const [modoEliminar, setModoEliminar] = useState<'confirmar' | 'inspeccionar'>('confirmar');

  // Form states
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [cantidadesTraspaso, setCantidadesTraspaso] = useState<Record<string, number>>({});
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<string, number>>({});
  const [procesando, setProcesando] = useState(false);
  const [progresoTraspaso, setProgresoTraspaso] = useState(0);
  const [mensajeProgreso, setMensajeProgreso] = useState('');

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
      
      // Consolidar por insumo_catalogo_id (sumar cantidades de diferentes lotes)
      const consolidado = new Map<string, InventarioGeneral>();
      for (const item of (data || [])) {
        const existing = consolidado.get(item.insumo_catalogo_id);
        if (existing) {
          existing.cantidad_actual += item.cantidad_actual;
        } else {
          consolidado.set(item.insumo_catalogo_id, { ...item });
        }
      }
      
      setInventarioGeneral(Array.from(consolidado.values()));
    } catch (error) {
      console.error('Error fetching general inventory:', error);
    }
  };

  const toggleSeleccion = (insumoCatalogoId: string) => {
    const nuevos = new Set(seleccionados);
    if (nuevos.has(insumoCatalogoId)) {
      nuevos.delete(insumoCatalogoId);
      // También limpiar la cantidad
      const nuevasCantidades = { ...cantidadesTraspaso };
      delete nuevasCantidades[insumoCatalogoId];
      setCantidadesTraspaso(nuevasCantidades);
    } else {
      nuevos.add(insumoCatalogoId);
    }
    setSeleccionados(nuevos);
  };

  const seleccionarTodos = () => {
    const nuevos = new Set(filteredInventarioGeneral.map(item => item.insumo_catalogo_id));
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
    setCantidadesTraspaso({});
    setSeleccionados(new Set());
    setSearchTerm('');
    setProgresoTraspaso(0);
    setMensajeProgreso('');
    setDialogTraspasoOpen(true);
  };

  const ejecutarTraspaso = async () => {
    const timer = createTimer('ejecutarTraspaso');
    
    if (!selectedHospital || !selectedAlmacen) {
      toast.error('No hay almacén seleccionado');
      return;
    }

    const itemsTraspaso = Object.entries(cantidadesTraspaso)
      .filter(([insumoCatalogoId, cantidad]) => seleccionados.has(insumoCatalogoId) && cantidad > 0);
    
    if (itemsTraspaso.length === 0) {
      toast.error('Selecciona al menos un insumo y asigna cantidades');
      return;
    }

    console.log('🔄 [TRASPASO] Iniciando:', {
      hospital_id: selectedHospital.id,
      almacen_provisional_id: selectedAlmacen.id,
      items: itemsTraspaso.length
    });

    setProcesando(true);
    setProgresoTraspaso(0);
    setMensajeProgreso('Preparando traspaso...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const almacenId = selectedAlmacen.id;
      const hospitalId = selectedHospital.id;
      const totalItems = itemsTraspaso.length;

      // Obtener todos los lotes del inventario general en una sola query
      timer.log('Cargando inventario general');
      setMensajeProgreso('Cargando inventario...');
      const lotesResult = await supabase
        .from('inventario_hospital')
        .select('id, insumo_catalogo_id, cantidad_actual')
        .eq('hospital_id', hospitalId)
        .gt('cantidad_actual', 0)
        .order('created_at', { ascending: true });

      const todosLotes = assertSupabaseOk(lotesResult, 'Cargar inventario general', { throwError: false });
      logInventoryOp('Carga inventario general', { hospital_id: hospitalId, result: { count: todosLotes?.length || 0 } });

      // Obtener inventario provisional actual en una sola query
      timer.log('Cargando inventario provisional');
      const provResult = await supabase
        .from('almacen_provisional_inventario')
        .select('id, insumo_catalogo_id, cantidad_disponible')
        .eq('almacen_provisional_id', almacenId);

      const inventarioProv = assertSupabaseOk(provResult, 'Cargar inventario provisional', { throwError: false });
      logInventoryOp('Carga inventario provisional', { almacen_provisional_id: almacenId, result: { count: inventarioProv?.length || 0 } });

      // Crear mapas para acceso rápido O(1)
      const lotesPorInsumo = new Map<string, Array<{ id: string; cantidad_actual: number }>>();
      for (const lote of (todosLotes || [])) {
        const arr = lotesPorInsumo.get(lote.insumo_catalogo_id) || [];
        arr.push({ id: lote.id, cantidad_actual: lote.cantidad_actual });
        lotesPorInsumo.set(lote.insumo_catalogo_id, arr);
      }

      const provPorInsumo = new Map<string, { id: string; cantidad_disponible: number }>();
      for (const item of (inventarioProv || [])) {
        provPorInsumo.set(item.insumo_catalogo_id, { id: item.id, cantidad_disponible: item.cantidad_disponible });
      }

      // Preparar todas las operaciones
      timer.log('Preparando operaciones');
      setMensajeProgreso('Procesando traspasos...');
      const updateLotes: Array<{ id: string; cantidad_actual: number; insumo_id: string }> = [];
      const updateProv: Array<{ id: string; cantidad_disponible: number; insumo_id: string }> = [];
      const insertProv: Array<{ almacen_provisional_id: string; insumo_catalogo_id: string; cantidad_disponible: number }> = [];
      const movimientos: Array<{
        almacen_provisional_id: string;
        hospital_id: string;
        insumo_catalogo_id: string;
        cantidad: number;
        tipo: string;
        usuario_id: string | undefined;
        observaciones: string;
      }> = [];

      let procesados = 0;
      for (const [insumoCatalogoId, cantidadSolicitada] of itemsTraspaso) {
        const lotes = lotesPorInsumo.get(insumoCatalogoId) || [];
        let cantidadRestante = cantidadSolicitada;

        // Calcular descuentos de lotes
        for (const lote of lotes) {
          if (cantidadRestante <= 0) break;
          const aDescontar = Math.min(cantidadRestante, lote.cantidad_actual);
          updateLotes.push({ id: lote.id, cantidad_actual: lote.cantidad_actual - aDescontar, insumo_id: insumoCatalogoId });
          cantidadRestante -= aDescontar;
        }

        // Preparar actualización/inserción en provisional
        const existente = provPorInsumo.get(insumoCatalogoId);
        if (existente) {
          updateProv.push({
            id: existente.id,
            cantidad_disponible: (existente.cantidad_disponible || 0) + cantidadSolicitada,
            insumo_id: insumoCatalogoId
          });
        } else {
          insertProv.push({
            almacen_provisional_id: almacenId,
            insumo_catalogo_id: insumoCatalogoId,
            cantidad_disponible: cantidadSolicitada
          });
        }

        // Preparar movimiento
        movimientos.push({
          almacen_provisional_id: almacenId,
          hospital_id: hospitalId,
          insumo_catalogo_id: insumoCatalogoId,
          cantidad: cantidadSolicitada,
          tipo: 'entrada',
          usuario_id: user?.id,
          observaciones: 'Traspaso desde almacén general'
        });

        procesados++;
        setProgresoTraspaso(Math.round((procesados / totalItems) * 50));
      }

      console.log('📦 [TRASPASO] Operaciones preparadas:', {
        updateLotes: updateLotes.length,
        updateProv: updateProv.length,
        insertProv: insertProv.length,
        movimientos: movimientos.length
      });

      // Ejecutar todas las operaciones en paralelo por tipo
      timer.log('Ejecutando updates de lotes');
      setMensajeProgreso(`Guardando ${procesados} traspasos...`);
      
      // Updates de lotes en batches de 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < updateLotes.length; i += BATCH_SIZE) {
        const batch = updateLotes.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(lote =>
          supabase.from('inventario_hospital')
            .update({ cantidad_actual: lote.cantidad_actual, updated_at: new Date().toISOString() })
            .eq('id', lote.id)
        ));
        
        // Verificar errores en batch
        results.forEach((r, idx) => {
          if (r.error) {
            console.error(`❌ [TRASPASO] Error update lote ${batch[idx].id}:`, r.error);
          }
        });
        
        setProgresoTraspaso(50 + Math.round((i / updateLotes.length) * 20));
      }

      // Updates de provisional
      timer.log('Ejecutando updates provisional');
      if (updateProv.length > 0) {
        const provResults = await Promise.all(updateProv.map(item =>
          supabase.from('almacen_provisional_inventario')
            .update({ cantidad_disponible: item.cantidad_disponible, updated_at: new Date().toISOString() })
            .eq('id', item.id)
        ));
        
        provResults.forEach((r, idx) => {
          logInventoryOp(`Update provisional ${updateProv[idx].insumo_id}`, {
            almacen_provisional_id: almacenId,
            insumo_catalogo_id: updateProv[idx].insumo_id,
            cantidad: updateProv[idx].cantidad_disponible,
            error: r.error
          });
        });
      }

      // Inserts de provisional
      timer.log('Ejecutando inserts provisional');
      if (insertProv.length > 0) {
        const insertResult = await supabase.from('almacen_provisional_inventario').insert(insertProv);
        if (insertResult.error) {
          console.error('❌ [TRASPASO] Error insert provisional:', insertResult.error);
          toast.error('Error al insertar en provisional', { description: insertResult.error.message });
        } else {
          console.log('✅ [TRASPASO] Insertados en provisional:', insertProv.length);
        }
      }
      setProgresoTraspaso(80);

      // Insertar movimientos en batch
      timer.log('Insertando movimientos');
      if (movimientos.length > 0) {
        const movResult = await supabase.from('movimientos_almacen_provisional').insert(movimientos);
        if (movResult.error) {
          console.error('❌ [TRASPASO] Error insert movimientos:', movResult.error);
        }
      }
      setProgresoTraspaso(100);

      const totalTime = timer.end();
      console.log(`✅ [TRASPASO] Completado en ${totalTime.toFixed(0)}ms - ${procesados} items`);

      toast.success(`${procesados} insumos traspasados correctamente`, {
        description: `Tiempo: ${(totalTime / 1000).toFixed(1)}s`
      });
      setDialogTraspasoOpen(false);
      setCantidadesTraspaso({});
      setSeleccionados(new Set());
      fetchInventarioProvisional(almacenId);
    } catch (error: any) {
      console.error('❌ [TRASPASO] Error general:', error);
      toast.error('Error al realizar traspaso', {
        description: error.message || 'Error desconocido'
      });
    } finally {
      setProcesando(false);
      setProgresoTraspaso(0);
      setMensajeProgreso('');
    }
  };

  const abrirDialogDevolucion = () => {
    if (!selectedAlmacen) return;
    setCantidadesDevolucion({});
    setDialogDevolucionOpen(true);
  };

  const ejecutarDevolucion = async () => {
    const timer = createTimer('ejecutarDevolucion');
    
    if (!selectedHospital || !selectedAlmacen) {
      toast.error('Datos incompletos');
      return;
    }

    const itemsDevolucion = Object.entries(cantidadesDevolucion).filter(([_, cantidad]) => cantidad > 0);
    if (itemsDevolucion.length === 0) {
      toast.error('Selecciona al menos un insumo');
      return;
    }

    console.log('🔄 [DEVOLUCION] Iniciando:', {
      hospital_id: selectedHospital.id,
      almacen_provisional_id: selectedAlmacen.id,
      items: itemsDevolucion.length
    });

    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get almacen_id for general inventory
      timer.log('Buscando almacén general');
      const almacenResult = await supabase
        .from('almacenes')
        .select('id')
        .eq('hospital_id', selectedHospital.id)
        .maybeSingle();

      const almacenGeneral = assertSupabaseOk(almacenResult, 'Buscar almacén general', { throwError: false });

      if (!almacenGeneral) {
        toast.error('No se encontró almacén general', {
          description: 'Verifica que el hospital tenga un almacén configurado'
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const [inventarioProvId, cantidad] of itemsDevolucion) {
        const item = inventarioProvisional.find(i => i.id === inventarioProvId);
        if (!item || cantidad > item.cantidad_disponible) {
          console.warn(`⚠️ [DEVOLUCION] Item inválido o cantidad excede disponible:`, { inventarioProvId, cantidad, disponible: item?.cantidad_disponible });
          continue;
        }

        logInventoryOp('Procesando devolución item', {
          almacen_provisional_id: selectedAlmacen.id,
          insumo_catalogo_id: item.insumo_catalogo_id,
          cantidad
        });

        // Descontar del provisional
        const updateProvResult = await supabase
          .from('almacen_provisional_inventario')
          .update({
            cantidad_disponible: item.cantidad_disponible - cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventarioProvId);

        if (updateProvResult.error) {
          console.error('❌ [DEVOLUCION] Error update provisional:', updateProvResult.error);
          errorCount++;
          continue;
        }

        // Agregar al inventario general
        const existenteResult = await supabase
          .from('inventario_hospital')
          .select('id, cantidad_actual')
          .eq('hospital_id', selectedHospital.id)
          .eq('insumo_catalogo_id', item.insumo_catalogo_id)
          .maybeSingle();

        if (existenteResult.data) {
          const updateResult = await supabase
            .from('inventario_hospital')
            .update({
              cantidad_actual: (existenteResult.data.cantidad_actual || 0) + cantidad,
              updated_at: new Date().toISOString()
            })
            .eq('id', existenteResult.data.id);

          if (updateResult.error) {
            console.error('❌ [DEVOLUCION] Error update inventario:', updateResult.error);
            errorCount++;
            continue;
          }
        } else {
          const insertResult = await supabase
            .from('inventario_hospital')
            .insert({
              hospital_id: selectedHospital.id,
              almacen_id: almacenGeneral.id,
              insumo_catalogo_id: item.insumo_catalogo_id,
              cantidad_actual: cantidad,
              cantidad_inicial: cantidad,
              cantidad_minima: 10
            });

          if (insertResult.error) {
            console.error('❌ [DEVOLUCION] Error insert inventario:', insertResult.error);
            errorCount++;
            continue;
          }
        }

        // Registrar movimiento
        const movResult = await supabase
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

        if (movResult.error) {
          console.warn('⚠️ [DEVOLUCION] Error registrando movimiento:', movResult.error);
        }

        successCount++;
      }

      const totalTime = timer.end();
      console.log(`✅ [DEVOLUCION] Completado: ${successCount} éxitos, ${errorCount} errores, ${totalTime.toFixed(0)}ms`);

      if (errorCount > 0) {
        toast.warning(`Devolución parcial: ${successCount} éxitos, ${errorCount} errores`);
      } else {
        toast.success(`${successCount} insumos devueltos al almacén general`);
      }
      
      setDialogDevolucionOpen(false);
      setCantidadesDevolucion({});
      fetchInventarioProvisional(selectedAlmacen.id);
    } catch (error: any) {
      console.error('❌ [DEVOLUCION] Error general:', error);
      toast.error('Error al realizar devolución', {
        description: error.message || 'Error desconocido'
      });
    } finally {
      setProcesando(false);
    }
  };

  const abrirDialogEliminar = async (almacen: AlmacenProvisional) => {
    // Verificar si tiene inventario
    try {
      const { data: inventario, error } = await supabase
        .from('almacen_provisional_inventario')
        .select(`
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `)
        .eq('almacen_provisional_id', almacen.id)
        .gt('cantidad_disponible', 0);

      if (error) throw error;

      setAlmacenAEliminar(almacen);
      setInventarioAlmacenEliminar(inventario || []);
      setModoEliminar('confirmar');
      setDialogEliminarOpen(true);
    } catch (error) {
      console.error('Error checking inventory:', error);
      toast.error('Error al verificar inventario');
    }
  };

  const ejecutarEliminacion = async (devolverTodo: boolean) => {
    const timer = createTimer('ejecutarEliminacion');
    
    if (!almacenAEliminar || !selectedHospital) {
      toast.error('Datos incompletos para eliminar');
      return;
    }

    const almacenIdEliminar = almacenAEliminar.id;
    const almacenNombre = almacenAEliminar.nombre;
    
    console.log('🗑️ [ELIMINACION] Iniciando:', {
      almacen_id: almacenIdEliminar,
      nombre: almacenNombre,
      hospital_id: selectedHospital.id,
      devolverTodo,
      itemsADevolver: inventarioAlmacenEliminar.length
    });
    
    setProcesando(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Si hay inventario y se quiere devolver
      if (devolverTodo && inventarioAlmacenEliminar.length > 0) {
        timer.log('Buscando almacén general para devolución');
        const almacenResult = await supabase
          .from('almacenes')
          .select('id')
          .eq('hospital_id', selectedHospital.id)
          .maybeSingle();

        const almacenGeneral = assertSupabaseOk(almacenResult, 'Buscar almacén general', { throwError: false });

        if (!almacenGeneral) {
          toast.error('No se encontró almacén general');
          setProcesando(false);
          return;
        }

        timer.log('Procesando devoluciones');
        for (const item of inventarioAlmacenEliminar) {
          const cantidad = item.cantidad_disponible;
          if (cantidad <= 0) continue;

          logInventoryOp('Devolviendo item por eliminación', {
            almacen_provisional_id: almacenIdEliminar,
            insumo_catalogo_id: item.insumo_catalogo_id,
            cantidad
          });

          const existenteResult = await supabase
            .from('inventario_hospital')
            .select('id, cantidad_actual')
            .eq('hospital_id', selectedHospital.id)
            .eq('insumo_catalogo_id', item.insumo_catalogo_id)
            .maybeSingle();

          if (existenteResult.data) {
            const updateResult = await supabase
              .from('inventario_hospital')
              .update({
                cantidad_actual: (existenteResult.data.cantidad_actual || 0) + cantidad,
                updated_at: new Date().toISOString()
              })
              .eq('id', existenteResult.data.id);
            
            if (updateResult.error) {
              console.error('❌ [ELIMINACION] Error actualizando inventario:', updateResult.error);
            }
          } else {
            const insertResult = await supabase
              .from('inventario_hospital')
              .insert({
                hospital_id: selectedHospital.id,
                almacen_id: almacenGeneral.id,
                insumo_catalogo_id: item.insumo_catalogo_id,
                cantidad_actual: cantidad,
                cantidad_inicial: cantidad,
                cantidad_minima: 10
              });
            
            if (insertResult.error) {
              console.error('❌ [ELIMINACION] Error insertando inventario:', insertResult.error);
            }
          }

          await supabase
            .from('movimientos_almacen_provisional')
            .insert({
              almacen_provisional_id: almacenIdEliminar,
              hospital_id: selectedHospital.id,
              insumo_catalogo_id: item.insumo_catalogo_id,
              cantidad: cantidad,
              tipo: 'salida',
              usuario_id: user?.id,
              observaciones: 'Devolución por eliminación de almacén provisional'
            });
        }
      }

      // Marcar almacén como inactivo
      timer.log('Marcando almacén como inactivo');
      const updateResult = await supabase
        .from('almacenes_provisionales')
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq('id', almacenIdEliminar);

      if (updateResult.error) {
        console.error('❌ [ELIMINACION] Error marcando inactivo:', updateResult.error);
        toast.error('Error al desactivar almacén', {
          description: updateResult.error.message
        });
        throw updateResult.error;
      }

      console.log('✅ [ELIMINACION] Almacén marcado como inactivo:', almacenIdEliminar);

      // Limpiar estado local ANTES de refrescar
      if (selectedAlmacen?.id === almacenIdEliminar) {
        setSelectedAlmacen(null);
        setInventarioProvisional([]);
      }
      
      // Cerrar diálogo y limpiar estado
      setDialogEliminarOpen(false);
      setAlmacenAEliminar(null);
      setInventarioAlmacenEliminar([]);
      
      // Actualizar lista desde la base de datos (CRÍTICO: después de cerrar diálogo)
      timer.log('Refrescando lista de almacenes');
      await fetchAlmacenes();
      
      const totalTime = timer.end();
      console.log(`✅ [ELIMINACION] Completado en ${totalTime.toFixed(0)}ms`);
      
      toast.success(`Almacén "${almacenNombre}" eliminado correctamente`);
    } catch (error: any) {
      console.error('❌ [ELIMINACION] Error general:', error);
      toast.error('Error al eliminar almacén', {
        description: error.message || 'Error desconocido'
      });
    } finally {
      setProcesando(false);
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
                              abrirDialogEliminar(almacen);
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

      {/* Dialog: Traspaso desde general */}
      <Dialog open={dialogTraspasoOpen} onOpenChange={setDialogTraspasoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Agregar Insumos a {selectedAlmacen?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Barra de progreso cuando se está procesando */}
            {procesando && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{mensajeProgreso}</span>
                  <span className="font-medium">{progresoTraspaso}%</span>
                </div>
                <Progress value={progresoTraspaso} className="h-2" />
              </div>
            )}

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
                    const isSelected = seleccionados.has(item.insumo_catalogo_id);
                    return (
                      <TableRow 
                        key={item.insumo_catalogo_id}
                        className={isSelected ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSeleccion(item.insumo_catalogo_id)}
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
                            value={cantidadesTraspaso[item.insumo_catalogo_id] || ''}
                            onChange={(e) => {
                              const valor = Math.min(Number(e.target.value), item.cantidad_actual);
                              setCantidadesTraspaso(prev => ({
                                ...prev,
                                [item.insumo_catalogo_id]: valor
                              }));
                              if (valor > 0 && !seleccionados.has(item.insumo_catalogo_id)) {
                                setSeleccionados(prev => new Set([...prev, item.insumo_catalogo_id]));
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

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={dialogEliminarOpen} onOpenChange={setDialogEliminarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Almacén "{almacenAEliminar?.nombre}"
            </DialogTitle>
          </DialogHeader>
          
          {modoEliminar === 'confirmar' ? (
            <div className="space-y-4">
              {inventarioAlmacenEliminar.length > 0 ? (
                <>
                  <Alert>
                    <AlertDescription>
                      Este almacén tiene <strong>{inventarioAlmacenEliminar.length} insumos</strong> con un total de{' '}
                      <strong>{inventarioAlmacenEliminar.reduce((sum, i) => sum + i.cantidad_disponible, 0)} unidades</strong>.
                    </AlertDescription>
                  </Alert>
                  <p className="text-sm text-muted-foreground">
                    ¿Qué deseas hacer con los insumos?
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => ejecutarEliminacion(true)} 
                      disabled={procesando}
                      className="justify-start"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Devolver todo al almacén general y eliminar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setModoEliminar('inspeccionar')}
                      className="justify-start"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Inspeccionar insumos primero
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setDialogEliminarOpen(false)}
                      className="justify-start"
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Este almacén está vacío. ¿Confirmas que deseas eliminarlo?
                  </p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogEliminarOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => ejecutarEliminacion(false)}
                      disabled={procesando}
                    >
                      {procesando ? 'Eliminando...' : 'Eliminar Almacén'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Insumos en el almacén:
              </p>
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventarioAlmacenEliminar.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.insumo?.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{item.cantidad_disponible}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setModoEliminar('confirmar')}>
                  Volver
                </Button>
                <Button onClick={() => ejecutarEliminacion(true)} disabled={procesando}>
                  {procesando ? 'Procesando...' : 'Devolver todo y eliminar'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlmacenesProvisionales;
