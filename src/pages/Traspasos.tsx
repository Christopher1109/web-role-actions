import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Traspasos = () => {
  const mockTraspasos = [
    {
      id: '1',
      fecha: '2024-11-07',
      unidadOrigen: 'Unidad Central',
      unidadDestino: 'Unidad Norte',
      insumos: [
        { nombre: 'Propofol 200mg', cantidad: 10 },
        { nombre: 'Fentanilo 500mcg', cantidad: 5 },
      ],
      estado: 'pendiente',
      solicitadoPor: 'Dr. García',
    },
    {
      id: '2',
      fecha: '2024-11-06',
      unidadOrigen: 'Unidad Sur',
      unidadDestino: 'Unidad Central',
      insumos: [
        { nombre: 'Rocuronio 50mg', cantidad: 8 },
        { nombre: 'Lidocaína 2%', cantidad: 12 },
      ],
      estado: 'completado',
      solicitadoPor: 'Dra. Martínez',
    },
    {
      id: '3',
      fecha: '2024-11-05',
      unidadOrigen: 'Unidad Central',
      unidadDestino: 'Unidad Sur',
      insumos: [
        { nombre: 'Sevoflurano', cantidad: 3 },
      ],
      estado: 'rechazado',
      solicitadoPor: 'Dr. López',
      motivoRechazo: 'Stock insuficiente en unidad origen',
    },
  ];

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { 
          icon: Clock, 
          variant: 'default' as const, 
          label: 'Pendiente',
          color: 'text-warning' 
        };
      case 'completado':
        return { 
          icon: CheckCircle, 
          variant: 'default' as const, 
          label: 'Completado',
          color: 'text-success' 
        };
      case 'rechazado':
        return { 
          icon: XCircle, 
          variant: 'destructive' as const, 
          label: 'Rechazado',
          color: 'text-destructive' 
        };
      default:
        return { 
          icon: Clock, 
          variant: 'default' as const, 
          label: estado,
          color: 'text-muted-foreground' 
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Traspasos entre Unidades</h1>
          <p className="text-muted-foreground">Gestión de movimientos de inventario</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Traspaso
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Traspasos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">1</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completados (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">24</div>
            <p className="text-xs text-muted-foreground">traspasos exitosos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">unidades activas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Traspasos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTraspasos.map((traspaso) => {
              const estadoConfig = getEstadoConfig(traspaso.estado);
              const EstadoIcon = estadoConfig.icon;
              
              return (
                <Card key={traspaso.id} className="border-l-4 border-l-role-gerente">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <Badge variant={estadoConfig.variant} className="gap-1">
                              <EstadoIcon className="h-3 w-3" />
                              {estadoConfig.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{traspaso.fecha}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium">{traspaso.unidadOrigen}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{traspaso.unidadDestino}</span>
                          </div>

                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="mb-2 text-sm font-medium">Insumos:</p>
                            <ul className="space-y-1 text-sm">
                              {traspaso.insumos.map((insumo, index) => (
                                <li key={index}>
                                  • {insumo.nombre}: <span className="font-medium">{insumo.cantidad} unidades</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <p className="text-sm">
                            <span className="text-muted-foreground">Solicitado por:</span>{' '}
                            <span className="font-medium">{traspaso.solicitadoPor}</span>
                          </p>

                          {traspaso.motivoRechazo && (
                            <div className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                              <span className="font-medium">Motivo:</span> {traspaso.motivoRechazo}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {traspaso.estado === 'pendiente' && (
                            <>
                              <Button variant="outline" size="sm" className="gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button variant="destructive" size="sm" className="gap-2">
                                <XCircle className="h-4 w-4" />
                                Rechazar
                              </Button>
                            </>
                          )}
                          {traspaso.estado !== 'pendiente' && (
                            <Button variant="outline" size="sm">Ver Detalle</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unidades del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Unidad Central', 'Unidad Norte', 'Unidad Sur', 'Unidad Este'].map((unidad) => (
              <div key={unidad} className="rounded-lg border p-4">
                <h4 className="font-semibold">{unidad}</h4>
                <p className="text-sm text-muted-foreground">Stock disponible</p>
                <Button variant="link" size="sm" className="h-auto p-0">
                  Ver inventario →
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Traspasos;
