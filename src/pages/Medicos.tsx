import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Medicos = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const mockMedicos = [
    {
      id: '1',
      nombre: 'Dr. Carlos Martínez López',
      especialidad: 'cirujano',
      subespecialidad: 'Cirugía General',
      unidad: 'Unidad Central',
      telefono: '555-0101',
      procedimientosRealizados: 156,
    },
    {
      id: '2',
      nombre: 'Dra. Ana García Ruiz',
      especialidad: 'anestesiologo',
      subespecialidad: 'Anestesiología Cardiovascular',
      unidad: 'Unidad Central',
      telefono: '555-0102',
      procedimientosRealizados: 342,
    },
    {
      id: '3',
      nombre: 'Dra. María Hernández Díaz',
      especialidad: 'cirujano',
      subespecialidad: 'Ginecología y Obstetricia',
      unidad: 'Unidad Sur',
      telefono: '555-0103',
      procedimientosRealizados: 289,
    },
    {
      id: '4',
      nombre: 'Dr. José Ramírez Castro',
      especialidad: 'anestesiologo',
      subespecialidad: 'Anestesiología Pediátrica',
      unidad: 'Unidad Norte',
      telefono: '555-0104',
      procedimientosRealizados: 198,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Médicos</h1>
          <p className="text-muted-foreground">Gestión de anestesiólogos y cirujanos</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Médico
        </Button>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="anestesiologos">Anestesiólogos</TabsTrigger>
          <TabsTrigger value="cirujanos">Cirujanos</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockMedicos.map((medico) => (
                  <Card key={medico.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{medico.nombre}</h3>
                              <Badge variant={medico.especialidad === 'anestesiologo' ? 'default' : 'secondary'}>
                                {medico.especialidad === 'anestesiologo' ? 'Anestesiólogo' : 'Cirujano'}
                              </Badge>
                            </div>
                            <div className="grid gap-1 text-sm">
                              <p><span className="font-medium">Especialidad:</span> {medico.subespecialidad}</p>
                              <p><span className="font-medium">Unidad:</span> {medico.unidad}</p>
                              <p><span className="font-medium">Teléfono:</span> {medico.telefono}</p>
                              <p><span className="font-medium">Procedimientos:</span> {medico.procedimientosRealizados}</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anestesiologos">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Filtro de anestesiólogos...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cirujanos">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Filtro de cirujanos...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Medicos;
