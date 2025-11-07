import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const medicoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  especialidad: z.enum(['anestesiologo', 'cirujano']),
  subespecialidad: z.string().min(1, 'La subespecialidad es requerida'),
  unidad: z.string().min(1, 'La unidad es requerida'),
  telefono: z.string().min(10, 'Teléfono inválido').max(15),
});

type MedicoFormData = z.infer<typeof medicoSchema>;

interface MedicoFormProps {
  onClose: () => void;
  onSubmit: (data: MedicoFormData) => void;
  medico?: any;
}

const MedicoForm = ({ onClose, onSubmit, medico }: MedicoFormProps) => {
  const form = useForm<MedicoFormData>({
    resolver: zodResolver(medicoSchema),
    defaultValues: medico || {
      nombre: '',
      especialidad: 'anestesiologo',
      subespecialidad: '',
      unidad: 'Unidad Central',
      telefono: '',
    },
  });

  const handleSubmit = (data: MedicoFormData) => {
    onSubmit(data);
    toast.success(medico ? 'Médico actualizado' : 'Médico registrado exitosamente');
    onClose();
  };

  const unidades = ['Unidad Central', 'Unidad Norte', 'Unidad Sur', 'Unidad Este'];

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>{medico ? 'Editar Médico' : 'Agregar Nuevo Médico'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre Completo</Label>
          <Input
            id="nombre"
            placeholder="Dr. Juan Pérez García"
            {...form.register('nombre')}
          />
          {form.formState.errors.nombre && (
            <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="especialidad">Especialidad</Label>
            <Select
              onValueChange={(value) => form.setValue('especialidad', value as 'anestesiologo' | 'cirujano')}
              defaultValue={form.getValues('especialidad')}
            >
              <SelectTrigger id="especialidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anestesiologo">Anestesiólogo</SelectItem>
                <SelectItem value="cirujano">Cirujano</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.especialidad && (
              <p className="text-sm text-destructive">{form.formState.errors.especialidad.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subespecialidad">Subespecialidad</Label>
            <Input
              id="subespecialidad"
              placeholder="Cirugía General, Anestesiología..."
              {...form.register('subespecialidad')}
            />
            {form.formState.errors.subespecialidad && (
              <p className="text-sm text-destructive">{form.formState.errors.subespecialidad.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unidad">Unidad</Label>
            <Select
              onValueChange={(value) => form.setValue('unidad', value)}
              defaultValue={form.getValues('unidad')}
            >
              <SelectTrigger id="unidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((unidad) => (
                  <SelectItem key={unidad} value={unidad}>
                    {unidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.unidad && (
              <p className="text-sm text-destructive">{form.formState.errors.unidad.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              placeholder="555-0101"
              {...form.register('telefono')}
            />
            {form.formState.errors.telefono && (
              <p className="text-sm text-destructive">{form.formState.errors.telefono.message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            {medico ? 'Actualizar' : 'Registrar'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MedicoForm;
