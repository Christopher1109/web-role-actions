import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useHospital } from '@/contexts/HospitalContext';

// Define a basic schema for a folio or report.  Adjust fields to match
// your database schema.  The `unidad` field captures the hospital.
const folioSchema = z.object({
  folio: z.string().nonempty('El folio es obligatorio'),
  tipo: z.string().nonempty('El tipo es obligatorio'),
  descripcion: z.string().optional(),
  unidad: z.string().nonempty('Debes seleccionar un hospital'),
});

type FolioFormValues = z.infer<typeof folioSchema>;

interface FolioFormProps {
  onClose: () => void;
  onSubmit: (values: any) => void;
  defaultValues?: Partial<FolioFormValues>;
}

/**
 * Updated folio form that uses HospitalContext for the hospital field.
 */
export default function FolioForm({ onClose, onSubmit, defaultValues }: FolioFormProps) {
  const { selectedHospital, availableHospitals, canSelectHospital, setSelectedHospital } = useHospital();
  const form = useForm<FolioFormValues>({
    resolver: zodResolver(folioSchema),
    defaultValues: {
      folio: '',
      tipo: '',
      descripcion: '',
      unidad: selectedHospital?.display_name || '',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (selectedHospital) {
      form.setValue('unidad', selectedHospital.display_name);
    }
  }, [selectedHospital, form]);

  const handleSubmit = (values: FolioFormValues) => {
    const hospital = selectedHospital;
    onSubmit({
      ...values,
      state_name: hospital?.state_name,
      hospital_budget_code: hospital?.budget_code,
      hospital_display_name: hospital?.display_name,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {/* Folio */}
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="folio">Folio</label>
        <input
          id="folio"
          type="text"
          {...form.register('folio')}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {form.formState.errors.folio && (
          <p className="text-sm text-red-500">{form.formState.errors.folio.message}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="tipo">Tipo</label>
        <input
          id="tipo"
          type="text"
          {...form.register('tipo')}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {form.formState.errors.tipo && (
          <p className="text-sm text-red-500">{form.formState.errors.tipo.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          {...form.register('descripcion')}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Hospital selector */}
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="unidad">Hospital</label>
        {canSelectHospital ? (
          <select
            id="unidad"
            {...form.register('unidad')}
            value={form.watch('unidad')}
            onChange={(e) => {
              const value = e.target.value;
              form.setValue('unidad', value);
              const hospital = availableHospitals.find((h) => h.display_name === value);
              if (hospital) setSelectedHospital(hospital);
            }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecciona hospital</option>
            {availableHospitals.map((h) => (
              <option key={h.budget_code} value={h.display_name}>{h.display_name}</option>
            ))}
          </select>
        ) : (
          <input
            id="unidad"
            readOnly
            value={selectedHospital?.display_name || ''}
            className="w-full rounded-md border px-3 py-2 text-sm bg-gray-100"
          />
        )}
        {form.formState.errors.unidad && (
          <p className="text-sm text-red-500">{form.formState.errors.unidad.message}</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white">
          Guardar
        </button>
      </div>
    </form>
  );
}