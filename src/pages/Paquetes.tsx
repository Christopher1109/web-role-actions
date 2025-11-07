import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PaqueteForm from '@/components/forms/PaqueteForm';
import { toast } from 'sonner';

const Paquetes = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<any>(null);
  
  const initialPaquetes = [
    {
      id: '1',
      tipo: 'Anestesia General Balanceada Adulto',
      insumos: [
        { nombre: 'Propofol 200mg', cantidad: 2 },
        { nombre: 'Fentanilo 500mcg', cantidad: 1 },
        { nombre: 'Rocuronio 50mg', cantidad: 1 },
        { nombre: 'Sevoflurano', cantidad: 1 },
      ],
      descripcion: 'Para procedimientos quirúrgicos generales en adultos',
    },
    {
      id: '2',
      tipo: 'Anestesia General Balanceada Pediátrica',
      insumos: [
        { nombre: 'Propofol 200mg', cantidad: 1 },
        { nombre: 'Fentanilo 500mcg', cantidad: 1 },
        { nombre: 'Rocuronio 50mg', cantidad: 1 },
        { nombre: 'Sevoflurano', cantidad: 1 },
      ],
      descripcion: 'Adaptado para pacientes pediátricos',
    },
    {
      id: '3',
      tipo: 'Anestesia General de Alta Especialidad',
      insumos: [
        { nombre: 'Propofol 200mg', cantidad: 3 },
        { nombre: 'Fentanilo 500mcg', cantidad: 2 },
        { nombre: 'Rocuronio 50mg', cantidad: 2 },
        { nombre: 'Remifentanilo', cantidad: 1 },
        { nombre: 'Sevoflurano', cantidad: 2 },
      ],
      descripcion: 'Para cirugías complejas de larga duración',
    },
    {
      id: '4',
      tipo: 'Anestesia General Endovenosa',
      insumos: [
        { nombre: 'Propofol 200mg', cantidad: 4 },
        { nombre: 'Remifentanilo', cantidad: 2 },
        { nombre: 'Rocuronio 50mg', cantidad: 1 },
      ],
      descripcion: 'Técnica totalmente intravenosa',
    },
    {
      id: '5',
      tipo: 'Anestesia Locorregional',
      insumos: [
        { nombre: 'Lidocaína 2%', cantidad: 2 },
        { nombre: 'Bupivacaína 0.5%', cantidad: 2 },
        { nombre: 'Fentanilo 500mcg', cantidad: 1 },
      ],
      descripcion: 'Bloqueos nerviosos y epidurales',
    },
    {
      id: '6',
      tipo: 'Sedación',
      insumos: [
        { nombre: 'Propofol 200mg', cantidad: 1 },
        { nombre: 'Midazolam', cantidad: 1 },
        { nombre: 'Fentanilo 500mcg', cantidad: 1 },
      ],
      descripcion: 'Para procedimientos ambulatorios y endoscopías',
    },
  ];

  const [paquetes, setPaquetes] = useState(initialPaquetes);

  const handleCreateOrUpdate = (data: any) => {
    if (editingPaquete) {
      setPaquetes(paquetes.map(p => 
        p.id === editingPaquete.id ? { ...p, ...data } : p
      ));
      setEditingPaquete(null);
    } else {
      const newPaquete = {
        id: String(paquetes.length + 1),
        ...data,
      };
      setPaquetes([newPaquete, ...paquetes]);
    }
    setShowForm(false);
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
