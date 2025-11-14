import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertCircle } from 'lucide-react';
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

const Insumos = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [selectedInsumo, setSelectedInsumo] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && selectedHospital) {
      fetchInsumos();
    }
  }, [user, selectedHospital]);

  const fetchInsumos = async () => {
    try {
      if (!selectedHospital) return;
      
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('insumos')
        .select('*')
        .eq('hospital_budget_code', selectedHospital.budget_code)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInsumos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar insumos', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInsumo = async (data: any) => {
    try {
      if (!user || !selectedHospital) return;

      const { error } = await supabase
        .from('insumos')
        .insert({
          nombre: data.nombre,
          categoria: data.categoria,
          cantidad: data.cantidad,
          lote: data.lote,
          fecha_caducidad: data.fechaCaducidad,
          unidad: data.unidad,
          origen: data.origen,
          stock_minimo: data.stockMinimo || 10,
          state_name: selectedHospital.state_name,
          hospital_budget_code: selectedHospital.budget_code,
          hospital_display_name: selectedHospital.display_name,
        } as any);

      if (error) throw error;

      toast.success('Insumo registrado exitosamente');
      setShowForm(false);
      fetchInsumos();
    } catch (error: any) {
      toast.error('Error al registrar insumo', {
        description: error.message,
      });
    }
  };

  const getStockStatus = (cantidad: number, stockMinimo: number) => {
    if (cantidad <= stockMinimo / 2) return { variant: 'destructive' as const, label: 'Crítico' };
    if (cantidad <= stockMinimo) return { variant: 'default' as const, label: 'Bajo' };
    return { variant: 'default' as const, label: 'Normal' };
  };

  const isCaducidadProxima = (fecha: string) => {
    const diff = new Date(fecha).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 60;
  };

  const totalInsumos = insumos.reduce((sum, i) => sum + i.cantidad, 0);
  const stockBajo = insumos.filter(i => i.cantidad <= (i.stock_minimo || 10)).length;
  const proximosVencer = insumos.filter(i => isCaducidadProxima(i.fecha_caducidad)).length;

  return (
    <div className="space-y-6">
      {!selectedHospital && (
        <Alert>
          <AlertDescription>
            Debes seleccionar un hospital para ver y gestionar el inventario de insumos.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventario de Insumos</h1>
          <p className="text-muted-foreground">Control y gestión de materiales</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setShowForm(true)}
          disabled={!selectedHospital}
        >
          <Plus className="h-4 w-4" />
          Registrar Insumo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Insumos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInsumos}</div>
            <p className="text-xs text-muted-foreground">unidades disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stockBajo}</div>
            <p className="text-xs text-muted-foreground">requieren reabastecimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Próximos a Caducar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{proximosVencer}</div>
            <p className="text-xs text-muted-foreground">en los próximos 60 días</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando insumos...</p>
          ) : (
            <div className="space-y-4">
              {insumos
                .filter(i => searchTerm === '' || 
                  i.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  i.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((insumo) => {
                  const stockStatus = getStockStatus(insumo.cantidad, insumo.stock_minimo || 10);
                  const caducidadProxima = isCaducidadProxima(insumo.fecha_caducidad);
                  
                  return (
                    <Card key={insumo.id} className="border-l-4 border-l-accent">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{insumo.nombre}</h3>
                              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                              <Badge variant={insumo.origen === 'LOAD' ? 'default' : 'secondary'}>
                                {insumo.origen}
                              </Badge>
                            </div>
                            <div className="grid gap-1 text-sm md:grid-cols-2">
                              <p><span className="font-medium">Lote:</span> {insumo.lote}</p>
                              <p><span className="font-medium">Cantidad:</span> {insumo.cantidad} unidades</p>
                              <p className={caducidadProxima ? 'text-destructive font-medium' : ''}>
                                <span className="font-medium">Caducidad:</span> {new Date(insumo.fecha_caducidad).toLocaleDateString()}
                                {caducidadProxima && ' ⚠️'}
                              </p>
                              <p><span className="font-medium">Stock Mínimo:</span> {insumo.stock_minimo || 10}</p>
                              <p><span className="font-medium">Unidad:</span> {insumo.unidad}</p>
                              <p><span className="font-medium">Categoría:</span> {insumo.categoria}</p>
                            </div>
                            {caducidadProxima && (
                              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                Próximo a caducar
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedInsumo(insumo);
                              setShowDetail(true);
                            }}
                          >
                            Ver Detalle
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <InsumoForm onClose={() => setShowForm(false)} onSubmit={handleCreateInsumo} />
        </DialogContent>
      </Dialog>

      <InsumoDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        insumo={selectedInsumo}
      />
    </div>
  );
};

export default Insumos;
