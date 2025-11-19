import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const tiposAnestesiaLabels: Record<string, string> = {
  'general_balanceada_adulto': 'General Balanceada Adulto',
  'general_balanceada_pediatrica': 'General Balanceada Pediátrica',
  'alta_especialidad': 'Alta Especialidad',
  'alta_especialidad_trasplante': 'Alta Especialidad Trasplante Renal',
  'general_endovenosa': 'General Endovenosa',
  'loco_regional': 'Locorregional',
  'sedacion': 'Sedación',
};

const Paquetes = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [tiposAnestesia, setTiposAnestesia] = useState<any[]>([]);
  const [insumosDelTipo, setInsumosDelTipo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && selectedHospital) {
      fetchTiposAnestesia();
    }
  }, [user, selectedHospital]);

  const fetchTiposAnestesia = async () => {
    try {
      if (!selectedHospital) return;
      
      setLoading(true);
      // Obtener los tipos de anestesia únicos
      const { data, error } = await supabase
        .from('anestesia_insumos')
        .select('tipo_anestesia')
        .order('tipo_anestesia');

      if (error) throw error;

      // Obtener tipos únicos
      const tiposUnicos = [...new Set((data || []).map((d: any) => d.tipo_anestesia))];
      setTiposAnestesia(tiposUnicos.map(tipo => ({
        tipo,
        label: tiposAnestesiaLabels[tipo] || tipo
      })));
      
    } catch (error: any) {
      toast.error('Error al cargar tipos de anestesia', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInsumosDelTipo = async (tipo: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('anestesia_insumos')
        .select(`
          cantidad_default,
          orden,
          insumo_id,
          insumos (
            id,
            nombre,
            descripcion,
            clave,
            cantidad
          )
        `)
        .eq('tipo_anestesia', tipo)
        .order('orden', { ascending: true });

      if (error) throw error;

      setInsumosDelTipo(data || []);
    } catch (error: any) {
      toast.error('Error al cargar insumos', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTipo = (tipo: string) => {
    setSelectedTipo(tipo);
    fetchInsumosDelTipo(tipo);
  };

  return (
    <div className="space-y-6">
      {!selectedHospital && (
        <Alert>
          <AlertDescription>
            Debes seleccionar un hospital para ver y gestionar los paquetes de anestesia.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paquetes de Anestesia</h1>
          <p className="text-muted-foreground">Tipos de anestesia e insumos predefinidos</p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Cargando paquetes...</p>
          </CardContent>
        </Card>
      ) : selectedTipo ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setSelectedTipo(null)}>
            ← Volver a Tipos de Anestesia
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>{tiposAnestesiaLabels[selectedTipo]}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Insumos predefinidos para este tipo de anestesia
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insumosDelTipo.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                    <div className="flex-1">
                      <p className="font-medium">{item.insumos?.nombre || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground">{item.insumos?.descripcion}</p>
                      <p className="text-xs text-muted-foreground">Clave: {item.insumos?.clave}</p>
                    </div>
                    <Badge variant="secondary">
                      {item.cantidad_default} unidad(es)
                    </Badge>
                  </div>
                ))}
                {insumosDelTipo.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No hay insumos configurados para este tipo de anestesia
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiposAnestesia.map((tipo) => (
            <Card 
              key={tipo.tipo} 
              className="border-l-4 border-l-primary cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSelectTipo(tipo.tipo)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tipo.label}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Haz clic para ver insumos
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Paquetes;
