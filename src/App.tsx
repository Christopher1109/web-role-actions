import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { HospitalProvider } from './contexts/HospitalContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Folios from './pages/Folios';
import Insumos from './pages/Insumos';
import Medicos from './pages/Medicos';
import Paquetes from './pages/Paquetes';
import Reportes from './pages/Reportes';
import Traspasos from './pages/Traspasos';
import Usuarios from './pages/Usuarios';
import ExportUsers from './pages/ExportUsers';
import SetupData from './pages/SetupData';
import AutoSetup from './pages/AutoSetup';
import ImportSetup from './pages/ImportSetup';
import FixUsers from './pages/FixUsers';
import GenerateCredentials from './pages/GenerateCredentials';
import PopulateInsumos from './pages/PopulateInsumos';
import ImportProcedimientos from './pages/ImportProcedimientos';
import SetupAlmacenes from './pages/SetupAlmacenes';
import Kardex from './pages/Kardex';
import DiagnosticoInsumos from './pages/DiagnosticoInsumos';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, userRole, username, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Allow access to auto-setup without authentication
  if (!user || !userRole) {
    return (
      <Routes>
        <Route path="/auto-setup" element={<AutoSetup />} />
        <Route path="/fix-users" element={<FixUsers />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <HospitalProvider userId={username} userRole={userRole}>
      <div className="flex h-screen">
        <Sidebar userRole={userRole} onLogout={signOut} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard userRole={userRole} />} />
              {(userRole === 'auxiliar' || userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones') && (
                <Route path="/folios" element={<Folios userRole={userRole} />} />
              )}
              {(userRole === 'almacenista' || userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones') && (
                <>
                  <Route path="/insumos" element={<Insumos />} />
                  <Route path="/kardex" element={<Kardex />} />
                </>
              )}
              {(userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente' || userRole === 'gerente_operaciones') && (
                <>
                  <Route path="/medicos" element={<Medicos />} />
                  <Route path="/paquetes" element={<Paquetes />} />
                  <Route path="/reportes" element={<Reportes />} />
                </>
              )}
              {(userRole === 'gerente' || userRole === 'gerente_operaciones') && (
                <>
                  <Route path="/traspasos" element={<Traspasos />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/export-users" element={<ExportUsers />} />
                  <Route path="/diagnostico-insumos" element={<DiagnosticoInsumos />} />
                  <Route path="/setup" element={<SetupData />} />
                  <Route path="/auto-setup" element={<AutoSetup />} />
                  <Route path="/import-setup" element={<ImportSetup />} />
                  <Route path="/fix-users" element={<FixUsers />} />
                  <Route path="/generate-credentials" element={<GenerateCredentials />} />
                  <Route path="/populate-insumos" element={<PopulateInsumos />} />
                  <Route path="/import-procedimientos" element={<ImportProcedimientos />} />
                  <Route path="/setup-almacenes" element={<SetupAlmacenes />} />
                </>
              )}
              <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HospitalProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
