import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Calendar } from 'lucide-react';

const insumoSchema = z.object({
  nombre: z.string()
    .trim()
    .nonempty({ message: "El nombre del insumo es requerido" })
    .max(200, { message: "Máximo 200 caracteres" }),
  lote: z.string()
    .trim()
    .nonempty({ message: "El lote es requerido" })
    .max(100, { message: "Máximo 100 caracteres" })
    .regex(/^[A-Za-z0-9-]+$/, { message: "Solo letras, números y guiones" }),
  cantidad: z.coerce.number()
    .min(1, { message: "La cantidad debe ser mayor a 0" })
    .max(10000, { message: "Cantidad máxima excedida" }),
  fechaCaducidad: z.string()
    .nonempty({ message: "La fecha de caducidad es requerida" })
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate > today;
    }, { message: "La fecha debe ser futura" }),
  unidad: z.string()
    .trim()
    .nonempty({ message: "Selecciona una unidad" }),
  origen: z.enum(['LOAD', 'Prestado'], { message: "Selecciona el origen" }),
  stockMinimo: z.coerce.number()
    .min(1, { message: "El stock mínimo debe ser mayor a 0" })
    .max(1000, { message: "Stock mínimo máximo excedido" }),
  categoria: z.string()
    .nonempty({ message: "Selecciona una categoría" }),
});

type InsumoFormValues = z.infer<typeof insumoSchema>;

interface InsumoFormProps {
  onClose: () => void;
  onSubmit: (data: InsumoFormValues) => void;
}

const InsumoForm = ({ onClose, onSubmit }: InsumoFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      unidad: 'Unidad Central',
      origen: 'LOAD',
      stockMinimo: 10,
      categoria: 'anestesicos',
    }
  });

  const unidades = ['Unidad Central', 'Unidad Norte', 'Unidad Sur', 'Unidad Este'];
  
  const categorias = [
    { value: 'anestesicos', label: 'Anestésicos' },
    { value: 'analgesicos', label: 'Analgésicos' },
    { value: 'relajantes', label: 'Relajantes Musculares' },
    { value: 'sedantes', label: 'Sedantes' },
    { value: 'anestesicos_locales', label: 'Anestésicos Locales' },
    { value: 'otros', label: 'Otros' },
  ];

  const handleFormSubmit = async (data: InsumoFormValues) => {
    try {
      await onSubmit(data);
      
      toast.success('Insumo registrado exitosamente', {
        description: `${data.cantidad} unidades de ${data.nombre} agregadas al inventario`,
      });
      
      onClose();
    } catch (error) {
      toast.error('Error al registrar insumo', {
        description: 'Por favor intenta nuevamente',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Registrar Entrada de Insumo</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del Insumo *</Label>
          <Input 
            id="nombre" 
            {...register('nombre')} 
            placeholder="Propofol 200mg" 
          />
          {errors.nombre && (
            <p className="text-sm text-destructive">{errors.nombre.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            <Select onValueChange={(value) => setValue('categoria', value)} defaultValue="anestesicos">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoria && (
              <p className="text-sm text-destructive">{errors.categoria.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lote">Número de Lote *</Label>
            <Input 
              id="lote" 
              {...register('lote')} 
              placeholder="LOT-2024-A123"
              className="uppercase"
            />
            {errors.lote && (
              <p className="text-sm text-destructive">{errors.lote.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad *</Label>
            <Input 
              type="number" 
              id="cantidad" 
              {...register('cantidad')} 
              placeholder="50"
              min="1"
            />
            {errors.cantidad && (
              <p className="text-sm text-destructive">{errors.cantidad.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stockMinimo">Stock Mínimo *</Label>
            <Input 
              type="number" 
              id="stockMinimo" 
              {...register('stockMinimo')} 
              placeholder="10"
              min="1"
            />
            {errors.stockMinimo && (
              <p className="text-sm text-destructive">{errors.stockMinimo.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fechaCaducidad">Fecha de Caducidad *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="date" 
              id="fechaCaducidad" 
              {...register('fechaCaducidad')} 
              className="pl-9"
            />
          </div>
          {errors.fechaCaducidad && (
            <p className="text-sm text-destructive">{errors.fechaCaducidad.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unidad">Unidad *</Label>
            <Select onValueChange={(value) => setValue('unidad', value)} defaultValue="Unidad Central">
              <SelectTrigger>
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
            {errors.unidad && (
              <p className="text-sm text-destructive">{errors.unidad.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="origen">Origen *</Label>
            <Select onValueChange={(value) => setValue('origen', value as 'LOAD' | 'Prestado')} defaultValue="LOAD">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOAD">LOAD</SelectItem>
                <SelectItem value="Prestado">Prestado por la Unidad</SelectItem>
              </SelectContent>
            </Select>
            {errors.origen && (
              <p className="text-sm text-destructive">{errors.origen.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Este registro agregará los insumos al inventario de la unidad seleccionada. 
          Asegúrate de verificar la información antes de guardar.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Guardando...' : 'Registrar Insumo'}
        </Button>
      </div>
    </form>
  );
};

export default InsumoForm;
