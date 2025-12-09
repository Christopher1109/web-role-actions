import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Send, Building2, Package, TrendingDown } from "lucide-react";
import { useHospital } from "@/contexts/HospitalContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const queryClient = useQueryClient();
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  // Obtener hospitales asignados al supervisor
  const { data: assignedHospitals = [] } = useQuery({
    queryKey: ["supervisor-hospitals", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("hospital_id")
        .eq("id", user?.id)
        .single();

      if (profile?.hospital_id) {
        const { data } = await supabase
          .from("hospitales")
          .select("id, display_name, budget_code")
          .eq("id", profile.hospital_id);
        return data || [];
      }
      
      // Para supervisores con múltiples hospitales, obtener de users table
      const { data: userData } = await supabase
        .from("users")
        .select("assigned_hospitals")
        .eq("username", user?.email?.split("@")[0] || "")
        .single();

      if (userData?.assigned_hospitals) {
        const hospitalIds = userData.assigned_hospitals.split(",").map((h: string) => h.trim());
        const { data } = await supabase
          .from("hospitales")
          .select("id, display_name, budget_code")
          .in("budget_code", hospitalIds);
        return data || [];
      }

      return [];
    },
    enabled: !!user?.id,
  });

  // Obtener alertas de los hospitales asignados
  const { data: alertas = [], isLoading: loadingAlertas } = useQuery({
    queryKey: ["supervisor-alertas", assignedHospitals],
    queryFn: async () => {
      if (assignedHospitals.length === 0) return [];

      const hospitalIds = assignedHospitals.map((h: any) => h.id);
      
      const { data, error } = await supabase
        .from("insumos_alertas")
        .select(`
          *,
          hospital:hospitales(display_name, budget_code),
          insumo:insumos_catalogo(nombre, clave),
          inventario:inventario_hospital(cantidad_actual, cantidad_minima)
        `)
        .in("hospital_id", hospitalIds)
        .eq("estado", "activa")
        .order("prioridad", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: assignedHospitals.length > 0,
  });

  // Alertas enviadas a gerente operaciones
  const { data: alertasEscaladas = [] } = useQuery({
    queryKey: ["alertas-escaladas", assignedHospitals],
    queryFn: async () => {
      if (assignedHospitals.length === 0) return [];

      const hospitalIds = assignedHospitals.map((h: any) => h.id);
      
      const { data, error } = await supabase
        .from("insumos_alertas")
        .select(`
          *,
          hospital:hospitales(display_name, budget_code),
          insumo:insumos_catalogo(nombre, clave)
        `)
        .in("hospital_id", hospitalIds)
        .eq("enviado_a_gerente_operaciones", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: assignedHospitals.length > 0,
  });

  // Resumen de inventario por hospital
  const { data: resumenInventario = [] } = useQuery({
    queryKey: ["resumen-inventario", assignedHospitals],
    queryFn: async () => {
      if (assignedHospitals.length === 0) return [];

      const hospitalIds = assignedHospitals.map((h: any) => h.id);
      
      const { data, error } = await supabase
        .from("inventario_hospital")
        .select(`
          hospital_id,
          cantidad_actual,
          cantidad_minima,
          hospital:hospitales(display_name)
        `)
        .in("hospital_id", hospitalIds);

      if (error) throw error;

      // Agrupar por hospital
      const resumen = hospitalIds.map((hospitalId: string) => {
        const items = (data || []).filter((i: any) => i.hospital_id === hospitalId);
        const hospital = items[0]?.hospital?.display_name || "Hospital";
        const totalItems = items.length;
        const itemsBajoMinimo = items.filter((i: any) => i.cantidad_actual < i.cantidad_minima).length;
        const itemsCriticos = items.filter((i: any) => i.cantidad_actual === 0).length;

        return {
          hospitalId,
          hospital,
          totalItems,
          itemsBajoMinimo,
          itemsCriticos,
        };
      });

      return resumen;
    },
    enabled: assignedHospitals.length > 0,
  });

  // Escalar alertas a gerente operaciones
  const escalarMutation = useMutation({
    mutationFn: async (alertaIds: string[]) => {
      const { error } = await supabase
        .from("insumos_alertas")
        .update({ 
          enviado_a_gerente_operaciones: true,
          updated_at: new Date().toISOString()
        })
        .in("id", alertaIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-alertas"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-escaladas"] });
      toast.success("Alertas escaladas al Gerente de Operaciones");
      setSelectedAlerts([]);
    },
    onError: () => {
      toast.error("Error al escalar alertas");
    },
  });

  // Resolver alerta
  const resolverMutation = useMutation({
    mutationFn: async (alertaId: string) => {
      const { error } = await supabase
        .from("insumos_alertas")
        .update({ 
          estado: "resuelta",
          resuelto_at: new Date().toISOString(),
          resuelto_por: user?.id
        })
        .eq("id", alertaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-alertas"] });
      toast.success("Alerta marcada como resuelta");
    },
    onError: () => {
      toast.error("Error al resolver alerta");
    },
  });

  const toggleAlertSelection = (id: string) => {
    setSelectedAlerts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "critica": return "destructive";
      case "alta": return "destructive";
      case "media": return "secondary";
      default: return "outline";
    }
  };

  const alertasPendientes = alertas.filter((a: any) => !a.enviado_a_gerente_operaciones);
  const alertasEnviadas = alertas.filter((a: any) => a.enviado_a_gerente_operaciones);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel Supervisor</h1>
        <p className="text-muted-foreground">
          Gestión de alertas e inventario de hospitales asignados
        </p>
      </div>

      {/* Resumen por Hospital */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {resumenInventario.map((hospital: any) => (
          <Card key={hospital.hospitalId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {hospital.hospital}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total items:</span>
                  <span className="font-medium">{hospital.totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Bajo mínimo:</span>
                  <span className="font-medium text-yellow-600">{hospital.itemsBajoMinimo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-destructive">Críticos:</span>
                  <span className="font-medium text-destructive">{hospital.itemsCriticos}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertas Pendientes</CardDescription>
            <CardTitle className="text-4xl flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              {alertasPendientes.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Escaladas a Gerente</CardDescription>
            <CardTitle className="text-4xl flex items-center gap-2">
              <Send className="h-8 w-8 text-blue-500" />
              {alertasEnviadas.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hospitales Asignados</CardDescription>
            <CardTitle className="text-4xl flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              {assignedHospitals.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs de alertas */}
      <Tabs defaultValue="pendientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendientes">
            Alertas Pendientes ({alertasPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="escaladas">
            Escaladas ({alertasEscaladas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Alertas de Inventario</CardTitle>
                  <CardDescription>
                    Revisa y escala las alertas al Gerente de Operaciones
                  </CardDescription>
                </div>
                {selectedAlerts.length > 0 && (
                  <Button 
                    onClick={() => escalarMutation.mutate(selectedAlerts)}
                    disabled={escalarMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Escalar {selectedAlerts.length} alertas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingAlertas ? (
                <p className="text-muted-foreground text-center py-8">Cargando alertas...</p>
              ) : alertasPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay alertas pendientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasPendientes.map((alerta: any) => (
                      <TableRow key={alerta.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedAlerts.includes(alerta.id)}
                            onChange={() => toggleAlertSelection(alerta.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {alerta.hospital?.display_name}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{alerta.insumo?.nombre}</p>
                            <p className="text-xs text-muted-foreground">{alerta.insumo?.clave}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          {alerta.cantidad_actual}
                        </TableCell>
                        <TableCell>{alerta.minimo_permitido}</TableCell>
                        <TableCell>
                          <Badge variant={getPrioridadColor(alerta.prioridad)}>
                            {alerta.prioridad}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(alerta.created_at), "dd/MM/yy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => escalarMutation.mutate([alerta.id])}
                              disabled={escalarMutation.isPending}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolverMutation.mutate(alerta.id)}
                              disabled={resolverMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escaladas">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Escaladas</CardTitle>
              <CardDescription>
                Alertas enviadas al Gerente de Operaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertasEscaladas.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay alertas escaladas
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Escalada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasEscaladas.map((alerta: any) => (
                      <TableRow key={alerta.id}>
                        <TableCell className="font-medium">
                          {alerta.hospital?.display_name}
                        </TableCell>
                        <TableCell>{alerta.insumo?.nombre}</TableCell>
                        <TableCell>
                          <Badge variant={getPrioridadColor(alerta.prioridad)}>
                            {alerta.prioridad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={alerta.estado === "resuelta" ? "default" : "secondary"}>
                            {alerta.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(alerta.updated_at), "dd/MM/yy HH:mm", { locale: es })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupervisorDashboard;
