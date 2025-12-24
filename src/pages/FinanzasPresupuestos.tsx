import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface Hospital {
  id: string;
  display_name: string;
  budget_code: string;
}

interface PresupuestoHospital {
  hospitalId: string;
  hospitalNombre: string;
  presupuestoAsignado: number;
  presupuestoEjecutado: number;
  porcentajeEjecutado: number;
  estado: 'ok' | 'warning' | 'danger';
}

const FinanzasPresupuestos = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState<string>("");
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [presupuestos, setPresupuestos] = useState<Map<string, number>>(new Map());
  const [presupuestosData, setPresupuestosData] = useState<PresupuestoHospital[]>([]);

  const anios = ["2024", "2025", "2026"];
  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  useEffect(() => {
    const currentMonth = (new Date().getMonth() + 1).toString();
    setMes(currentMonth);
    fetchHospitales();
  }, []);

  useEffect(() => {
    if (mes && hospitales.length > 0) {
      fetchPresupuestos();
    }
  }, [anio, mes, hospitales]);

  const fetchHospitales = async () => {
    const { data, error } = await supabase
      .from("hospitales")
      .select("id, display_name, budget_code")
      .order("display_name");
    
    if (!error && data) {
      setHospitales(data);
    }
  };

  const fetchPresupuestos = async () => {
    try {
      setLoading(true);
      const anioNum = parseInt(anio);
      const mesNum = parseInt(mes);
      const fechaInicio = `${anioNum}-${mes.padStart(2, '0')}-01`;
      const fechaFin = `${anioNum}-${mes.padStart(2, '0')}-31`;

      // Obtener presupuestos guardados
      const { data: presupuestosGuardados } = await supabase
        .from("presupuestos_hospital")
        .select("*")
        .eq("anio", anioNum)
        .eq("mes", mesNum);

      // Obtener gastos ejecutados (costos de insumos en folios)
      const { data: folios } = await supabase
        .from("folios")
        .select("id, hospital_id")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)
        .in("estado", ["completado", "cerrado"] as any[]);

      const folioIds = folios?.map(f => f.id) || [];
      const { data: foliosInsumos } = await supabase
        .from("folios_insumos")
        .select("folio_id, insumo_id, cantidad")
        .in("folio_id", folioIds);

      const { data: precios } = await supabase
        .from("precios_insumos")
        .select("insumo_catalogo_id, precio_unitario")
        .eq("activo", true);

      // Crear mapas
      const preciosMap = new Map();
      precios?.forEach(p => preciosMap.set(p.insumo_catalogo_id, p.precio_unitario));

      const folioHospitalMap = new Map();
      folios?.forEach(f => folioHospitalMap.set(f.id, f.hospital_id));

      // Calcular gasto por hospital
      const gastosPorHospital = new Map<string, number>();
      foliosInsumos?.forEach(fi => {
        const hospitalId = folioHospitalMap.get(fi.folio_id);
        if (!hospitalId) return;

        const precio = preciosMap.get(fi.insumo_id) || 0;
        const costo = precio * fi.cantidad;

        gastosPorHospital.set(hospitalId, (gastosPorHospital.get(hospitalId) || 0) + costo);
      });

      // Crear mapa de presupuestos guardados
      const presupuestosMap = new Map<string, number>();
      presupuestosGuardados?.forEach(p => {
        presupuestosMap.set(p.hospital_id, Number(p.presupuesto_asignado));
      });

      // Construir datos de presupuestos
      const presupuestosArray: PresupuestoHospital[] = hospitales.map(hospital => {
        const asignado = presupuestosMap.get(hospital.id) || 0;
        const ejecutado = gastosPorHospital.get(hospital.id) || 0;
        const porcentaje = asignado > 0 ? (ejecutado / asignado) * 100 : 0;

        let estado: 'ok' | 'warning' | 'danger' = 'ok';
        if (asignado > 0) {
          if (porcentaje > 100) estado = 'danger';
          else if (porcentaje > 80) estado = 'warning';
        }

        return {
          hospitalId: hospital.id,
          hospitalNombre: hospital.display_name || hospital.budget_code,
          presupuestoAsignado: asignado,
          presupuestoEjecutado: ejecutado,
          porcentajeEjecutado: porcentaje,
          estado
        };
      });

      setPresupuestos(presupuestosMap);
      setPresupuestosData(presupuestosArray);

    } catch (error) {
      console.error("Error fetching presupuestos:", error);
      toast.error("Error al cargar presupuestos");
    } finally {
      setLoading(false);
    }
  };

  const handlePresupuestoChange = (hospitalId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPresupuestos = new Map(presupuestos);
    newPresupuestos.set(hospitalId, numValue);
    setPresupuestos(newPresupuestos);
  };

  const guardarPresupuestos = async () => {
    try {
      setSaving(true);
      const anioNum = parseInt(anio);
      const mesNum = parseInt(mes);

      // Eliminar presupuestos existentes del período
      await supabase
        .from("presupuestos_hospital")
        .delete()
        .eq("anio", anioNum)
        .eq("mes", mesNum);

      // Insertar nuevos presupuestos
      const inserts = Array.from(presupuestos.entries())
        .filter(([_, value]) => value > 0)
        .map(([hospitalId, presupuestoAsignado]) => ({
          hospital_id: hospitalId,
          mes: mesNum,
          anio: anioNum,
          presupuesto_asignado: presupuestoAsignado
        }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("presupuestos_hospital")
          .insert(inserts);

        if (error) throw error;
      }

      toast.success("Presupuestos guardados correctamente");
      fetchPresupuestos();

    } catch (error) {
      console.error("Error saving presupuestos:", error);
      toast.error("Error al guardar presupuestos");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getEstadoBadge = (estado: 'ok' | 'warning' | 'danger') => {
    switch (estado) {
      case 'danger':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Excedido</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 gap-1"><AlertTriangle className="h-3 w-3" /> Alerta</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> OK</Badge>;
    }
  };

  const getMesLabel = () => meses.find(m => m.value === mes)?.label || '';

  // Calcular totales
  const totalAsignado = presupuestosData.reduce((sum, p) => sum + p.presupuestoAsignado, 0);
  const totalEjecutado = presupuestosData.reduce((sum, p) => sum + p.presupuestoEjecutado, 0);
  const hospitalesEnAlerta = presupuestosData.filter(p => p.estado !== 'ok').length;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Presupuestos</h1>
          <p className="text-muted-foreground">Asignar y monitorear presupuestos mensuales por hospital</p>
        </div>
        <div className="flex gap-4">
          <Select value={anio} onValueChange={setAnio}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anios.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={guardarPresupuestos} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalAsignado)}</div>
            <p className="text-xs text-muted-foreground">{getMesLabel()} {anio}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ejecutado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEjecutado)}</div>
            <p className="text-xs text-muted-foreground">
              {totalAsignado > 0 ? ((totalEjecutado / totalAsignado) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalAsignado - totalEjecutado >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(totalAsignado - totalEjecutado)}
            </div>
            <p className="text-xs text-muted-foreground">Restante</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hospitales en Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hospitalesEnAlerta > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {hospitalesEnAlerta}
            </div>
            <p className="text-xs text-muted-foreground">Exceden o cerca del límite</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de presupuestos */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuestos por Hospital - {getMesLabel()} {anio}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Hospital</TableHead>
                  <TableHead className="w-[180px]">Presupuesto Asignado</TableHead>
                  <TableHead className="text-right">Ejecutado</TableHead>
                  <TableHead className="w-[200px]">Avance</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presupuestosData.map((p) => (
                  <TableRow key={p.hospitalId}>
                    <TableCell className="font-medium">{p.hospitalNombre}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={presupuestos.get(p.hospitalId) || ''}
                        onChange={(e) => handlePresupuestoChange(p.hospitalId, e.target.value)}
                        placeholder="0"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(p.presupuestoEjecutado)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress 
                          value={Math.min(p.porcentajeEjecutado, 100)} 
                          className={`h-2 ${p.estado === 'danger' ? '[&>div]:bg-destructive' : p.estado === 'warning' ? '[&>div]:bg-yellow-500' : ''}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {p.porcentajeEjecutado.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.presupuestoAsignado > 0 ? getEstadoBadge(p.estado) : 
                        <Badge variant="outline">Sin asignar</Badge>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanzasPresupuestos;
