import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Hospital {
  state_name: string;
  budget_code: string;
  hospital_type: string;
  clinic_number: string;
  locality: string;
  display_name: string;
}

interface HospitalContextType {
  selectedHospital: Hospital | null;
  availableHospitals: Hospital[];
  setSelectedHospital: (hospital: Hospital | null) => void;
  loading: boolean;
  userRole: string | null;
  canSelectHospital: boolean;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within HospitalProvider');
  }
  return context;
};

interface HospitalProviderProps {
  children: ReactNode;
  userId: string | null;
  userRole: string | null;
}

export const HospitalProvider = ({ children, userId, userRole }: HospitalProviderProps) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [availableHospitals, setAvailableHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  // Determinar si el usuario puede seleccionar hospital
  const canSelectHospital = userRole === 'gerente_operaciones' || userRole === 'supervisor';

  useEffect(() => {
    if (!userId || !userRole) {
      setLoading(false);
      return;
    }

    const loadHospitals = async () => {
      try {
        setLoading(true);

        // Obtener información del usuario desde la tabla users  
        const { data: userData } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('username', userId)
          .maybeSingle();

        if (!userData) {
          setLoading(false);
          return;
        }

        if (userRole === 'gerente_operaciones') {
          // Gerente de operaciones puede ver TODOS los hospitales
          const { data: allHospitals } = await (supabase as any)
            .from('hospitales')
            .select('estados(name), budget_code, hospital_type, clinic_number, locality, display_name')
            .order('display_name');

          if (allHospitals) {
            const hospitals = (allHospitals || []).map((h: any) => ({
              state_name: h.estados?.name || '',
              budget_code: h.budget_code || '',
              hospital_type: h.hospital_type || '',
              clinic_number: h.clinic_number || '',
              locality: h.locality || '',
              display_name: h.display_name || '',
            }));
            setAvailableHospitals(hospitals);
          }

        } else if (userRole === 'supervisor') {
          // Supervisor: obtener sus hospitales asignados
          if (userData.assigned_hospitals) {
            // Parsear la lista de hospitales asignados
            const hospitalNames = userData.assigned_hospitals.split(',').map((h: string) => h.trim());
            
            const { data: supervisorHospitals } = await (supabase as any)
              .from('hospitales')
              .select('estados(name), budget_code, hospital_type, clinic_number, locality, display_name')
              .in('display_name', hospitalNames)
              .order('display_name');

            if (supervisorHospitals) {
              const hospitals = (supervisorHospitals || []).map((h: any) => ({
                state_name: h.estados?.name || '',
                budget_code: h.budget_code || '',
                hospital_type: h.hospital_type || '',
                clinic_number: h.clinic_number || '',
                locality: h.locality || '',
                display_name: h.display_name || '',
              }));
              setAvailableHospitals(hospitals);
            }
          }

        } else {
          // Usuario de un solo hospital (almacenista, lider, auxiliar)
          if (userData.hospital_budget_code && userData.hospital_display_name) {
            const singleHospital: Hospital = {
              state_name: userData.state_name || '',
              budget_code: userData.hospital_budget_code,
              hospital_type: '',
              clinic_number: '',
              locality: '',
              display_name: userData.hospital_display_name,
            };
            setAvailableHospitals([singleHospital]);
            setSelectedHospital(singleHospital); // Auto-seleccionar para usuarios de un solo hospital
          }
        }

      } catch (error) {
        console.error('Error in loadHospitals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHospitals();
  }, [userId, userRole]);

  return (
    <HospitalContext.Provider
      value={{
        selectedHospital,
        availableHospitals,
        setSelectedHospital,
        loading,
        userRole,
        canSelectHospital,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};
