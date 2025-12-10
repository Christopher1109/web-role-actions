import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHospital } from '@/contexts/HospitalContext';
import { Plus, Warehouse, ArrowRight, ArrowLeft, Package, RefreshCw, Search, Trash2 } from 'lucide-react';

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

  // Form states
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [cantidadesTraspaso, setCantidadesTraspaso] = useState<Record<string, number>>({});
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<string, number>>({});
  const [procesando, setProcesando] = useState(false);

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
    setDialogTraspasoOpen(true);
  };

  const ejecutarTraspaso = async () => {
    if (!selectedHospital || !selectedAlmacen) return;

    const itemsTraspaso = Object.entries(cantidadesTraspaso).filter(([_, cantidad]) => cantidad > 0);
    if (itemsTraspaso.length === 0) {
      toast.error('Selecciona al menos un insumo');
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

      {/* Dialog: Traspaso desde general */}
      <Dialog open={dialogTraspasoOpen} onOpenChange={setDialogTraspasoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Insumos a {selectedAlmacen?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right w-24">Traspasar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventarioGeneral.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.insumo?.nombre}</TableCell>
                      <TableCell className="text-right font-mono">{item.cantidad_actual}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={item.cantidad_actual}
                          value={cantidadesTraspaso[item.id] || ''}
                          onChange={(e) => setCantidadesTraspaso(prev => ({
                            ...prev,
                            [item.id]: Math.min(Number(e.target.value), item.cantidad_actual)
                          }))}
                          className="h-8 w-20"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTraspasoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={ejecutarTraspaso} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Traspasar Insumos'}
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
