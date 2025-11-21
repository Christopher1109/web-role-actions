import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MatchResult {
  insumo_antiguo_id: string;
  insumo_antiguo_nombre: string;
  insumo_nuevo_id: string;
  insumo_nuevo_nombre: string;
  similitud_porcentaje: number;
  clasificacion: 'MATCH_ALTO' | 'MATCH_MEDIO' | 'MATCH_BAJO';
  accion_sugerida: 'Unificar' | 'Revisar manualmente' | 'No unificar';
  tipo_nuevo: string;
  categoria_nueva: string;
  familia_nueva: string;
}

interface Stats {
  total_insumos_antiguos: number;
  total_insumos_nuevos: number;
  match_alto: number;
  match_medio: number;
  match_bajo: number;
  para_unificar: number;
  para_revisar: number;
  no_unificar: number;
}

interface PopulateResult {
  success: boolean;
  mensaje: string;
  estadisticas: {
    total_insumos_antiguos: number;
    total_insumos_nuevos: number;
    mapeos_match_alto: number;
    registros_anestesia: number;
    registros_insertados: number;
    no_mapeados: number;
  };
  ejemplos: any[];
  matches_altos_sample: any[];
}

const DiagnosticoInsumos = () => {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<MatchResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClasificacion, setFilterClasificacion] = useState<string>("todos");
  const [loadingPopulate, setLoadingPopulate] = useState(false);
  const [populateResult, setPopulateResult] = useState<PopulateResult | null>(null);

  const ejecutarAnalisis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-insumos-similarity');

      if (error) throw error;

      if (data.success) {
        setResultados(data.resultados);
        setStats(data.estadisticas);
        toast.success('Análisis completado exitosamente');
      } else {
        throw new Error(data.error || 'Error en el análisis');
      }
    } catch (error) {
      console.error('Error ejecutando análisis:', error);
      toast.error('Error al ejecutar el análisis de similitud');
    } finally {
      setLoading(false);
    }
  };

  const ejecutarPoblacion = async () => {
    setLoadingPopulate(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-insumo-configuracion');

      if (error) throw error;

      if (data.success) {
        setPopulateResult(data);
        toast.success('Matriz de configuración poblada exitosamente');
      } else {
        throw new Error(data.error || 'Error en la población');
      }
    } catch (error) {
      console.error('Error ejecutando población:', error);
      toast.error('Error al poblar la matriz de configuración');
    } finally {
      setLoadingPopulate(false);
    }
  };

  const exportarCSV = () => {
    if (resultados.length === 0) return;

    const headers = [
      'Insumo Antiguo',
      'Insumo Nuevo (Match)',
      'Similitud %',
      'Clasificación',
      'Acción Sugerida',
      'Tipo',
      'Categoría',
      'Familia'
    ];

    const rows = resultados.map(r => [
      r.insumo_antiguo_nombre,
      r.insumo_nuevo_nombre,
      r.similitud_porcentaje,
      r.clasificacion,
      r.accion_sugerida,
      r.tipo_nuevo,
      r.categoria_nueva,
      r.familia_nueva
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `diagnostico_insumos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Archivo CSV exportado');
  };

  const getClasificacionBadge = (clasificacion: string) => {
    switch (clasificacion) {
      case 'MATCH_ALTO':
        return <Badge variant="default" className="bg-green-600">✅ Match Alto</Badge>;
      case 'MATCH_MEDIO':
        return <Badge variant="secondary" className="bg-yellow-600">⚠️ Match Medio</Badge>;
      case 'MATCH_BAJO':
        return <Badge variant="destructive">❌ Match Bajo</Badge>;
      default:
        return <Badge variant="outline">{clasificacion}</Badge>;
    }
  };

  const filteredResultados = resultados.filter(r => {
    const matchSearch = searchTerm === "" || 
      r.insumo_antiguo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.insumo_nuevo_nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchClasificacion = filterClasificacion === "todos" || r.clasificacion === filterClasificacion;
    
    return matchSearch && matchClasificacion;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico de Catálogos de Insumos</h1>
          <p className="text-muted-foreground mt-2">
            Análisis de similitud entre catálogo antiguo (insumos) y catálogo nuevo (insumos_catalogo)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={ejecutarAnalisis} 
            disabled={loading}
            size="lg"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Ejecutar Análisis
              </>
            )}
          </Button>
          <Button 
            onClick={ejecutarPoblacion} 
            disabled={loadingPopulate || !stats}
            size="lg"
          >
            {loadingPopulate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Poblando...
              </>
            ) : (
              "Poblar Matriz de Configuración"
            )}
          </Button>
        </div>
      </div>

      {populateResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Matriz de Configuración Poblada</CardTitle>
            <CardDescription>{populateResult.mensaje}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Mapeos MATCH_ALTO</p>
                <p className="text-2xl font-bold text-green-700">{populateResult.estadisticas.mapeos_match_alto}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros de Anestesia</p>
                <p className="text-2xl font-bold">{populateResult.estadisticas.registros_anestesia}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros Insertados</p>
                <p className="text-2xl font-bold text-blue-700">{populateResult.estadisticas.registros_insertados}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">No Mapeados</p>
                <p className="text-2xl font-bold text-red-700">{populateResult.estadisticas.no_mapeados}</p>
              </div>
            </div>

            {populateResult.ejemplos.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Ejemplos de Configuración Insertada:</h4>
                <div className="rounded-md border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead>Tipo Anestesia</TableHead>
                        <TableHead className="text-center">Min</TableHead>
                        <TableHead className="text-center">Max</TableHead>
                        <TableHead className="text-center">Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {populateResult.ejemplos.map((ejemplo: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{ejemplo.insumos_catalogo?.nombre}</TableCell>
                          <TableCell>{ejemplo.tipo_anestesia}</TableCell>
                          <TableCell className="text-center">{ejemplo.min_anestesia ?? '-'}</TableCell>
                          <TableCell className="text-center">{ejemplo.max_anestesia ?? '-'}</TableCell>
                          <TableCell className="text-center">{ejemplo.cantidad_default ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Insumos Antiguos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_insumos_antiguos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Insumos Nuevos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_insumos_nuevos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">✅ Match Alto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.match_alto}</div>
              <p className="text-xs text-muted-foreground mt-1">Para unificar: {stats.para_unificar}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-600">⚠️ Match Medio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.match_medio}</div>
              <p className="text-xs text-muted-foreground mt-1">Para revisar: {stats.para_revisar}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">❌ Match Bajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.match_bajo}</div>
              <p className="text-xs text-muted-foreground mt-1">No unificar: {stats.no_unificar}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Resultados del Análisis</CardTitle>
                <CardDescription>
                  Mostrando {filteredResultados.length} de {resultados.length} coincidencias
                </CardDescription>
              </div>
              <Button onClick={exportarCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Buscar por nombre de insumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={filterClasificacion} onValueChange={setFilterClasificacion}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por clasificación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las clasificaciones</SelectItem>
                  <SelectItem value="MATCH_ALTO">Match Alto</SelectItem>
                  <SelectItem value="MATCH_MEDIO">Match Medio</SelectItem>
                  <SelectItem value="MATCH_BAJO">Match Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo Antiguo</TableHead>
                    <TableHead>Insumo Nuevo (Match)</TableHead>
                    <TableHead className="text-center">Similitud</TableHead>
                    <TableHead className="text-center">Clasificación</TableHead>
                    <TableHead>Acción Sugerida</TableHead>
                    <TableHead>Tipo/Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResultados.map((resultado, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium max-w-xs">
                        {resultado.insumo_antiguo_nombre}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {resultado.insumo_nuevo_nombre}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${
                          resultado.similitud_porcentaje >= 90 ? 'text-green-600' :
                          resultado.similitud_porcentaje >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {resultado.similitud_porcentaje}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getClasificacionBadge(resultado.clasificacion)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          resultado.accion_sugerida === 'Unificar' ? 'default' :
                          resultado.accion_sugerida === 'Revisar manualmente' ? 'secondary' :
                          'outline'
                        }>
                          {resultado.accion_sugerida}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {resultado.tipo_nuevo} / {resultado.categoria_nueva}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && resultados.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Haz clic en "Ejecutar Análisis" para comenzar el diagnóstico de similitud<br />
              entre los catálogos de insumos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiagnosticoInsumos;
