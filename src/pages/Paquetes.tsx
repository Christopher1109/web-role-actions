import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PaqueteForm from '@/components/forms/PaqueteForm';
import { toast } from 'sonner';

const Paquetes = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<any>(null);
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPaquetes();
    }
  }, [user]);

  const fetchPaquetes = async () => {
    try {
      setLoading(true);
      const { data: paquetesData, error: paquetesError } = await supabase
        .from('paquetes_anestesia')
        .select('*')
        .order('created_at', { ascending: false });

      if (paquetesError) throw paquetesError;

      const paquetesConInsumos = await Promise.all(
        (paquetesData || []).map(async (paquete) => {
          const { data: insumosData } = await supabase
            .from('paquete_insumos')
            .select('cantidad, insumo_id, insumos(nombre)')
            .eq('paquete_id', paquete.id);

          return {
            ...paquete,
            insumos: (insumosData || []).map((i: any) => ({
              id: i.insumo_id,
              nombre: i.insumos?.nombre || '',
              cantidad: i.cantidad,
            })),
          };
        })
      );

      setPaquetes(paquetesConInsumos);
    } catch (error: any) {
      toast.error('Error al cargar paquetes', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: any) => {
    try {
      if (editingPaquete) {
        const { error: paqueteError } = await supabase
          .from('paquetes_anestesia')
          .update({
            tipo: data.tipo,
            descripcion: data.descripcion,
          })
          .eq('id', editingPaquete.id);

        if (paqueteError) throw paqueteError;

        await supabase
          .from('paquete_insumos')
          .delete()
          .eq('paquete_id', editingPaquete.id);

        if (data.insumos && data.insumos.length > 0) {
          const insumosData = data.insumos.map((insumo: any) => ({
            paquete_id: editingPaquete.id,
            insumo_id: insumo.id,
            cantidad: insumo.cantidad,
          }));

          const { error: insumosError } = await supabase
            .from('paquete_insumos')
            .insert(insumosData);

          if (insumosError) throw insumosError;
        }

        toast.success('Paquete actualizado exitosamente');
      } else {
        const { data: paqueteData, error: paqueteError } = await supabase
          .from('paquetes_anestesia')
          .insert({
            nombre: data.nombre || data.tipo,
            tipo: data.tipo,
            descripcion: data.descripcion,
          })
          .select()
          .single();

        if (paqueteError) throw paqueteError;

        if (data.insumos && data.insumos.length > 0) {
          const insumosData = data.insumos.map((insumo: any) => ({
            paquete_id: paqueteData.id,
            insumo_id: insumo.id,
            cantidad: insumo.cantidad,
          }));

          const { error: insumosError } = await supabase
            .from('paquete_insumos')
            .insert(insumosData);

          if (insumosError) throw insumosError;
        }

        toast.success('Paquete creado exitosamente');
      }

      setShowForm(false);
      setEditingPaquete(null);
      fetchPaquetes();
    } catch (error: any) {
      toast.error('Error al guardar paquete', {
        description: error.message,
      });
    }
  };

  const handleEdit = (paquete: any) => {
    setEditingPaquete(paquete);
    setShowForm(true);
  };

  const handleViewHistory = (paquete: any) => {
    toast.info('Historial del paquete', {
      description: `Mostrando historial de uso para: ${paquete.tipo}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paquetes de Anestesia</h1>
          <p className="text-muted-foreground">Configuración de insumos por tipo de procedimiento</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setEditingPaquete(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4" />
          Nuevo Paquete
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Cargando paquetes...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paquetes.map((paquete) => (
          <Card key={paquete.id} className="border-l-4 border-l-accent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Package className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{paquete.tipo}</CardTitle>
                    <p className="text-sm text-muted-foreground">{paquete.descripcion}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-2 text-sm font-medium">Insumos incluidos:</p>
                <div className="space-y-2">
                  {paquete.insumos.map((insumo, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/50 p-2 text-sm">
                      <span>{insumo.nombre}</span>
                      <Badge variant="secondary">{insumo.cantidad} unidad(es)</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEdit(paquete)}
                >
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewHistory(paquete)}
                >
                  Ver Historial
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingPaquete(null);
      }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <PaqueteForm 
            onClose={() => {
              setShowForm(false);
              setEditingPaquete(null);
            }} 
            onSubmit={handleCreateOrUpdate}
            paquete={editingPaquete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Paquetes;
