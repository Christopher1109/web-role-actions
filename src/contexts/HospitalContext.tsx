import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Definition of a hospital record based on the actual hospitales table structure
 */
export interface Hospital {
  id: string;
  nombre: string;
  state_name: string;
  budget_code: string;
  hospital_type: string;
  clinic_number: string;
  locality: string;
  display_name: string;
  codigo: string;
  estado_id: string;
}

/**
 * Exposed context values for the HospitalProvider
 */
interface HospitalContextType {
  selectedHospital: Hospital | null;
  availableHospitals: Hospital[];
  setSelectedHospital: (hospital: Hospital | null) => void;
  loading: boolean;
  userRole: string | null;
  canSelectHospital: boolean;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

/**
 * Hook for consuming the HospitalContext
 */
export const useHospital = (): HospitalContextType => {
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

/**
 * HospitalProvider loads the list of hospitals based on the current user's
 * role and user ID from user_roles table
 */
export const HospitalProvider = ({ children, userId, userRole }: HospitalProviderProps) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [availableHospitals, setAvailableHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine whether the user can pick from multiple hospitals
  const canSelectHospital = userRole === 'gerente_operaciones' || userRole === 'supervisor';

  useEffect(() => {
    // If there is no user or role, clear hospitals and stop loading
    if (!userId || !userRole) {
      setAvailableHospitals([]);
      setSelectedHospital(null);
      setLoading(false);
      return;
    }

    const loadHospitals = async () => {
      try {
        setLoading(true);
        
        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Error getting user:', userError);
          setAvailableHospitals([]);
          setSelectedHospital(null);
          setLoading(false);
          return;
        }

        // Managers can see all hospitals
        if (userRole === 'gerente_operaciones') {
          const { data: allHospitals, error } = await supabase
            .from('hospitales')
            .select('*')
            .order('nombre');
          
          if (error) {
            console.error('Error loading hospitals for manager:', error);
            setAvailableHospitals([]);
            setSelectedHospital(null);
            setLoading(false);
            return;
          }

          // Map hospitals to our interface
          const hospitals: Hospital[] = (allHospitals || []).map((h: any) => ({
            id: h.id,
            nombre: h.nombre,
            state_name: '', // Will be populated from state_id if needed
            budget_code: h.budget_code || h.codigo || '',
            hospital_type: h.hospital_type || '',
            clinic_number: h.clinic_number || '',
            locality: h.locality || '',
            display_name: h.display_name || h.nombre,
            codigo: h.codigo || '',
            estado_id: h.estado_id || h.state_id || ''
          }));

          setAvailableHospitals(hospitals);
          if (hospitals.length > 0) {
            setSelectedHospital(hospitals[0]);
          }
          setLoading(false);
          return;
        }

        // For other roles, get hospitals from user_roles table
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('hospital_id')
          .eq('user_id', user.id);

        if (userRolesError) {
          console.error('Error fetching user roles:', userRolesError);
          setAvailableHospitals([]);
          setSelectedHospital(null);
          setLoading(false);
          return;
        }

        if (!userRoles || userRoles.length === 0) {
          setAvailableHospitals([]);
          setSelectedHospital(null);
          setLoading(false);
          return;
        }

        // Get unique hospital IDs
        const hospitalIds = [...new Set(userRoles.map(ur => ur.hospital_id).filter(Boolean))];

        if (hospitalIds.length === 0) {
          setAvailableHospitals([]);
          setSelectedHospital(null);
          setLoading(false);
          return;
        }

        // Fetch hospital details
        const { data: hospitalsData, error: hospitalsError } = await supabase
          .from('hospitales')
          .select('*')
          .in('id', hospitalIds);

        if (hospitalsError) {
          console.error('Error fetching hospitals:', hospitalsError);
          setAvailableHospitals([]);
          setSelectedHospital(null);
          setLoading(false);
          return;
        }

        // Map hospitals to our interface
        const hospitals: Hospital[] = (hospitalsData || []).map((h: any) => ({
          id: h.id,
          nombre: h.nombre,
          state_name: '', // Will be populated from state_id if needed
          budget_code: h.budget_code || h.codigo || '',
          hospital_type: h.hospital_type || '',
          clinic_number: h.clinic_number || '',
          locality: h.locality || '',
          display_name: h.display_name || h.nombre,
          codigo: h.codigo || '',
          estado_id: h.estado_id || h.state_id || ''
        }));

        setAvailableHospitals(hospitals);
        if (hospitals.length > 0) {
          setSelectedHospital(hospitals[0]);
        }
        setLoading(false);

      } catch (error) {
        console.error('Error in loadHospitals:', error);
        setAvailableHospitals([]);
        setSelectedHospital(null);
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
