import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Insumo {
  id: string;
  nombre: string;
  lote: string;
  cantidad: number;
}

interface InsumoComboboxProps {
  value?: string;
  onSelect: (insumo: Insumo | null) => void;
  tipoAnestesia?: string;
  placeholder?: string;
}

export function InsumoCombobox({ 
  value, 
  onSelect, 
  tipoAnestesia,
  placeholder = "Buscar insumo..." 
}: InsumoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumosPermitidos, setInsumosPermitidos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar insumos disponibles y los permitidos para este tipo de anestesia
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener insumos del hospital del usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Obtener hospital_id del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('hospital_id')
          .eq('id', user.id)
          .single();

        if (!profile?.hospital_id) return;

        // Obtener insumos disponibles con stock > 0
        const { data: insumosData, error: insumosError } = await supabase
          .from('insumos')
          .select('id, nombre, lote, cantidad')
          .eq('hospital_id', profile.hospital_id)
          .gt('cantidad', 0)
          .order('nombre');

        if (insumosError) throw insumosError;

        setInsumos(insumosData || []);

        // Si hay un tipo de anestesia seleccionado, obtener insumos permitidos
        if (tipoAnestesia) {
          const { data: permitidosData, error: permitidosError } = await supabase
            .from('insumo_tipo_anestesia' as any)
            .select('nombre_insumo')
            .eq('tipo_anestesia', tipoAnestesia);

          if (permitidosError) throw permitidosError;

          setInsumosPermitidos(
            permitidosData?.map((item: any) => item.nombre_insumo) || []
          );
        } else {
          // Si no hay tipo de anestesia, todos están permitidos
          setInsumosPermitidos([]);
        }
      } catch (error) {
        console.error('Error al cargar insumos:', error);
        toast.error('Error al cargar insumos disponibles');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tipoAnestesia]);

  // Filtrar insumos según permisos de tipo de anestesia
  const insumosFiltrados = tipoAnestesia && insumosPermitidos.length > 0
    ? insumos.filter((insumo) => 
        insumosPermitidos.some((permitido) => 
          insumo.nombre.toLowerCase().includes(permitido.toLowerCase()) ||
          permitido.toLowerCase().includes(insumo.nombre.toLowerCase())
        )
      )
    : insumos;

  const selectedInsumo = insumos.find((insumo) => insumo.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedInsumo ? selectedInsumo.nombre : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar insumo..." />
          <CommandEmpty>
            {loading ? 'Cargando...' : 'No se encontraron insumos.'}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {insumosFiltrados.map((insumo) => (
              <CommandItem
                key={insumo.id}
                value={`${insumo.nombre} ${insumo.lote}`}
                onSelect={() => {
                  onSelect(insumo.id === value ? null : insumo);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === insumo.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{insumo.nombre}</span>
                  <span className="text-sm text-muted-foreground">
                    Lote: {insumo.lote} | Disponible: {insumo.cantidad}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
