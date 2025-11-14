import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Hospital {
  id: string;
  nombre: string;
  display_name: string;
  state_name: string;
  budget_code: string;
  codigo: string;
  estado_id: string;
  activo?: boolean;
}

interface HospitalContextType {
  selectedHospital: Hospital | null;
  availableHospitals: Hospital[];
  setSelectedHospital: (hospital: Hospital) => void;
  loading: boolean;
  canSelectHospital: boolean;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

interface HospitalProviderProps {
  children: React.ReactNode;
  userId: string;
  userRole: string;
}

export const HospitalProvider: React.FC<HospitalProviderProps> = ({ children, userId, userRole }) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [availableHospitals, setAvailableHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [canSelectHospital, setCanSelectHospital] = useState(false);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user found');

        // Fetch user's assigned hospitals from user_roles
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('hospital_id')
          .eq('user_id', user.id)
          .not('hospital_id', 'is', null);

        if (userRolesError) throw userRolesError;

        if (!userRoles || userRoles.length === 0) {
          setAvailableHospitals([]);
          setSelectedHospital(null);
          setCanSelectHospital(false);
          setLoading(false);
          return;
        }

        const hospitalIds = userRoles.map(ur => ur.hospital_id).filter(Boolean) as string[];

        // Fetch hospital details with estado info
        const { data: hospitalsData, error: hospitalsError } = await supabase
          .from('hospitales')
          .select('*, estados(nombre)')
          .in('id', hospitalIds);

        if (hospitalsError) throw hospitalsError;

        // Map to Hospital interface
        const hospitals: Hospital[] = (hospitalsData || []).map(h => ({
          id: h.id,
          nombre: h.nombre,
          display_name: h.nombre,
          state_name: h.estados?.nombre || 'N/A',
          budget_code: h.codigo,
          codigo: h.codigo,
          estado_id: h.estado_id,
          activo: true
        }));

        setAvailableHospitals(hospitals);
        
        // Set selection behavior based on number of hospitals
        if (hospitals.length === 1) {
          setSelectedHospital(hospitals[0]);
          setCanSelectHospital(false);
        } else if (hospitals.length > 1) {
          setSelectedHospital(hospitals[0]); // Default to first hospital
          setCanSelectHospital(true);
        }
      } catch (error) {
        console.error('Error fetching hospitals:', error);
        setAvailableHospitals([]);
        setSelectedHospital(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchHospitals();
    }
  }, [userId]);

  return (
    <HospitalContext.Provider
      value={{
        selectedHospital,
        availableHospitals,
        setSelectedHospital,
        loading,
        canSelectHospital,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (context === undefined) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
