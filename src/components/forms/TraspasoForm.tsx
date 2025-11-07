import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

const traspasoSchema = z.object({
  unidadOrigen: z.string().min(1, 'La unidad de origen es requerida'),
  unidadDestino: z.string().min(1, 'La unidad de destino es requerida'),
  insumos: z.array(z.object({
    nombre: z.string().min(1, 'El nombre del insumo es requerido'),
    cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  })).min(1, 'Debe agregar al menos un insumo'),
});

type TraspasoFormData = z.infer<typeof traspasoSchema>;

interface TraspasoFormProps {
  onClose: () => void;
  onSubmit: (data: TraspasoFormData) => void;
}

const TraspasoForm = ({ onClose, onSubmit }: TraspasoFormProps) => {
  const form = useForm<TraspasoFormData>({
    resolver: zodResolver(traspasoSchema),
    defaultValues: {
      unidadOrigen: '',
      unidadDestino: '',
      insumos: [{ nombre: '', cantidad: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'insumos',
  });

  const handleSubmit = (data: TraspasoFormData) => {
    if (data.unidadOrigen === data.unidadDestino) {
      toast.error('Error', {
        description: 'La unidad de origen y destino no pueden ser las mismas',
      });
      return;
    }
    onSubmit(data);
    toast.success('Traspaso solicitado exitosamente');
    onClose();
  };

  const unidades = ['Unidad Central', 'Unidad Norte', 'Unidad Sur', 'Unidad Este'];

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Solicitar Nuevo Traspaso</DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unidadOrigen">Unidad de Origen</Label>
            <Select
              onValueChange={(value) => form.setValue('unidadOrigen', value)}
              defaultValue={form.getValues('unidadOrigen')}
            >
              <SelectTrigger id="unidadOrigen">
                <SelectValue placeholder="Seleccionar unidad" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((unidad) => (
                  <SelectItem key={unidad} value={unidad}>
                    {unidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.unidadOrigen && (
              <p className="text-sm text-destructive">{form.formState.errors.unidadOrigen.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidadDestino">Unidad de Destino</Label>
            <Select
              onValueChange={(value) => form.setValue('unidadDestino', value)}
              defaultValue={form.getValues('unidadDestino')}
            >
              <SelectTrigger id="unidadDestino">
                <SelectValue placeholder="Seleccionar unidad" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((unidad) => (
                  <SelectItem key={unidad} value={unidad}>
                    {unidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.unidadDestino && (
              <p className="text-sm text-destructive">{form.formState.errors.unidadDestino.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Insumos a Traspasar</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ nombre: '', cantidad: 1 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Insumo
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Nombre del insumo"
                  {...form.register(`insumos.${index}.nombre`)}
                />
                {form.formState.errors.insumos?.[index]?.nombre && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.insumos[index]?.nombre?.message}
                  </p>
                )}
              </div>
              <div className="w-24 space-y-2">
                <Input
                  type="number"
                  placeholder="Cant"
                  {...form.register(`insumos.${index}.cantidad`, { valueAsNumber: true })}
                />
                {form.formState.errors.insumos?.[index]?.cantidad && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.insumos[index]?.cantidad?.message}
                  </p>
                )}
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {form.formState.errors.insumos && (
            <p className="text-sm text-destructive">{form.formState.errors.insumos.message}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Solicitar Traspaso
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TraspasoForm;
