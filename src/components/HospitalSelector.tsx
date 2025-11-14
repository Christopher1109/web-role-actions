import { Building2, ChevronDown } from 'lucide-react';
import { useHospital } from '@/contexts/HospitalContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const HospitalSelector = () => {
  const { 
    selectedHospital, 
    availableHospitals, 
    setSelectedHospital, 
    loading,
    canSelectHospital 
  } = useHospital();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  // Usuario de un solo hospital: mostrar solo info, no selector
  if (!canSelectHospital) {
    if (!selectedHospital) {
      return (
        <Alert variant="destructive" className="mx-4 my-2">
          <AlertDescription>
            No se ha asignado un hospital a tu usuario. Contacta al administrador.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Building2 className="h-4 w-4 text-primary" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Hospital:</span>
          <span className="text-sm font-medium truncate">{selectedHospital.display_name}</span>
        </div>
      </div>
    );
  }

  // Gerente o supervisor: mostrar selector
  if (availableHospitals.length === 0) {
    return (
      <Alert variant="destructive" className="mx-4 my-2">
        <AlertDescription>
          No hay hospitales disponibles para tu rol.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="px-4 py-2 border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            size="sm"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">
                {selectedHospital 
                  ? selectedHospital.display_name 
                  : 'Seleccionar hospital'
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px]" align="start">
          <DropdownMenuLabel>Selecciona un hospital</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableHospitals.map((hospital) => (
            <DropdownMenuItem
              key={hospital.budget_code}
              onClick={() => setSelectedHospital(hospital)}
              className="flex flex-col items-start cursor-pointer"
            >
              <span className="font-medium">{hospital.display_name}</span>
              <span className="text-xs text-muted-foreground">
                {hospital.state_name} • {hospital.budget_code}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {!selectedHospital && (
        <p className="text-xs text-muted-foreground mt-2">
          Debes seleccionar un hospital para continuar
        </p>
      )}
    </div>
  );
};
