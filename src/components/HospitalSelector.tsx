import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Hospital {
  id: string;
  nombre: string;
  codigo: string;
}

interface HospitalSelectorProps {
  onHospitalChange: (hospitalId: string) => void;
}

export function HospitalSelector({ onHospitalChange }: HospitalSelectorProps) {
  const { user, userRole } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'lider') return;

    const fetchHospitals = async () => {
      try {
        // Obtener hospital del perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('hospital_id')
          .eq('id', user.id)
          .single();

        if (!profile?.hospital_id) {
          setLoading(false);
          return;
        }

        const { data: hospitalsData } = await supabase
          .from('hospitales')
          .select('id, nombre, codigo')
          .eq('id', profile.hospital_id)
          .order('nombre');

        if (hospitalsData) {
          setHospitals(hospitalsData);
          
          // Seleccionar el primer hospital por defecto
          if (hospitalsData.length > 0) {
            setSelectedHospital(hospitalsData[0].id);
            onHospitalChange(hospitalsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error cargando hospitales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, [user, userRole, onHospitalChange]);

  if (userRole !== 'lider' || hospitals.length <= 1) {
    return null;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando hospitales...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Hospital:</span>
      <Select value={selectedHospital} onValueChange={(value) => {
        setSelectedHospital(value);
        onHospitalChange(value);
      }}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Seleccionar hospital" />
        </SelectTrigger>
        <SelectContent>
          {hospitals.map((hospital) => (
            <SelectItem key={hospital.id} value={hospital.id}>
              {hospital.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
