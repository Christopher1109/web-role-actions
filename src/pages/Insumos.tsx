import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import InsumoForm from '@/components/forms/InsumoForm';

const mockInsumosData = [
    {
      id: '1',
      nombre: 'Propofol 200mg',
      lote: 'LOT-2024-A123',
      cantidad: 45,
      fechaCaducidad: '2025-06-15',
      origen: 'LOAD',
      stockMinimo: 20,
    },
    {
      id: '2',
      nombre: 'Fentanilo 500mcg',
      lote: 'LOT-2024-B456',
      cantidad: 12,
      fechaCaducidad: '2025-03-20',
      origen: 'Prestado',
      stockMinimo: 15,
    },
    {
      id: '3',
      nombre: 'Rocuronio 50mg',
      lote: 'LOT-2024-C789',
      cantidad: 67,
      fechaCaducidad: '2025-08-10',
      origen: 'LOAD',
      stockMinimo: 30,
    },
    {
      id: '4',
      nombre: 'Lidocaína 2%',
      lote: 'LOT-2024-D012',
      cantidad: 8,
      fechaCaducidad: '2024-12-05',
      origen: 'LOAD',
      stockMinimo: 25,
    },
];

const Insumos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [insumos, setInsumos] = useState(mockInsumosData);

  const handleCreateInsumo = (data: any) => {
    const newInsumo = {
      id: String(insumos.length + 1),
      nombre: data.nombre,
      lote: data.lote,
      cantidad: data.cantidad,
      fechaCaducidad: data.fechaCaducidad,
      origen: data.origen,
      stockMinimo: data.stockMinimo,
    };
    setInsumos([newInsumo, ...insumos]);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventario de Insumos</h1>
          <p className="text-muted-foreground">Gestión y control de stock</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Registrar Entrada
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Insumos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">132</div>
            <p className="text-xs text-muted-foreground">unidades disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">2</div>
            <p className="text-xs text-muted-foreground">requieren reabastecimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Próximos a Caducar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">1</div>
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
          <div className="space-y-4">
            {insumos.map((insumo) => {
              const stockStatus = getStockStatus(insumo.cantidad, insumo.stockMinimo);
              const caducidadProxima = isCaducidadProxima(insumo.fechaCaducidad);
              
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
                            <span className="font-medium">Caducidad:</span> {insumo.fechaCaducidad}
                            {caducidadProxima && ' ⚠️'}
                          </p>
                          <p><span className="font-medium">Stock Mínimo:</span> {insumo.stockMinimo}</p>
                        </div>
                        {caducidadProxima && (
                          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            Próximo a caducar
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm">Ver Detalle</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <InsumoForm onClose={() => setShowForm(false)} onSubmit={handleCreateInsumo} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Insumos;
