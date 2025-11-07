import { useState } from 'react';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import FolioForm from '@/components/forms/FolioForm';
import { toast } from 'sonner';

interface FoliosProps {
  userRole: UserRole;
}

const mockFoliosData = [
    {
      id: '1',
      numeroFolio: 'F-2024-001',
      fecha: '2024-11-07',
      paciente: 'Juan Pérez García',
      cirugia: 'Apendicectomía',
      tipoAnestesia: 'general_balanceada_adulto',
      cirujano: 'Dr. Martínez López',
      anestesiologo: 'Dra. García Ruiz',
      estado: 'activo',
    },
    {
      id: '2',
      numeroFolio: 'F-2024-002',
      fecha: '2024-11-07',
      paciente: 'María González Torres',
      cirugia: 'Cesárea',
      tipoAnestesia: 'locorregional',
      cirujano: 'Dra. Hernández Díaz',
      anestesiologo: 'Dr. Ramírez Castro',
      estado: 'activo',
    },
    {
      id: '3',
      numeroFolio: 'F-2024-003',
      fecha: '2024-11-06',
      paciente: 'Carlos Rodríguez Méndez',
      cirugia: 'Colonoscopia',
      tipoAnestesia: 'sedacion',
      cirujano: 'Dr. López Sánchez',
      anestesiologo: 'Dra. García Ruiz',
      estado: 'cancelado',
    },
];

const Folios = ({ userRole }: FoliosProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [folios, setFolios] = useState(mockFoliosData);

  const canCancel = userRole === 'supervisor' || userRole === 'gerente';

  const handleCreateFolio = (data: any) => {
    const newFolio = {
      id: String(folios.length + 1),
      numeroFolio: data.numeroFolio,
      fecha: new Date().toISOString().split('T')[0],
      paciente: data.pacienteNombre,
      cirugia: data.cirugia,
      tipoAnestesia: data.tipoAnestesia,
      cirujano: data.cirujano,
      anestesiologo: data.anestesiologo,
      estado: 'activo' as const,
    };
    setFolios([newFolio, ...folios]);
  };

  const handleCancelFolio = (folioId: string) => {
    setFolios(folios.map(f => 
      f.id === folioId ? { ...f, estado: 'cancelado' as const } : f
    ));
    toast.success('Folio cancelado exitosamente');
  };

  const tiposAnestesiaLabels: Record<string, string> = {
    general_balanceada_adulto: 'General Balanceada Adulto',
    general_balanceada_pediatrica: 'General Balanceada Pediátrica',
    general_alta_especialidad: 'General Alta Especialidad',
    general_endovenosa: 'General Endovenosa',
    locorregional: 'Locorregional',
    sedacion: 'Sedación',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Folios</h1>
          <p className="text-muted-foreground">Gestión de procedimientos quirúrgicos</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Folio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, paciente o cirugía..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {folios.map((folio) => (
              <Card key={folio.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{folio.numeroFolio}</h3>
                        <Badge variant={folio.estado === 'activo' ? 'default' : 'destructive'}>
                          {folio.estado === 'activo' ? 'Activo' : 'Cancelado'}
                        </Badge>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <p><span className="font-medium">Paciente:</span> {folio.paciente}</p>
                        <p><span className="font-medium">Cirugía:</span> {folio.cirugia}</p>
                        <p><span className="font-medium">Fecha:</span> {folio.fecha}</p>
                        <p><span className="font-medium">Tipo de Anestesia:</span> {tiposAnestesiaLabels[folio.tipoAnestesia]}</p>
                        <p><span className="font-medium">Cirujano:</span> {folio.cirujano}</p>
                        <p><span className="font-medium">Anestesiólogo:</span> {folio.anestesiologo}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Ver Detalle</Button>
                      {canCancel && folio.estado === 'activo' && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleCancelFolio(folio.id)}
                        >
                          <FileX className="h-4 w-4" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <FolioForm onClose={() => setShowForm(false)} onSubmit={handleCreateFolio} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Folios;
