import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, Building2, ClipboardList, Save } from 'lucide-react';

interface Hospital {
  id: string;
  nombre: string;
  display_name: string;
}

interface Procedimiento {
  id: string;
  tipo_anestesia: string;
  nombre?: string;
}

interface HospitalProcedimiento {
  id: string;
  hospital_id: string;
  procedimiento_clave: string;
  procedimiento_nombre: string;
}

const SupervisorProcedimientos = () => {
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [hospitalProcedimientos, setHospitalProcedimientos] = useState<HospitalProcedimiento[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedProcedimientos, setSelectedProcedimientos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedHospital) {
      fetchHospitalProcedimientos(selectedHospital);
    }
  }, [selectedHospital]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch hospitals for supervisor
      const { data: hospitalesData } = await supabase
        .from('hospitales')
        .select('id, nombre, display_name')
        .order('display_name');

      setHospitales(hospitalesData || []);

      // Fetch unique procedure types from anestesia_insumos
      const { data: tiposAnestesia } = await supabase
        .from('anestesia_insumos')
        .select('tipo_anestesia')
        .order('tipo_anestesia');

      // Get unique types
      const uniqueTipos = [...new Set(tiposAnestesia?.map(t => t.tipo_anestesia) || [])];
      const procs = uniqueTipos.map((tipo, idx) => ({
        id: `proc-${idx}`,
        tipo_anestesia: tipo,
        nombre: getNombreProcedimiento(tipo)
      }));
      setProcedimientos(procs);

      if (hospitalesData && hospitalesData.length > 0) {
        setSelectedHospital(hospitalesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalProcedimientos = async (hospitalId: string) => {
    try {
      const { data } = await supabase
        .from('hospital_procedimientos')
        .select('*')
        .eq('hospital_id', hospitalId);

      setHospitalProcedimientos(data || []);
      
      // Set selected based on existing
      const selected = new Set(data?.map(hp => hp.procedimiento_clave) || []);
      setSelectedProcedimientos(selected);
    } catch (error) {
      console.error('Error fetching hospital procedures:', error);
    }
  };

  const getNombreProcedimiento = (tipo: string): string => {
    const nombres: Record<string, string> = {
      'general_balanceada_adulto': 'Anestesia General Balanceada Adulto (19.01.001)',
      'general_alta_especialidad': 'Anestesia General de Alta Especialidad (19.01.002)',
      'general_endovenosa': 'Anestesia General Endovenosa (19.01.003)',
      'general_balanceada_pediatrica': 'Anestesia General Balanceada Pediátrica (19.01.004)',
      'locorregional': 'Anestesia Loco Regional (19.01.005)',
      'sedacion': 'Sedación (19.01.006)',
      'alta_especialidad_trasplante': 'Anestesia de Alta Especialidad en Trasplante Renal (19.01.009)'
    };
    return nombres[tipo] || tipo;
  };

  const toggleProcedimiento = (clave: string) => {
    const newSelected = new Set(selectedProcedimientos);
    if (newSelected.has(clave)) {
      newSelected.delete(clave);
    } else {
      newSelected.add(clave);
    }
    setSelectedProcedimientos(newSelected);
  };

  const guardarProcedimientos = async () => {
    if (!selectedHospital) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing
      await supabase
        .from('hospital_procedimientos')
        .delete()
        .eq('hospital_id', selectedHospital);

      // Insert new
      if (selectedProcedimientos.size > 0) {
        const inserts = Array.from(selectedProcedimientos).map(clave => ({
          hospital_id: selectedHospital,
          procedimiento_clave: clave,
          procedimiento_nombre: getNombreProcedimiento(clave),
          created_by: user?.id
        }));

        const { error } = await supabase
          .from('hospital_procedimientos')
          .insert(inserts);

        if (error) throw error;
      }

      toast.success(`${selectedProcedimientos.size} procedimientos autorizados para este hospital`);
      fetchHospitalProcedimientos(selectedHospital);
    } catch (error) {
      console.error('Error saving procedures:', error);
      toast.error('Error al guardar procedimientos');
    } finally {
      setSaving(false);
    }
  };

  const selectedHospitalData = hospitales.find(h => h.id === selectedHospital);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Selección de Procedimientos</h1>
          <p className="text-muted-foreground">Define qué procedimientos están autorizados para cada hospital</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Hospital
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedHospital} onValueChange={setSelectedHospital}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecciona un hospital" />
            </SelectTrigger>
            <SelectContent>
              {hospitales.map(h => (
                <SelectItem key={h.id} value={h.id}>
                  {h.display_name || h.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedHospital && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Procedimientos Autorizados
                <Badge variant="secondary" className="ml-2">
                  {selectedProcedimientos.size} seleccionados
                </Badge>
              </div>
              <Button onClick={guardarProcedimientos} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Hospital: <strong>{selectedHospitalData?.display_name || selectedHospitalData?.nombre}</strong>
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Activo</TableHead>
                      <TableHead>Procedimiento</TableHead>
                      <TableHead>Clave</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedimientos.map(proc => (
                      <TableRow 
                        key={proc.tipo_anestesia}
                        className={selectedProcedimientos.has(proc.tipo_anestesia) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedProcedimientos.has(proc.tipo_anestesia)}
                            onCheckedChange={() => toggleProcedimiento(proc.tipo_anestesia)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {proc.nombre}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {proc.tipo_anestesia}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupervisorProcedimientos;
