import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Folios from './pages/Folios';
import Insumos from './pages/Insumos';
import Medicos from './pages/Medicos';
import Paquetes from './pages/Paquetes';
import Reportes from './pages/Reportes';
import Traspasos from './pages/Traspasos';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

const queryClient = new QueryClient();

const App = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentPage, setCurrentPage] = useState('Dashboard');

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentPage('Dashboard');
  };

  if (!userRole) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Login onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex h-screen">
            <Sidebar userRole={userRole} onLogout={handleLogout} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header title={currentPage} />
              <main className="flex-1 overflow-y-auto bg-background p-6">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route 
                    path="/dashboard" 
                    element={<Dashboard userRole={userRole} />} 
                  />
                  {(userRole === 'auxiliar' || userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente') && (
                    <Route path="/folios" element={<Folios userRole={userRole} />} />
                  )}
                  {(userRole === 'almacenista' || userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente') && (
                    <Route path="/insumos" element={<Insumos />} />
                  )}
                  {(userRole === 'lider' || userRole === 'supervisor' || userRole === 'gerente') && (
                    <>
                      <Route path="/medicos" element={<Medicos />} />
                      <Route path="/paquetes" element={<Paquetes />} />
                      <Route path="/reportes" element={<Reportes />} />
                    </>
                  )}
                  {userRole === 'gerente' && (
                    <Route path="/traspasos" element={<Traspasos />} />
                  )}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
