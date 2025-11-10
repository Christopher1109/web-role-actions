import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';

const folioSchema = z.object({
  numeroFolio: z.string()
    .trim()
    .nonempty({ message: "El número de folio es requerido" })
    .max(50, { message: "Máximo 50 caracteres" }),
  unidad: z.string()
    .trim()
    .nonempty({ message: "Selecciona una unidad" }),
  numeroQuirofano: z.string()
    .trim()
    .nonempty({ message: "El número de quirófano es requerido" })
    .max(20, { message: "Máximo 20 caracteres" }),
  horaInicioProcedimiento: z.string()
    .nonempty({ message: "Hora de inicio es requerida" }),
  horaFinProcedimiento: z.string()
    .nonempty({ message: "Hora de fin es requerida" }),
  horaInicioAnestesia: z.string()
    .nonempty({ message: "Hora de inicio de anestesia es requerida" }),
  horaFinAnestesia: z.string()
    .nonempty({ message: "Hora de fin de anestesia es requerida" }),
  pacienteApellidoPaterno: z.string()
    .trim()
    .nonempty({ message: "Apellido paterno es requerido" })
    .max(100, { message: "Máximo 100 caracteres" }),
  pacienteApellidoMaterno: z.string()
    .trim()
    .nonempty({ message: "Apellido materno es requerido" })
    .max(100, { message: "Máximo 100 caracteres" }),
  pacienteNombre: z.string()
    .trim()
    .nonempty({ message: "El nombre del paciente es requerido" })
    .max(100, { message: "Máximo 100 caracteres" }),
  pacienteNSS: z.string()
    .trim()
    .nonempty({ message: "NSS es requerido" })
    .max(20, { message: "Máximo 20 caracteres" }),
  pacienteEdad: z.coerce.number()
    .min(0, { message: "Edad inválida" })
    .max(150, { message: "Edad inválida" }),
  pacienteGenero: z.enum(['M', 'F', 'Otro'], { message: "Selecciona un género" }),
  cirugia: z.string()
    .trim()
    .nonempty({ message: "El procedimiento quirúrgico es requerido" })
    .max(200, { message: "Máximo 200 caracteres" }),
  especialidadQuirurgica: z.string()
    .trim()
    .nonempty({ message: "Especialidad quirúrgica es requerida" })
    .max(100, { message: "Máximo 100 caracteres" }),
  tipoCirugia: z.enum(['abierta', 'minima_invasion'], { message: "Selecciona tipo de cirugía" }),
  tipoEvento: z.enum(['programado', 'urgencia'], { message: "Selecciona tipo de evento" }),
  tipoAnestesia: z.string()
    .nonempty({ message: "Selecciona un tipo de anestesia" }),
  cirujano: z.string()
    .trim()
    .nonempty({ message: "Selecciona un cirujano" }),
  anestesiologo: z.string()
    .trim()
    .nonempty({ message: "Selecciona un anestesiólogo" }),
});

type FolioFormValues = z.infer<typeof folioSchema>;

interface FolioFormProps {
  onClose: () => void;
  onSubmit: (data: FolioFormValues & { insumos: any[] }) => void;
}

interface InsumoUtilizado {
  id: string;
  nombre: string;
  lote: string;
  cantidad: number;
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
  const [insumos, setInsumos] = useState<InsumoUtilizado[]>([]);
  const [editingInsumo, setEditingInsumo] = useState<InsumoUtilizado | null>(null);
  const [showAddInsumo, setShowAddInsumo] = useState(false);

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

  // Cuando cambia el tipo de anestesia, pre-cargar insumos
  const handleTipoAnestesiaChange = (value: string) => {
    setValue('tipoAnestesia', value);
    const insumosPreregistrados = mockInsumosPorPaquete[value] || [];
    setInsumos([...insumosPreregistrados]);
  };

  const handleAddInsumo = (insumo: InsumoUtilizado) => {
    setInsumos([...insumos, { ...insumo, id: `temp-${Date.now()}` }]);
    setShowAddInsumo(false);
  };

  const handleUpdateInsumo = (updatedInsumo: InsumoUtilizado) => {
    setInsumos(insumos.map(i => i.id === updatedInsumo.id ? updatedInsumo : i));
    setEditingInsumo(null);
  };

  const handleDeleteInsumo = (id: string) => {
    setInsumos(insumos.filter(i => i.id !== id));
  };

  const handleFormSubmit = async (data: FolioFormValues) => {
    try {
      if (insumos.length === 0) {
        toast.error('Error', {
          description: 'Debes agregar al menos un insumo',
        });
        return;
      }

      await onSubmit({ ...data, insumos });
      
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-4">
        <h2 className="text-2xl font-bold">Nuevo Folio - Anexo T33</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Información General */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="numeroFolio">Número de Folio *</Label>
          <Input id="numeroFolio" {...register('numeroFolio')} />
          {errors.numeroFolio && (
            <p className="text-sm text-destructive">{errors.numeroFolio.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unidad">Unidad Médica *</Label>
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

        <div className="space-y-2">
          <Label htmlFor="numeroQuirofano">Número de Quirófano *</Label>
          <Input id="numeroQuirofano" {...register('numeroQuirofano')} placeholder="Q-01" />
          {errors.numeroQuirofano && (
            <p className="text-sm text-destructive">{errors.numeroQuirofano.message}</p>
          )}
        </div>
      </div>

      {/* Horarios */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Horarios</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="horaInicioProcedimiento">Inicio Procedimiento *</Label>
            <Input type="time" id="horaInicioProcedimiento" {...register('horaInicioProcedimiento')} />
            {errors.horaInicioProcedimiento && (
              <p className="text-sm text-destructive">{errors.horaInicioProcedimiento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horaFinProcedimiento">Fin Procedimiento *</Label>
            <Input type="time" id="horaFinProcedimiento" {...register('horaFinProcedimiento')} />
            {errors.horaFinProcedimiento && (
              <p className="text-sm text-destructive">{errors.horaFinProcedimiento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horaInicioAnestesia">Inicio Anestesia *</Label>
            <Input type="time" id="horaInicioAnestesia" {...register('horaInicioAnestesia')} />
            {errors.horaInicioAnestesia && (
              <p className="text-sm text-destructive">{errors.horaInicioAnestesia.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horaFinAnestesia">Fin Anestesia *</Label>
            <Input type="time" id="horaFinAnestesia" {...register('horaFinAnestesia')} />
            {errors.horaFinAnestesia && (
              <p className="text-sm text-destructive">{errors.horaFinAnestesia.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Datos del Paciente */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Datos del Paciente</h3>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pacienteApellidoPaterno">Apellido Paterno *</Label>
            <Input id="pacienteApellidoPaterno" {...register('pacienteApellidoPaterno')} placeholder="Pérez" />
            {errors.pacienteApellidoPaterno && (
              <p className="text-sm text-destructive">{errors.pacienteApellidoPaterno.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pacienteApellidoMaterno">Apellido Materno *</Label>
            <Input id="pacienteApellidoMaterno" {...register('pacienteApellidoMaterno')} placeholder="García" />
            {errors.pacienteApellidoMaterno && (
              <p className="text-sm text-destructive">{errors.pacienteApellidoMaterno.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pacienteNombre">Nombre(s) *</Label>
            <Input id="pacienteNombre" {...register('pacienteNombre')} placeholder="Juan" />
            {errors.pacienteNombre && (
              <p className="text-sm text-destructive">{errors.pacienteNombre.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pacienteNSS">NSS *</Label>
            <Input id="pacienteNSS" {...register('pacienteNSS')} placeholder="12345678901" />
            {errors.pacienteNSS && (
              <p className="text-sm text-destructive">{errors.pacienteNSS.message}</p>
            )}
          </div>

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

      {/* Procedimiento */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Procedimiento Quirúrgico</h3>

        <div className="space-y-2">
          <Label htmlFor="cirugia">Procedimiento Quirúrgico *</Label>
          <Input id="cirugia" {...register('cirugia')} placeholder="Apendicectomía" />
          {errors.cirugia && (
            <p className="text-sm text-destructive">{errors.cirugia.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="especialidadQuirurgica">Especialidad Quirúrgica *</Label>
            <Input id="especialidadQuirurgica" {...register('especialidadQuirurgica')} placeholder="Cirugía General" />
            {errors.especialidadQuirurgica && (
              <p className="text-sm text-destructive">{errors.especialidadQuirurgica.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoCirugia">Tipo de Cirugía *</Label>
            <Select onValueChange={(value) => setValue('tipoCirugia', value as 'abierta' | 'minima_invasion')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abierta">Abierta</SelectItem>
                <SelectItem value="minima_invasion">Mínima Invasión</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoCirugia && (
              <p className="text-sm text-destructive">{errors.tipoCirugia.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoEvento">Tipo de Evento *</Label>
            <Select onValueChange={(value) => setValue('tipoEvento', value as 'programado' | 'urgencia')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="programado">Programado</SelectItem>
                <SelectItem value="urgencia">Urgencia</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoEvento && (
              <p className="text-sm text-destructive">{errors.tipoEvento.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoAnestesia">Tipo de Anestesia *</Label>
          <Select onValueChange={handleTipoAnestesiaChange}>
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

      {/* Insumos Editables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Bienes de Consumo y Medicamentos</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddInsumo(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Insumo
          </Button>
        </div>

        {insumos.length > 0 ? (
          <div className="rounded-lg border">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 p-3 bg-muted font-medium text-sm">
              <div>Descripción</div>
              <div>Lote</div>
              <div>Cantidad</div>
              <div>Acciones</div>
            </div>
            {insumos.map((insumo) => (
              <div key={insumo.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 p-3 border-t items-center">
                {editingInsumo?.id === insumo.id ? (
                  <>
                    <Input
                      value={editingInsumo.nombre}
                      onChange={(e) => setEditingInsumo({ ...editingInsumo, nombre: e.target.value })}
                    />
                    <Input
                      value={editingInsumo.lote}
                      onChange={(e) => setEditingInsumo({ ...editingInsumo, lote: e.target.value })}
                    />
                    <Input
                      type="number"
                      min="1"
                      value={editingInsumo.cantidad}
                      onChange={(e) => setEditingInsumo({ ...editingInsumo, cantidad: parseInt(e.target.value) || 1 })}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdateInsumo(editingInsumo)}
                      >
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingInsumo(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm">{insumo.nombre}</div>
                    <div className="text-sm text-muted-foreground">{insumo.lote}</div>
                    <div className="text-sm">{insumo.cantidad}</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingInsumo(insumo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteInsumo(insumo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {tipoAnestesia 
              ? "Selecciona el tipo de anestesia para ver los insumos sugeridos o agrega insumos manualmente"
              : "No hay insumos agregados. Haz clic en 'Agregar Insumo' para comenzar"}
          </div>
        )}
      </div>

      {/* Modal para agregar insumo */}
      {showAddInsumo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="font-semibold text-lg">Agregar Insumo</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  id="newInsumoNombre"
                  placeholder="Nombre del insumo"
                />
              </div>
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input
                  id="newInsumoLote"
                  placeholder="LOT-2024-XXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  id="newInsumoCantidad"
                  type="number"
                  min="1"
                  defaultValue="1"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddInsumo(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const nombre = (document.getElementById('newInsumoNombre') as HTMLInputElement)?.value;
                  const lote = (document.getElementById('newInsumoLote') as HTMLInputElement)?.value;
                  const cantidad = parseInt((document.getElementById('newInsumoCantidad') as HTMLInputElement)?.value) || 1;
                  
                  if (nombre && lote) {
                    handleAddInsumo({ id: '', nombre, lote, cantidad });
                  } else {
                    toast.error('Por favor completa todos los campos');
                  }
                }}
                className="flex-1"
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4">
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
