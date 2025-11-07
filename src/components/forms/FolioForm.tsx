import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';

const folioSchema = z.object({
  numeroFolio: z.string()
    .trim()
    .nonempty({ message: "El número de folio es requerido" })
    .max(50, { message: "Máximo 50 caracteres" }),
  pacienteNombre: z.string()
    .trim()
    .nonempty({ message: "El nombre del paciente es requerido" })
    .max(200, { message: "Máximo 200 caracteres" }),
  pacienteEdad: z.coerce.number()
    .min(0, { message: "Edad inválida" })
    .max(150, { message: "Edad inválida" }),
  pacienteGenero: z.enum(['M', 'F', 'Otro'], { message: "Selecciona un género" }),
  cirugia: z.string()
    .trim()
    .nonempty({ message: "El tipo de cirugía es requerido" })
    .max(200, { message: "Máximo 200 caracteres" }),
  tipoAnestesia: z.string()
    .nonempty({ message: "Selecciona un tipo de anestesia" }),
  cirujano: z.string()
    .trim()
    .nonempty({ message: "Selecciona un cirujano" }),
  anestesiologo: z.string()
    .trim()
    .nonempty({ message: "Selecciona un anestesiólogo" }),
  unidad: z.string()
    .trim()
    .nonempty({ message: "Selecciona una unidad" }),
});

type FolioFormValues = z.infer<typeof folioSchema>;

interface FolioFormProps {
  onClose: () => void;
  onSubmit: (data: FolioFormValues & { insumos: any[] }) => void;
}

const FolioForm = ({ onClose, onSubmit }: FolioFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FolioFormValues>({
    resolver: zodResolver(folioSchema),
    defaultValues: {
      numeroFolio: `F-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      unidad: 'Unidad Central',
    }
  });

  const tipoAnestesia = watch('tipoAnestesia');

  const tiposAnestesia = [
    { value: 'general_balanceada_adulto', label: 'General Balanceada Adulto' },
    { value: 'general_balanceada_pediatrica', label: 'General Balanceada Pediátrica' },
    { value: 'general_alta_especialidad', label: 'General Alta Especialidad' },
    { value: 'general_endovenosa', label: 'General Endovenosa' },
    { value: 'locorregional', label: 'Locorregional' },
    { value: 'sedacion', label: 'Sedación' },
  ];

  const cirujanos = [
    'Dr. Carlos Martínez López',
    'Dra. María Hernández Díaz',
    'Dr. José López Sánchez',
    'Dra. Laura Ramírez Torres',
  ];

  const anestesiologos = [
    'Dra. Ana García Ruiz',
    'Dr. José Ramírez Castro',
    'Dr. Pedro Sánchez Morales',
    'Dra. Carmen López Fernández',
  ];

  const unidades = ['Unidad Central', 'Unidad Norte', 'Unidad Sur', 'Unidad Este'];

  const mockInsumosPorPaquete: Record<string, any[]> = {
    general_balanceada_adulto: [
      { id: '1', nombre: 'Propofol 200mg', lote: 'LOT-2024-A123', cantidad: 2 },
      { id: '2', nombre: 'Fentanilo 500mcg', lote: 'LOT-2024-B456', cantidad: 1 },
      { id: '3', nombre: 'Rocuronio 50mg', lote: 'LOT-2024-C789', cantidad: 1 },
    ],
    general_balanceada_pediatrica: [
      { id: '1', nombre: 'Propofol 200mg', lote: 'LOT-2024-A123', cantidad: 1 },
      { id: '2', nombre: 'Fentanilo 500mcg', lote: 'LOT-2024-B456', cantidad: 1 },
    ],
    general_alta_especialidad: [
      { id: '1', nombre: 'Propofol 200mg', lote: 'LOT-2024-A123', cantidad: 3 },
      { id: '2', nombre: 'Fentanilo 500mcg', lote: 'LOT-2024-B456', cantidad: 2 },
      { id: '3', nombre: 'Rocuronio 50mg', lote: 'LOT-2024-C789', cantidad: 2 },
    ],
    general_endovenosa: [
      { id: '1', nombre: 'Propofol 200mg', lote: 'LOT-2024-A123', cantidad: 4 },
      { id: '3', nombre: 'Rocuronio 50mg', lote: 'LOT-2024-C789', cantidad: 1 },
    ],
    locorregional: [
      { id: '4', nombre: 'Lidocaína 2%', lote: 'LOT-2024-D012', cantidad: 2 },
      { id: '2', nombre: 'Fentanilo 500mcg', lote: 'LOT-2024-B456', cantidad: 1 },
    ],
    sedacion: [
      { id: '1', nombre: 'Propofol 200mg', lote: 'LOT-2024-A123', cantidad: 1 },
      { id: '2', nombre: 'Fentanilo 500mcg', lote: 'LOT-2024-B456', cantidad: 1 },
    ],
  };

  const handleFormSubmit = async (data: FolioFormValues) => {
    try {
      const insumosUtilizados = mockInsumosPorPaquete[data.tipoAnestesia] || [];
      
      await onSubmit({ ...data, insumos: insumosUtilizados });
      
      toast.success('Folio registrado exitosamente', {
        description: `Folio ${data.numeroFolio} creado correctamente`,
      });
      
      onClose();
    } catch (error) {
      toast.error('Error al registrar folio', {
        description: 'Por favor intenta nuevamente',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Nuevo Folio</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numeroFolio">Número de Folio *</Label>
          <Input id="numeroFolio" {...register('numeroFolio')} />
          {errors.numeroFolio && (
            <p className="text-sm text-destructive">{errors.numeroFolio.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unidad">Unidad *</Label>
          <Select onValueChange={(value) => setValue('unidad', value)} defaultValue="Unidad Central">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unidades.map((unidad) => (
                <SelectItem key={unidad} value={unidad}>{unidad}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unidad && (
            <p className="text-sm text-destructive">{errors.unidad.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Datos del Paciente</h3>
        
        <div className="space-y-2">
          <Label htmlFor="pacienteNombre">Nombre Completo *</Label>
          <Input id="pacienteNombre" {...register('pacienteNombre')} placeholder="Juan Pérez García" />
          {errors.pacienteNombre && (
            <p className="text-sm text-destructive">{errors.pacienteNombre.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pacienteEdad">Edad *</Label>
            <Input type="number" id="pacienteEdad" {...register('pacienteEdad')} placeholder="35" />
            {errors.pacienteEdad && (
              <p className="text-sm text-destructive">{errors.pacienteEdad.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pacienteGenero">Género *</Label>
            <Select onValueChange={(value) => setValue('pacienteGenero', value as 'M' | 'F' | 'Otro')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            {errors.pacienteGenero && (
              <p className="text-sm text-destructive">{errors.pacienteGenero.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Procedimiento</h3>

        <div className="space-y-2">
          <Label htmlFor="cirugia">Tipo de Cirugía *</Label>
          <Input id="cirugia" {...register('cirugia')} placeholder="Apendicectomía" />
          {errors.cirugia && (
            <p className="text-sm text-destructive">{errors.cirugia.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoAnestesia">Tipo de Anestesia *</Label>
          <Select onValueChange={(value) => setValue('tipoAnestesia', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {tiposAnestesia.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipoAnestesia && (
            <p className="text-sm text-destructive">{errors.tipoAnestesia.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cirujano">Cirujano *</Label>
            <Select onValueChange={(value) => setValue('cirujano', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {cirujanos.map((cirujano) => (
                  <SelectItem key={cirujano} value={cirujano}>
                    {cirujano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cirujano && (
              <p className="text-sm text-destructive">{errors.cirujano.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="anestesiologo">Anestesiólogo *</Label>
            <Select onValueChange={(value) => setValue('anestesiologo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {anestesiologos.map((anestesiologo) => (
                  <SelectItem key={anestesiologo} value={anestesiologo}>
                    {anestesiologo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.anestesiologo && (
              <p className="text-sm text-destructive">{errors.anestesiologo.message}</p>
            )}
          </div>
        </div>
      </div>

      {tipoAnestesia && mockInsumosPorPaquete[tipoAnestesia] && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-3 font-semibold">Insumos que se registrarán:</h4>
          <ul className="space-y-2">
            {mockInsumosPorPaquete[tipoAnestesia].map((insumo) => (
              <li key={insumo.id} className="text-sm">
                • {insumo.nombre} - Lote: {insumo.lote} - Cantidad: {insumo.cantidad}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Guardando...' : 'Registrar Folio'}
        </Button>
      </div>
    </form>
  );
};

export default FolioForm;
