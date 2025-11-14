import React, { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

type Insumo = {
  id: string;
  nombre: string;
  lote: string;
  cantidad: number;
};

type FolioInsumo = {
  insumo: {
    id: string;
    nombre: string;
    lote: string;
  };
  cantidad: number;
};

const tiposAnestesia = [
  { value: 'sedacion', label: 'Sedación / Cuidados anestésicos monitoreados' },
  { value: 'loco_regional', label: 'Loco regional' },
  { value: 'general_balanceada_adulto', label: 'General balanceada adulto' },
  { value: 'general_balanceada_pediatrica', label: 'General balanceada pediátrica' },
  { value: 'general_endovenosa', label: 'General endovenosa' },
  { value: 'alta_especialidad', label: 'Alta especialidad' },
  { value: 'alta_especialidad_trasplante', label: 'Alta especialidad trasplante renal' },
  { value: 'anestesia_mixta', label: 'Anestesia mixta' },
];

const tiposAnestesiaNormales = tiposAnestesia.filter(t => t.value !== 'anestesia_mixta');

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
  const [anestesiaPrincipal, setAnestesiaPrincipal] = useState<string>('');
  const [anestesiaSecundaria, setAnestesiaSecundaria] = useState<string>('');
  const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
  const [insumosDisponiblesPrincipal, setInsumosDisponiblesPrincipal] = useState<Insumo[]>([]);
  const [insumosDisponiblesSecundaria, setInsumosDisponiblesSecundaria] = useState<Insumo[]>([]);
  const [insumosFolio, setInsumosFolio] = useState<FolioInsumo[]>([]);
  const [cirujanos, setCirujanos] = useState<Medico[]>([]);
  const [anestesiologos, setAnestesiologos] = useState<Medico[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');

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

  useEffect(() => {
    const loadMedicos = async () => {
      try {
        const { data: medicosData, error } = await supabase
          .from('medicos')
          .select('*')
          .eq('activo', true)
          .order('nombre');

        if (error) throw error;

        if (medicosData) {
          const cirujanosList = medicosData.filter(m => 
            m.especialidad.toLowerCase().includes('ciruj') || 
            m.especialidad.toLowerCase().includes('cirugía')
          );
          const anestesiologosList = medicosData.filter(m => 
            m.especialidad.toLowerCase().includes('anestesia') || 
            m.especialidad.toLowerCase().includes('anestesiología')
          );

          setCirujanos(cirujanosList.length > 0 ? cirujanosList : medicosData);
          setAnestesiologos(anestesiologosList.length > 0 ? anestesiologosList : medicosData);
        }
      } catch (error) {
        console.error('Error loading médicos:', error);
      }
    };

    loadMedicos();
  }, []);

  const loadInsumosForTipo = async (tipo: string): Promise<Insumo[]> => {
    if (!tipo || !selectedHospital?.id) return [];

    try {
      const { data: anestesiaInsumos, error } = await supabase
        .from('anestesia_insumos')
        .select(`
          cantidad_default,
          orden,
          insumo:insumos (
            id,
            nombre,
            lote
          )
        `)
        .eq('tipo_anestesia', tipo)
        .order('orden', { ascending: true });

      if (error) throw error;

      return (anestesiaInsumos || [])
        .filter(ai => ai.insumo)
        .map(ai => ({
          id: ai.insumo.id,
          nombre: ai.insumo.nombre,
          lote: ai.insumo.lote || '',
          cantidad: ai.cantidad_default || 1
        }));
    } catch (error) {
      console.error('Error loading insumos:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadInsumosForAnestesia = async () => {
      if (!tipoAnestesia || tipoAnestesia === 'anestesia_mixta' || !selectedHospital?.id) return;

      const insumosData = await loadInsumosForTipo(tipoAnestesia);
      setInsumosDisponibles(insumosData);

      const preselected = insumosData.slice(0, 5).map(insumo => ({
        insumo: {
          id: insumo.id,
          nombre: insumo.nombre,
          lote: insumo.lote
        },
        cantidad: insumo.cantidad
      }));

      setInsumosFolio(preselected);
    };

    loadInsumosForAnestesia();
  }, [tipoAnestesia, selectedHospital]);

  useEffect(() => {
    const loadInsumosPrincipal = async () => {
      if (!anestesiaPrincipal || tipoAnestesia !== 'anestesia_mixta') return;

      const insumosData = await loadInsumosForTipo(anestesiaPrincipal);
      setInsumosDisponiblesPrincipal(insumosData);

      const preselected = insumosData.slice(0, 5).map(insumo => ({
        insumo: { id: insumo.id, nombre: insumo.nombre, lote: insumo.lote },
        cantidad: insumo.cantidad
      }));

      setInsumosFolio(prev => {
        const existingIds = new Set(prev.map(i => i.insumo.id));
        const newInsumos = preselected.filter(i => !existingIds.has(i.insumo.id));
        return [...prev, ...newInsumos];
      });
    };

    loadInsumosPrincipal();
  }, [anestesiaPrincipal, tipoAnestesia]);

  useEffect(() => {
    const loadInsumosSecundaria = async () => {
      if (!anestesiaSecundaria || tipoAnestesia !== 'anestesia_mixta') return;

      const insumosData = await loadInsumosForTipo(anestesiaSecundaria);
      setInsumosDisponiblesSecundaria(insumosData);

      const preselected = insumosData.slice(0, 5).map(insumo => ({
        insumo: { id: insumo.id, nombre: insumo.nombre, lote: insumo.lote },
        cantidad: insumo.cantidad
      }));

      setInsumosFolio(prev => {
        const existingIds = new Set(prev.map(i => i.insumo.id));
        const newInsumos = preselected.filter(i => !existingIds.has(i.insumo.id));
        return [...prev, ...newInsumos];
      });
    };

    loadInsumosSecundaria();
  }, [anestesiaSecundaria, tipoAnestesia]);

  const insumosParaAgregar = React.useMemo(() => {
    let availableInsumos: Insumo[] = [];
    
    if (tipoAnestesia === 'anestesia_mixta') {
      const unionMap = new Map<string, Insumo>();
      [...insumosDisponiblesPrincipal, ...insumosDisponiblesSecundaria].forEach(insumo => {
        unionMap.set(insumo.id, insumo);
      });
      availableInsumos = Array.from(unionMap.values());
    } else {
      availableInsumos = insumosDisponibles;
    }

    return availableInsumos.filter(
      insumo => !insumosFolio.some(fi => fi.insumo.id === insumo.id)
    );
  }, [tipoAnestesia, insumosDisponibles, insumosDisponiblesPrincipal, insumosDisponiblesSecundaria, insumosFolio]);

  const handleAgregarInsumo = () => {
    const insumo = insumosParaAgregar.find(i => i.id === selectedInsumoId);
    if (!insumo) return;

    setInsumosFolio([...insumosFolio, {
      insumo: { id: insumo.id, nombre: insumo.nombre, lote: insumo.lote },
      cantidad: 1
    }]);

    setSelectedInsumoId('');
    setIsModalOpen(false);
  };

  const handleRemoveInsumo = (insumoId: string) => {
    setInsumosFolio(insumosFolio.filter(fi => fi.insumo.id !== insumoId));
  };

  const handleUpdateCantidad = (insumoId: string, cantidad: number) => {
    setInsumosFolio(insumosFolio.map(fi => 
      fi.insumo.id === insumoId ? { ...fi, cantidad } : fi
    ));
  };

  const handleSubmitForm = (values: FolioFormValues) => {
    const submitData = {
      ...values,
      insumosFolio,
      hospital_id: selectedHospital?.id,
      hospital_display_name: selectedHospital?.display_name,
      hospital_budget_code: selectedHospital?.budget_code,
      state_name: selectedHospital?.state_name,
      ...(tipoAnestesia === 'anestesia_mixta' && {
        anestesia_principal: anestesiaPrincipal,
        anestesia_secundaria: anestesiaSecundaria
      })
    };

    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
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
                  <FormLabel>Especialidad Quirúrgica</FormLabel>
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
                  <FormLabel>Tipo de Cirugía</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="electiva">Electiva</SelectItem>
                      <SelectItem value="urgencia">Urgencia</SelectItem>
                      <SelectItem value="emergencia">Emergencia</SelectItem>
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
                  <FormLabel>Tipo de Evento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="programado">Programado</SelectItem>
                      <SelectItem value="no_programado">No Programado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-base">Tipo de Anestesia</h3>
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
                    if (value !== 'anestesia_mixta') {
                      setAnestesiaPrincipal('');
                      setAnestesiaSecundaria('');
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de anestesia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tiposAnestesia.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {tipoAnestesia === 'anestesia_mixta' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Anestesia Principal *</Label>
                <Select value={anestesiaPrincipal} onValueChange={setAnestesiaPrincipal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAnestesiaNormales.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Anestesia Secundaria *</Label>
                <Select value={anestesiaSecundaria} onValueChange={setAnestesiaSecundaria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAnestesiaNormales.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-base">Personal Médico</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cirujano"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cirujano</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cirujano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cirujanos.map(medico => (
                        <SelectItem key={medico.id} value={medico.id}>
                          {medico.nombre}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Anestesiólogo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar anestesiólogo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {anestesiologos.map(medico => (
                        <SelectItem key={medico.id} value={medico.id}>
                          {medico.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-base">Bienes de Consumo y Medicamentos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              disabled={!tipoAnestesia || (tipoAnestesia === 'anestesia_mixta' && (!anestesiaPrincipal || !anestesiaSecundaria))}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Insumo
            </Button>
          </div>

          {insumosFolio.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay insumos agregados. Haz clic en "Agregar insumo" para comenzar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="w-32">Cantidad</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumosFolio.map((fi) => (
                  <TableRow key={fi.insumo.id}>
                    <TableCell>{fi.insumo.nombre}</TableCell>
                    <TableCell>{fi.insumo.lote}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={fi.cantidad}
                        onChange={(e) => handleUpdateCantidad(fi.insumo.id, Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInsumo(fi.insumo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Crear Folio</Button>
        </div>
      </form>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Insumo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleccionar Insumo</Label>
              <Select value={selectedInsumoId} onValueChange={setSelectedInsumoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {insumosParaAgregar.map(insumo => (
                    <SelectItem key={insumo.id} value={insumo.id}>
                      {insumo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAgregarInsumo} disabled={!selectedInsumoId}>Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
