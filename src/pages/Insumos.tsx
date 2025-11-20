import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ubicacion: string;
  estatus: string;
  insumos_catalogo: {
    id: string;
    nombre: string;
    clave: string;
    descripcion: string;
    categoria: string;
    unidad: string;
  };
}

const Insumos = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [selectedInsumo, setSelectedInsumo] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

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

      // Obtener inventario con datos del catálogo
      const { data, error } = await supabase
        .from('inventario_hospital')
        .select(`
          *,
          insumos_catalogo (
            id,
            nombre,
            clave,
            descripcion,
            categoria,
            unidad
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

  const getStockStatus = (cantidadActual: number, cantidadMinima: number = 10) => {
    if (cantidadActual === 0) return { variant: 'destructive' as const, label: 'Agotado' };
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

  const filteredInventario = inventario.filter(item =>
    item.insumos_catalogo?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.insumos_catalogo?.clave?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lote?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stockBajo = inventario.filter(i => i.cantidad_actual < 10).length;
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Insumos
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
                <div className="text-2xl font-bold text-destructive">{stockBajo}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Menos de 10 unidades
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Próximos a Caducar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{proximosVencer}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Caducan en 60 días o menos
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inventario</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar insumos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando inventario...
                </div>
              ) : filteredInventario.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron insumos
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredInventario.map((item) => {
                    const stockStatus = getStockStatus(item.cantidad_actual);
                    const proximoCaducidad = isCaducidadProxima(item.fecha_caducidad);
                    
                    return (
                      <Card 
                        key={item.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedInsumo({
                            ...item,
                            nombre: item.insumos_catalogo?.nombre,
                            clave: item.insumos_catalogo?.clave,
                            descripcion: item.insumos_catalogo?.descripcion,
                            categoria: item.insumos_catalogo?.categoria,
                            unidad: item.insumos_catalogo?.unidad,
                            cantidad: item.cantidad_actual
                          });
                          setShowDetail(true);
                        }}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">
                                {item.insumos_catalogo?.nombre}
                              </CardTitle>
                              {item.insumos_catalogo?.clave && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Clave: {item.insumos_catalogo.clave}
                                </p>
                              )}
                            </div>
                            <Badge variant={stockStatus.variant} className="shrink-0">
                              {stockStatus.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground block">Stock actual:</span>
                              <span className="font-bold text-lg">{item.cantidad_actual}</span>
                              <span className="text-muted-foreground text-xs"> / {item.cantidad_inicial} inicial</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Lote:</span>
                              <span className="font-medium text-sm truncate block">{item.lote}</span>
                            </div>
                          </div>
                          
                          {item.fecha_caducidad && (
                            <div className="flex items-center justify-between text-sm pt-2 border-t">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Caducidad:
                              </span>
                              <span className={proximoCaducidad ? "font-medium text-amber-600" : "font-medium"}>
                                {format(new Date(item.fecha_caducidad), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          )}
                          
                          {proximoCaducidad && (
                            <div className="flex items-center gap-2 text-amber-600 text-xs mt-2 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Próximo a caducar</span>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            📍 {item.ubicacion}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
