import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useHospital } from '@/contexts/HospitalContext';

// Define the schema for an insumo (inventory item).  Adjust fields as
// necessary to match your database structure.  The important part is
// `unidad`, which will capture the hospital display name and be
// synchronised automatically with the hospital context.
const insumoSchema = z.object({
  nombre: z.string().nonempty('El nombre es obligatorio'),
  clave: z.string().nonempty('La clave es obligatoria'),
  descripcion: z.string().optional(),
  unidad: z.string().nonempty('Debes seleccionar un hospital'),
});

type InsumoFormValues = z.infer<typeof insumoSchema>;

interface InsumoFormProps {
  onClose: () => void;
  onSubmit: (values: any) => void;
  defaultValues?: Partial<InsumoFormValues>;
}

/**
 * Updated insumo form that uses HospitalContext to choose the hospital
 * instead of a hard coded list of units.  For roles that can select
 * hospitals, this form shows a dropdown; otherwise it displays a
 * read‑only text field.  When a hospital is selected the `unidad`
 * field is updated.
 */
export default function InsumoForm({ onClose, onSubmit, defaultValues }: InsumoFormProps) {
  const { selectedHospital, availableHospitals, canSelectHospital, setSelectedHospital } = useHospital();
  const form = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      nombre: '',
      clave: '',
      descripcion: '',
      unidad: selectedHospital?.display_name || '',
      ...defaultValues,
    },
  });

  // Synchronise the `unidad` value whenever selectedHospital changes
  useEffect(() => {
    if (selectedHospital) {
      form.setValue('unidad', selectedHospital.display_name);
    }
  }, [selectedHospital, form]);

  const handleSubmit = (values: InsumoFormValues) => {
    // Include hospital metadata when submitting the insumo.  This ensures
    // that the record is stored against the correct hospital in the
    // database.  You can adjust field names to match your table.
    const hospital = selectedHospital;
    onSubmit({
      ...values,
      state_name: hospital?.state_name,
      hospital_budget_code: hospital?.budget_code,
      hospital_display_name: hospital?.display_name,
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4"
    >
      {/* Nombre del insumo */}
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          type="text"
          {...form.register('nombre')}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {form.formState.errors.nombre && (
          <p className="text-sm text-red-500">{form.formState.errors.nombre.message}</p>
        )}
      </div>

      {/* Clave del insumo */}
      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="clave">Clave</label>
        <input
          id="clave"
          type="text"
          {...form.register('clave')}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {form.formState.errors.clave && (
          <p className="text-sm text-red-500">{form.formState.errors.clave.message}</p>
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

      {/* Hospital selector / display */}
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
              if (hospital) {
                setSelectedHospital(hospital);
              }
            }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecciona hospital</option>
            {availableHospitals.map((h) => (
              <option key={h.budget_code} value={h.display_name}>
                {h.display_name}
              </option>
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

      {/* Botones de acción */}
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