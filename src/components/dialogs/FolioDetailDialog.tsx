import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FolioDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folio: any;
  tiposAnestesiaLabels: Record<string, string>;
}

const FolioDetailDialog = ({ open, onOpenChange, folio, tiposAnestesiaLabels }: FolioDetailDialogProps) => {
  if (!folio) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalle del Folio {folio.numeroFolio}
            <Badge variant={folio.estado === 'activo' ? 'default' : 'destructive'}>
              {folio.estado === 'activo' ? 'Activo' : 'Cancelado'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Información del Procedimiento</h3>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Folio:</span>
                <span className="col-span-2 font-medium">{folio.numeroFolio}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="col-span-2">{folio.fecha}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Cirugía:</span>
                <span className="col-span-2 font-medium">{folio.cirugia}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Tipo de Anestesia:</span>
                <span className="col-span-2">{tiposAnestesiaLabels[folio.tipoAnestesia]}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Datos del Paciente</h3>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="col-span-2 font-medium">{folio.paciente}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Personal Médico</h3>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Cirujano:</span>
                <span className="col-span-2 font-medium">{folio.cirujano}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Anestesiólogo:</span>
                <span className="col-span-2 font-medium">{folio.anestesiologo}</span>
              </div>
            </div>
          </div>

          {folio.insumos && folio.insumos.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Insumos Utilizados</h3>
                <div className="space-y-2">
                  {folio.insumos.map((insumo: any, idx: number) => (
                    <div key={idx} className="rounded-lg border bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{insumo.nombre}</span>
                        <span>{insumo.cantidad} unidad(es)</span>
                      </div>
                      {insumo.lote && (
                        <div className="text-muted-foreground mt-1">Lote: {insumo.lote}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolioDetailDialog;
