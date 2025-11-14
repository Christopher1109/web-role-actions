import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// This file provides a fully self‑contained context for managing the current
// hospital and list of hospitals available to the logged in user.  It
// replaces the previous implementation which relied on hard coded units
// (Unidad Central, Norte, Sur, Este) and did not automatically load
// hospitals based on the authenticated user.

/**
 * Definition of a hospital record.  These fields mirror the columns
 * returned by the `hospitales` Supabase table.  Additional fields can be
 * added here if needed.
 */
export interface Hospital {
  state_name: string;
  budget_code: string;
  hospital_type: string;
  clinic_number: string;
  locality: string;
  display_name: string;
}

/**
 * Exposed context values for the HospitalProvider.  Consumers of this
 * context can access the currently selected hospital, the list of
 * hospitals available to the current user, and a setter for changing the
 * selected hospital.  We also expose some convenience flags for UI
 * controls: `canSelectHospital` tells whether the current role may choose
 * from multiple hospitals.
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
 * Hook for consuming the HospitalContext.  Throws an error if used
 * outside of a provider.
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
 * role and user ID.  It maintains the currently selected hospital and
 * exposes it to the rest of the application via context.  When the
 * authenticated user changes, the list of hospitals and selected
 * hospital are refreshed.
 */
export const HospitalProvider = ({ children, userId, userRole }: HospitalProviderProps) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [availableHospitals, setAvailableHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine whether the user can pick from multiple hospitals.  Only
  // managers and supervisors have access to more than one hospital.
  const canSelectHospital = userRole === 'gerente_operaciones' || userRole === 'supervisor';

  useEffect(() => {
    // If there is no user or role, clear hospitals and stop loading
    if (!userId || !userRole) {
      setAvailableHospitals([]);
      setSelectedHospital(null);
      setLoading(false);
      return;
    }

    // Helper to fetch hospitals from Supabase based on role
    const loadHospitals = async () => {
      try {
        setLoading(true);
        // Managers can see all hospitals
        if (userRole === 'gerente_operaciones') {
          const { data: allHospitals, error } = await supabase
            .from('hospitales')
            .select('state_id, estados(name), budget_code, hospital_type, clinic_number, locality, display_name')
            .order('display_name');
          if (error) {
            console.error('Error loading hospitals for manager:', error);
            setAvailableHospitals([]);
            setSelectedHospital(null);
            return;
          }
          const hospitals = (allHospitals ?? []).map((h: any) => ({
            state_name: h.estados?.name || '',
            budget_code: h.budget_code || '',
            hospital_type: h.hospital_type || '',
            clinic_number: h.clinic_number || '',
            locality: h.locality || '',
            display_name: h.display_name || '',
          }));
          setAvailableHospitals(hospitals);
          if (!selectedHospital && hospitals.length > 0) {
            setSelectedHospital(hospitals[0]);
          }
        } else {
          // For non‑managers, fetch the user record first
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', userId)
            .maybeSingle();
          if (userError) {
            console.error('Error fetching user in HospitalProvider:', userError);
            setAvailableHospitals([]);
            setSelectedHospital(null);
            return;
          }
          if (!userData) {
            setAvailableHospitals([]);
            setSelectedHospital(null);
            return;
          }
          if (userRole === 'supervisor') {
            // Supervisors may have up to 4 hospitals assigned in a comma separated list
            const names = (userData.assigned_hospitals || '')
              .split(',')
              .map((n: string) => n.trim())
              .filter((n: string) => n.length > 0);
            if (names.length > 0) {
              const { data: supHospitals, error: supError } = await supabase
                .from('hospitales')
                .select('state_id, estados(name), budget_code, hospital_type, clinic_number, locality, display_name')
                .in('display_name', names)
                .order('display_name');
              if (supError) {
                console.error('Error loading supervisor hospitals:', supError);
                setAvailableHospitals([]);
                setSelectedHospital(null);
                return;
              }
              const hospitals = (supHospitals ?? []).map((h: any) => ({
                state_name: h.estados?.name || '',
                budget_code: h.budget_code || '',
                hospital_type: h.hospital_type || '',
                clinic_number: h.clinic_number || '',
                locality: h.locality || '',
                display_name: h.display_name || '',
              }));
              setAvailableHospitals(hospitals);
              if (!selectedHospital && hospitals.length > 0) {
                setSelectedHospital(hospitals[0]);
              }
            } else {
              setAvailableHospitals([]);
              setSelectedHospital(null);
            }
          } else {
            // Single‑hospital roles (almacenista, lider, auxiliar)
            if (userData.hospital_budget_code && userData.hospital_display_name) {
              const single: Hospital = {
                state_name: userData.state_name || '',
                budget_code: userData.hospital_budget_code,
                hospital_type: '',
                clinic_number: '',
                locality: '',
                display_name: userData.hospital_display_name,
              };
              setAvailableHospitals([single]);
              setSelectedHospital(single);
            } else {
              setAvailableHospitals([]);
              setSelectedHospital(null);
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error loading hospitals:', err);
        setAvailableHospitals([]);
        setSelectedHospital(null);
      } finally {
        setLoading(false);
      }
    };

    loadHospitals();
    // Reset selected hospital when user or role changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
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