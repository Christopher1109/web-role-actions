import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useHospital } from '@/contexts/HospitalContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type Insumo = {
  id: string;
  clave: string;
  descripcion: string;
};

type FolioInsumo = {
  insumo: Insumo;
  cantidad: number;
};

const folioSchema = z.object({
  numeroFolio: z.string().nonempty('El número de folio es obligatorio'),
  unidad: z.string().nonempty('Debes seleccionar un hospital'),
  numeroQuirofano: z.string().optional(),
  inicioProcedimiento: z.string().optional(),
  finProcedimiento: z.string().optional(),
  inicioAnestesia: z.string().optional(),
  finAnestesia: z.string().optional(),
  pacienteApellidoPaterno: z.string().nonempty('El apellido paterno es obligatorio'),
  pacienteApellidoMaterno: z.string().optional(),
  pacienteNombre: z.string().nonempty('El nombre del paciente es obligatorio'),
  pacienteNSS: z.string().optional(),
  pacienteEdad: z.number().min(0).optional(),
  pacienteGenero: z.enum(['M', 'F', 'Otro']).optional(),
  procedimientoQuirurgico: z.string().nonempty('El procedimiento es obligatorio'),
  especialidadQuirurgica: z.string().optional(),
  tipoCirugia: z.string().optional(),
  tipoEvento: z.string().optional(),
  tipo_anestesia: z.string().nonempty('El tipo de anestesia es obligatorio'),
  cirujano: z.string().optional(),
  anestesiologo: z.string().optional(),
});

type FolioFormValues = z.infer<typeof folioSchema>;

interface FolioFormProps {
  onClose: () => void;
  onSubmit: (values: any) => void;
  defaultValues?: Partial<FolioFormValues>;
}

type Medico = {
  id: string;
  nombre: string;
  especialidad: string;
};

export default function FolioForm({ onClose, onSubmit, defaultValues }: FolioFormProps) {
  const { selectedHospital, availableHospitals, canSelectHospital, setSelectedHospital } = useHospital();
  
  const [tipoAnestesia, setTipoAnestesia] = useState<string>('');
  const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
  const [insumosFolio, setInsumosFolio] = useState<FolioInsumo[]>([]);
  const [showAgregarInsumo, setShowAgregarInsumo] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');
  const [cirujanos, setCirujanos] = useState<Medico[]>([]);
  const [anestesiologos, setAnestesiologos] = useState<Medico[]>([]);

  const form = useForm<FolioFormValues>({
    resolver: zodResolver(folioSchema),
    defaultValues: {
      numeroFolio: '',
      unidad: selectedHospital?.display_name || '',
      numeroQuirofano: '',
      inicioProcedimiento: '',
      finProcedimiento: '',
      inicioAnestesia: '',
      finAnestesia: '',
      pacienteApellidoPaterno: '',
      pacienteApellidoMaterno: '',
      pacienteNombre: '',
      pacienteNSS: '',
      pacienteEdad: 0,
      pacienteGenero: undefined,
      procedimientoQuirurgico: '',
      especialidadQuirurgica: '',
      tipoCirugia: '',
      tipoEvento: '',
      tipo_anestesia: '',
      cirujano: '',
      anestesiologo: '',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (selectedHospital) {
      form.setValue('unidad', selectedHospital.display_name);
    }
  }, [selectedHospital, form]);

  // Cargar médicos activos
  useEffect(() => {
    const loadMedicos = async () => {
      const { data: medicosData, error } = await (supabase as any)
        .from('medicos')
        .select('id, nombre, especialidad')
        .eq('activo', true)
        .order('nombre');

      if (error) {
        console.error('Error cargando médicos', error);
        toast.error('Error al cargar médicos');
        return;
      }

      if (medicosData) {
        // Separar por especialidad
        const cirujanosData = medicosData.filter((m: any) => 
          m.especialidad && (
            m.especialidad.toLowerCase().includes('cirujano') || 
            m.especialidad.toLowerCase().includes('cirugía') ||
            m.especialidad.toLowerCase().includes('cirugia')
          )
        );
        
        const anestesiologosData = medicosData.filter((m: any) => 
          m.especialidad && (
            m.especialidad.toLowerCase().includes('anestesia') ||
            m.especialidad.toLowerCase().includes('anestesiología') ||
            m.especialidad.toLowerCase().includes('anestesiologia')
          )
        );

        setCirujanos(cirujanosData.length > 0 ? cirujanosData : medicosData);
        setAnestesiologos(anestesiologosData.length > 0 ? anestesiologosData : medicosData);
      }
    };

    loadMedicos();
  }, []);

  // Cargar insumos cuando cambia el tipo de anestesia
  useEffect(() => {
    const loadInsumosForAnestesia = async () => {
      if (!tipoAnestesia) {
        setInsumosDisponibles([]);
        setInsumosFolio([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('anestesia_insumos')
        .select('cantidad_default, insumos:insumo_id ( id, clave, descripcion )')
        .eq('tipo_anestesia', tipoAnestesia);

      if (error) {
        console.error('Error cargando insumos para anestesia', error);
        toast.error('Error al cargar insumos');
        return;
      }

      const disponibles: Insumo[] = (data || [])
        .filter((row: any) => row.insumos)
        .map((row: any) => ({
          id: row.insumos.id,
          clave: row.insumos.clave || '',
          descripcion: row.insumos.descripcion || row.insumos.nombre || '',
        }));

      setInsumosDisponibles(disponibles);

      // Preseleccionados con cantidad default
      const preseleccionados: FolioInsumo[] = (data || [])
        .filter((row: any) => row.insumos && row.cantidad_default && row.cantidad_default > 0)
        .map((row: any) => ({
          insumo: {
            id: row.insumos.id,
            clave: row.insumos.clave || '',
            descripcion: row.insumos.descripcion || row.insumos.nombre || '',
          },
          cantidad: row.cantidad_default,
        }));

      setInsumosFolio(preseleccionados);
    };

    loadInsumosForAnestesia();
  }, [tipoAnestesia]);

  const handleAgregarInsumo = () => {
    if (!selectedInsumoId) return;

    const insumo = insumosDisponibles.find((i) => i.id === selectedInsumoId);
    if (!insumo) return;

    setInsumosFolio((prev) => {
      // Si ya existe, no lo dupliques
      if (prev.some((r) => r.insumo.id === selectedInsumoId)) {
        toast.error('Este insumo ya está agregado');
        return prev;
      }
      return [...prev, { insumo, cantidad: 1 }];
    });

    setSelectedInsumoId('');
    setShowAgregarInsumo(false);
    toast.success('Insumo agregado');
  };

  const handleSubmitForm = (values: FolioFormValues) => {
    const hospital = selectedHospital;
    onSubmit({
      ...values,
      state_name: hospital?.state_name,
      hospital_budget_code: hospital?.budget_code,
      hospital_display_name: hospital?.display_name,
      insumos: insumosFolio.filter(r => r.cantidad > 0),
    });
  };

  // Filtrar insumos disponibles que aún no están en el folio
  const insumosParaAgregar = insumosDisponibles.filter(
    (insumo) => !insumosFolio.some((f) => f.insumo.id === insumo.id)
  );

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
          {/* Primera fila: Número de Folio, Unidad Médica, Número de Quirófano */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="numeroFolio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Folio *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="F-2025-976" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad Médica *</FormLabel>
                  {canSelectHospital ? (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const hospital = availableHospitals.find((h) => h.display_name === value);
                        if (hospital) setSelectedHospital(hospital);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona hospital" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableHospitals.map((h) => (
                          <SelectItem key={h.budget_code} value={h.display_name}>
                            {h.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input value={selectedHospital?.display_name || ''} readOnly className="bg-muted" />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numeroQuirofano"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Quirófano *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Q-01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sección Horarios */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Horarios</h3>
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="inicioProcedimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio Procedimiento *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finProcedimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin Procedimiento *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inicioAnestesia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio Anestesia *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finAnestesia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin Anestesia *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Datos del Paciente */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Datos del Paciente</h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pacienteApellidoPaterno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido Paterno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Pérez" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pacienteApellidoMaterno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido Materno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="García" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pacienteNombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre(s) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Juan" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pacienteNSS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NSS *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345678901" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pacienteEdad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        placeholder="35"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pacienteGenero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Procedimiento Quirúrgico */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Procedimiento Quirúrgico</h3>
            <FormField
              control={form.control}
              name="procedimientoQuirurgico"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimiento Quirúrgico *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Apendicectomía" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="especialidadQuirurgica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidad Quirúrgica *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cirugía General" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoCirugia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cirugía *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Electiva">Electiva</SelectItem>
                        <SelectItem value="Urgencia">Urgencia</SelectItem>
                        <SelectItem value="Emergencia">Emergencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoEvento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Programado">Programado</SelectItem>
                        <SelectItem value="No Programado">No Programado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Tipo de Anestesia */}
          <FormField
            control={form.control}
            name="tipo_anestesia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Anestesia *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setTipoAnestesia(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Sedación">Sedación</SelectItem>
                    <SelectItem value="General Balanceada Adulto">
                      General Balanceada Adulto
                    </SelectItem>
                    <SelectItem value="General Balanceada Pediátrica">
                      General Balanceada Pediátrica
                    </SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cirujano y Anestesiólogo */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cirujano"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cirujano *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cirujanos.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No hay cirujanos disponibles
                        </div>
                      ) : (
                        cirujanos.map((medico) => (
                          <SelectItem key={medico.id} value={medico.nombre}>
                            {medico.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anestesiologo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anestesiólogo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {anestesiologos.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No hay anestesiólogos disponibles
                        </div>
                      ) : (
                        anestesiologos.map((medico) => (
                          <SelectItem key={medico.id} value={medico.nombre}>
                            {medico.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tabla de Bienes de Consumo y Medicamentos */}
          <div className="mt-6 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Bienes de Consumo y Medicamentos</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAgregarInsumo(true)}
                disabled={!tipoAnestesia}
              >
                + Agregar insumo
              </Button>
            </div>

            {!tipoAnestesia ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un tipo de anestesia para cargar los insumos disponibles.
              </p>
            ) : insumosFolio.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay insumos agregados. Haz clic en "Agregar insumo" para comenzar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Clave</th>
                      <th className="text-left py-2 px-2">Descripción</th>
                      <th className="text-left py-2 px-2">Cantidad</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosFolio.map((row, idx) => (
                      <tr key={row.insumo.id} className="border-b">
                        <td className="py-2 px-2">{row.insumo.clave}</td>
                        <td className="py-2 px-2">{row.insumo.descripcion}</td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            value={row.cantidad}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setInsumosFolio((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, cantidad: value } : r
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setInsumosFolio((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            Quitar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Registrar folio</Button>
          </div>
        </form>
      </Form>

      {/* Modal para agregar insumo */}
      <Dialog open={showAgregarInsumo} onOpenChange={setShowAgregarInsumo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Insumo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seleccionar Insumo</Label>
              <Select value={selectedInsumoId} onValueChange={setSelectedInsumoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un insumo" />
                </SelectTrigger>
                <SelectContent>
                  {insumosParaAgregar.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No hay más insumos disponibles
                    </div>
                  ) : (
                    insumosParaAgregar.map((insumo) => (
                      <SelectItem key={insumo.id} value={insumo.id}>
                        {insumo.clave} - {insumo.descripcion}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAgregarInsumo(false);
                  setSelectedInsumoId('');
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAgregarInsumo}
                disabled={!selectedInsumoId}
              >
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
