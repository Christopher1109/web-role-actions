import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Package, 
  AlertTriangle, 
  Edit, 
  Send, 
  History,
  TrendingDown,
  CheckCircle,
  Plus,
  Minus,
  Save
} from 'lucide-react';

interface InventarioItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_actual: number;
  cantidad_minima: number;
  cantidad_maxima: number | null;
  lote: string | null;
  fecha_caducidad: string | null;
  ubicacion: string | null;
  insumo?: {
    nombre: string;
    clave: string;
    categoria: string | null;
  };
}

interface AlertaActiva {
  id: string;
  insumo_catalogo_id: string;
  cantidad_actual: number;
  minimo_permitido: number;
  prioridad: string;
  enviado_a_supervisor: boolean;
  enviado_a_gerente_operaciones: boolean;
  created_at: string;
  insumo?: {
    nombre: string;
    clave: string;
  };
}

interface MovimientoHistorial {
  id: string;
  tipo_movimiento: string;
  cantidad: number;
  cantidad_anterior: number | null;
  cantidad_nueva: number | null;
  observaciones: string | null;
  created_at: string;
}

const prioridadColors: Record<string, string> = {
  critica: 'bg-red-500 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-yellow-500 text-black',
  baja: 'bg-green-500 text-white',
};

export default function AlmacenistaDashboard() {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [alertas, setAlertas] = useState<AlertaActiva[]>([]);
  const [historial, setHistorial] = useState<MovimientoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventarioItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [manualAlertItem, setManualAlertItem] = useState<InventarioItem | null>(null);
  const [manualAlertNotes, setManualAlertNotes] = useState('');

  const [stats, setStats] = useState({
    totalItems: 0,
    itemsBajoMinimo: 0,
    alertasPendientes: 0,
    itemsCriticos: 0,
  });

  useEffect(() => {
    if (selectedHospital) {
      fetchAllData();
    }
  }, [selectedHospital]);

  const fetchAllData = async () => {
    if (!selectedHospital) return;
    setLoading(true);
    await Promise.all([
      fetchInventario(),
      fetchAlertas(),
      fetchHistorial(),
    ]);
    setLoading(false);
  };

  const fetchInventario = async () => {
    if (!selectedHospital) return;
    try {
      const { data, error } = await supabase
        .from('inventario_hospital')
        .select(`
          id,
          insumo_catalogo_id,
          cantidad_actual,
          cantidad_minima,
          cantidad_maxima,
          lote,
          fecha_caducidad,
          ubicacion,
          insumo:insumos_catalogo(nombre, clave, categoria)
        `)
        .eq('hospital_id', selectedHospital.id)
        .order('cantidad_actual', { ascending: true });

      if (error) throw error;

      const items = (data || []) as unknown as InventarioItem[];
      setInventario(items);

      // Calcular stats
      const bajoMinimo = items.filter(i => i.cantidad_actual < i.cantidad_minima);
      const criticos = items.filter(i => i.cantidad_actual === 0);
      
      setStats({
        totalItems: items.length,
        itemsBajoMinimo: bajoMinimo.length,
        alertasPendientes: alertas.filter(a => !a.enviado_a_supervisor).length,
        itemsCriticos: criticos.length,
      });
    } catch (error) {
      console.error('Error fetching inventario:', error);
      toast.error('Error al cargar inventario');
    }
  };

  const fetchAlertas = async () => {
    if (!selectedHospital) return;
    try {
      const { data, error } = await supabase
        .from('insumos_alertas')
        .select(`
          id,
          insumo_catalogo_id,
          cantidad_actual,
          minimo_permitido,
          prioridad,
          enviado_a_supervisor,
          enviado_a_gerente_operaciones,
          created_at,
          insumo:insumos_catalogo(nombre, clave)
        `)
        .eq('hospital_id', selectedHospital.id)
        .eq('estado', 'activa')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlertas((data || []) as unknown as AlertaActiva[]);
      
      // Actualizar stat de alertas pendientes
      setStats(prev => ({
        ...prev,
        alertasPendientes: (data || []).filter((a: any) => !a.enviado_a_supervisor).length,
      }));
    } catch (error) {
      console.error('Error fetching alertas:', error);
    }
  };

  const fetchHistorial = async () => {
    if (!selectedHospital) return;
    try {
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .select('id, tipo_movimiento, cantidad, cantidad_anterior, cantidad_nueva, observaciones, created_at')
        .eq('hospital_id', selectedHospital.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setHistorial((data || []) as MovimientoHistorial[]);
    } catch (error) {
      console.error('Error fetching historial:', error);
    }
  };

  const handleUpdateMinimos = async () => {
    if (!editingItem) return;
    
    try {
      const { error } = await supabase
        .from('inventario_hospital')
        .update({
          cantidad_minima: editingItem.cantidad_minima,
          cantidad_maxima: editingItem.cantidad_maxima,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Mínimos actualizados');
      setEditingItem(null);
      fetchInventario();
    } catch (error) {
      console.error('Error updating minimos:', error);
      toast.error('Error al actualizar mínimos');
    }
  };

  const handleAdjustInventory = async () => {
    if (!adjustingItem || adjustAmount === 0) return;
    
    try {
      const newAmount = adjustingItem.cantidad_actual + adjustAmount;
      
      if (newAmount < 0) {
        toast.error('La cantidad no puede ser negativa');
        return;
      }

      // Actualizar inventario
      const { error: updateError } = await supabase
        .from('inventario_hospital')
        .update({ cantidad_actual: newAmount })
        .eq('id', adjustingItem.id);

      if (updateError) throw updateError;

      // Registrar movimiento
      const { error: movError } = await supabase
        .from('movimientos_inventario')
        .insert({
          hospital_id: selectedHospital!.id,
          inventario_id: adjustingItem.id,
          tipo_movimiento: adjustAmount > 0 ? 'entrada_manual' : 'salida_manual',
          cantidad: Math.abs(adjustAmount),
          cantidad_anterior: adjustingItem.cantidad_actual,
          cantidad_nueva: newAmount,
          observaciones: adjustReason || 'Ajuste manual de inventario',
          usuario_id: user?.id,
        });

      if (movError) throw movError;

      toast.success(`Inventario ajustado: ${adjustAmount > 0 ? '+' : ''}${adjustAmount}`);
      setAdjustingItem(null);
      setAdjustAmount(0);
      setAdjustReason('');
      fetchAllData();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Error al ajustar inventario');
    }
  };

  const handleSendAlert = async (alertaId: string) => {
    try {
      const { error } = await supabase
        .from('insumos_alertas')
        .update({
          enviado_a_supervisor: true,
          enviado_a_gerente_operaciones: true,
        })
        .eq('id', alertaId);

      if (error) throw error;

      toast.success('Alerta enviada a Supervisor y Gerente');
      fetchAlertas();
    } catch (error) {
      console.error('Error sending alert:', error);
      toast.error('Error al enviar alerta');
    }
  };

  const handleSendAllAlerts = async () => {
    const pendientes = alertas.filter(a => !a.enviado_a_supervisor);
    if (pendientes.length === 0) {
      toast.info('No hay alertas pendientes de envío');
      return;
    }

    try {
      const { error } = await supabase
        .from('insumos_alertas')
        .update({
          enviado_a_supervisor: true,
          enviado_a_gerente_operaciones: true,
        })
        .eq('hospital_id', selectedHospital!.id)
        .eq('estado', 'activa')
        .eq('enviado_a_supervisor', false);

      if (error) throw error;

      toast.success(`${pendientes.length} alertas enviadas`);
      fetchAlertas();
    } catch (error) {
      console.error('Error sending alerts:', error);
      toast.error('Error al enviar alertas');
    }
  };

  const handleCreateManualAlert = async () => {
    if (!manualAlertItem || !selectedHospital) return;

    try {
      const { error } = await supabase
        .from('insumos_alertas')
        .insert({
          hospital_id: selectedHospital.id,
          insumo_catalogo_id: manualAlertItem.insumo_catalogo_id,
          inventario_id: manualAlertItem.id,
          cantidad_actual: manualAlertItem.cantidad_actual,
          minimo_permitido: manualAlertItem.cantidad_minima,
          prioridad: 'media',
          notas: manualAlertNotes || 'Alerta creada manualmente',
          generado_por: user?.id,
        });

      if (error) throw error;

      toast.success('Alerta manual creada');
      setManualAlertItem(null);
      setManualAlertNotes('');
      fetchAlertas();
    } catch (error) {
      console.error('Error creating manual alert:', error);
      toast.error('Error al crear alerta');
    }
  };

  const inventarioBajoMinimo = inventario.filter(i => i.cantidad_actual < i.cantidad_minima);
  const inventarioNormal = inventario.filter(i => i.cantidad_actual >= i.cantidad_minima);

  if (!selectedHospital) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecciona un hospital para ver el inventario</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Dashboard Almacenista
          </h1>
          <p className="text-muted-foreground mt-1">
            Hospital: {selectedHospital.display_name}
          </p>
        </div>
        <Button onClick={fetchAllData} variant="outline" disabled={loading}>
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insumos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.itemsCriticos}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Bajo Mínimo</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.itemsBajoMinimo}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Alertas Pendientes</CardTitle>
            <Send className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.alertasPendientes}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventario" className="w-full">
        <TabsList>
          <TabsTrigger value="inventario">
            Inventario ({inventario.length})
          </TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas Activas ({alertas.length})
          </TabsTrigger>
          <TabsTrigger value="historial">
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Inventario */}
        <TabsContent value="inventario" className="mt-4 space-y-4">
          {/* Insumos bajo mínimo */}
          {inventarioBajoMinimo.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Insumos Bajo Mínimo ({inventarioBajoMinimo.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead className="text-center">Actual</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead className="text-center">Faltante</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventarioBajoMinimo.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.insumo?.nombre || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          <span className={item.cantidad_actual === 0 ? 'text-red-600 font-bold' : 'text-orange-600 font-bold'}>
                            {item.cantidad_actual}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{item.cantidad_minima}</TableCell>
                        <TableCell className="text-center text-red-600 font-bold">
                          -{item.cantidad_minima - item.cantidad_actual}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setAdjustingItem(item)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setManualAlertItem(item)}>
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Inventario normal */}
          <Card>
            <CardHeader>
              <CardTitle>Inventario Completo</CardTitle>
              <CardDescription>
                {inventarioNormal.length} insumos con stock adecuado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead className="text-center">Actual</TableHead>
                      <TableHead className="text-center">Mín</TableHead>
                      <TableHead className="text-center">Máx</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventario.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.insumo?.nombre || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave || 'N/A'}</TableCell>
                        <TableCell className="text-center font-bold">
                          <span className={
                            item.cantidad_actual === 0 ? 'text-red-600' :
                            item.cantidad_actual < item.cantidad_minima ? 'text-orange-600' :
                            'text-green-600'
                          }>
                            {item.cantidad_actual}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{item.cantidad_minima}</TableCell>
                        <TableCell className="text-center">{item.cantidad_maxima || '-'}</TableCell>
                        <TableCell className="text-sm">{item.lote || '-'}</TableCell>
                        <TableCell className="text-sm">{item.ubicacion || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setAdjustingItem(item)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alertas Activas</CardTitle>
                  <CardDescription>
                    Alertas generadas automáticamente por inventario bajo mínimo
                  </CardDescription>
                </div>
                {alertas.some(a => !a.enviado_a_supervisor) && (
                  <Button onClick={handleSendAllAlerts}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Todas las Pendientes
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {alertas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <p>No hay alertas activas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-center">Actual</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell>
                          <Badge className={prioridadColors[alerta.prioridad]}>
                            {alerta.prioridad.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{alerta.insumo?.nombre || 'N/A'}</TableCell>
                        <TableCell className="text-center text-red-600 font-bold">
                          {alerta.cantidad_actual}
                        </TableCell>
                        <TableCell className="text-center">{alerta.minimo_permitido}</TableCell>
                        <TableCell>
                          {alerta.enviado_a_supervisor ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Enviada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(alerta.created_at).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>
                          {!alerta.enviado_a_supervisor && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendAlert(alerta.id)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historial.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay movimientos registrados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-center">Anterior</TableHead>
                      <TableHead className="text-center">Nueva</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          <Badge variant="outline" className={
                            mov.tipo_movimiento.includes('entrada') ? 'bg-green-100 text-green-800' :
                            mov.tipo_movimiento.includes('salida') ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {mov.tipo_movimiento.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          <span className={mov.tipo_movimiento.includes('entrada') ? 'text-green-600' : 'text-red-600'}>
                            {mov.tipo_movimiento.includes('entrada') ? '+' : '-'}{mov.cantidad}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{mov.cantidad_anterior ?? '-'}</TableCell>
                        <TableCell className="text-center">{mov.cantidad_nueva ?? '-'}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{mov.observaciones || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(mov.created_at).toLocaleString('es-MX')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Editar Mínimos */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mínimos y Máximos</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label>Insumo</Label>
                <p className="text-sm font-medium">{editingItem.insumo?.nombre}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimo">Cantidad Mínima</Label>
                  <Input
                    id="minimo"
                    type="number"
                    min={0}
                    value={editingItem.cantidad_minima}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      cantidad_minima: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="maximo">Cantidad Máxima</Label>
                  <Input
                    id="maximo"
                    type="number"
                    min={0}
                    value={editingItem.cantidad_maxima || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      cantidad_maxima: parseInt(e.target.value) || null
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={handleUpdateMinimos}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ajustar Inventario */}
      <Dialog open={!!adjustingItem} onOpenChange={() => { setAdjustingItem(null); setAdjustAmount(0); setAdjustReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Inventario</DialogTitle>
          </DialogHeader>
          {adjustingItem && (
            <div className="space-y-4">
              <div>
                <Label>Insumo</Label>
                <p className="text-sm font-medium">{adjustingItem.insumo?.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  Stock actual: <span className="font-bold">{adjustingItem.cantidad_actual}</span>
                </p>
              </div>
              <div>
                <Label htmlFor="adjust">Ajuste (positivo = entrada, negativo = salida)</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAdjustAmount(prev => prev - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="adjust"
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                    className="text-center"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAdjustAmount(prev => prev + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Nuevo stock: <span className="font-bold">{adjustingItem.cantidad_actual + adjustAmount}</span>
                </p>
              </div>
              <div>
                <Label htmlFor="reason">Motivo del ajuste</Label>
                <Textarea
                  id="reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ingrese el motivo del ajuste..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdjustingItem(null); setAdjustAmount(0); setAdjustReason(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustInventory} disabled={adjustAmount === 0}>
              Aplicar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Alerta Manual */}
      <Dialog open={!!manualAlertItem} onOpenChange={() => { setManualAlertItem(null); setManualAlertNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Alerta Manual</DialogTitle>
          </DialogHeader>
          {manualAlertItem && (
            <div className="space-y-4">
              <div>
                <Label>Insumo</Label>
                <p className="text-sm font-medium">{manualAlertItem.insumo?.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  Stock actual: {manualAlertItem.cantidad_actual} | Mínimo: {manualAlertItem.cantidad_minima}
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={manualAlertNotes}
                  onChange={(e) => setManualAlertNotes(e.target.value)}
                  placeholder="Motivo de la alerta manual..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setManualAlertItem(null); setManualAlertNotes(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateManualAlert}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Crear Alerta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
