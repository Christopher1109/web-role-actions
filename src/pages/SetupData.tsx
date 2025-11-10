import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

export default function SetupData() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const getUnidadesPorTipo = (tipo: string): string[] => {
    const unidadesBase = [
      'Quirófano 1',
      'Quirófano 2',
      'Quirófano 3',
      'Almacén Central'
    ];

    if (tipo.includes('UMAE') || tipo === 'HGR') {
      return [...unidadesBase, 'Quirófano 4', 'Quirófano 5', 'Terapia Intensiva'];
    }

    return unidadesBase;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      // Leer el archivo Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[1]]; // Segunda hoja
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Mapa para rastrear hospitales únicos
      const hospitalesMap = new Map();

      // Procesar datos del Excel (empezar desde fila 3, índice 2)
      for (let i = 2; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 8) continue;

        const codigoEstado = String(row[2]).trim();
        const nombreEstado = String(row[3]).trim();
        const clavePresupuestal = String(row[4]).trim();
        const tipo = String(row[5]).trim();
        const numero = String(row[6]).trim();
        const localidad = String(row[7]).trim();
        const claveProcedimiento = String(row[8]).trim();
        const nombreProcedimiento = String(row[9]).trim();
        const maximoAcumulado = row[10] ? parseInt(String(row[10])) : null;
        const precioUnitario = row[11] ? parseFloat(String(row[11]).replace(/[$,]/g, '')) : null;

        // Crear key único para hospital
        const hospitalKey = `${codigoEstado}-${clavePresupuestal}`;
        
        if (!hospitalesMap.has(hospitalKey)) {
          const nombreHospital = `${tipo} ${numero} - ${localidad}`;
          const unidades = getUnidadesPorTipo(tipo);
          
          hospitalesMap.set(hospitalKey, {
            codigo_estado: codigoEstado,
            nombre_estado: nombreEstado,
            clave_presupuestal: clavePresupuestal,
            tipo,
            numero,
            localidad,
            nombre: nombreHospital,
            unidades,
            procedimientos: []
          });
        }

        // Agregar procedimiento
        hospitalesMap.get(hospitalKey).procedimientos.push({
          clave: claveProcedimiento,
          nombre: nombreProcedimiento,
          maximo: maximoAcumulado,
          precio: precioUnitario
        });
      }

      console.log(`Procesados ${hospitalesMap.size} hospitales únicos`);

      // Convertir a array
      const hospitales = Array.from(hospitalesMap.values());

      // Enviar a la edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-from-excel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hospitales }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando el archivo');
      }

      setResult(data);
      toast.success('Datos cargados exitosamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error procesando el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración Inicial del Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Carga el archivo Excel con la información de hospitales y procedimientos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cargar Datos desde Excel</CardTitle>
          <CardDescription>
            Este proceso creará automáticamente:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Todos los hospitales con sus unidades</li>
              <li>Los procedimientos disponibles por hospital</li>
              <li>Usuarios auxiliares y almacenistas por unidad</li>
              <li>Líderes hospitalarios (máximo 4 hospitales por líder)</li>
              <li>Un gerente de operaciones</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Archivo Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Cargar Datos
              </>
            )}
          </Button>

          {result && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Datos cargados exitosamente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Hospitales creados:</p>
                    <p className="text-2xl font-bold text-green-700">{result.hospitales}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Usuarios creados:</p>
                    <div className="space-y-1 text-sm">
                      <p>Auxiliares: {result.usuarios?.auxiliares || 0}</p>
                      <p>Almacenistas: {result.usuarios?.almacenistas || 0}</p>
                      <p>Líderes: {result.usuarios?.lideres || 0}</p>
                      <p>Gerentes: {result.usuarios?.gerentes || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-amber-700">
            <AlertCircle className="mr-2 h-5 w-5" />
            Credenciales de Acceso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-semibold">Gerente de Operaciones:</p>
              <p>Email: gerente@imss.mx</p>
              <p>Contraseña: Gerente123!</p>
            </div>

            <div>
              <p className="font-semibold">Líderes Hospitalarios:</p>
              <p>Email: lider.[estado-id].[número]@imss.mx</p>
              <p>Contraseña: Lider123!</p>
            </div>

            <div>
              <p className="font-semibold">Auxiliares de Anestesia:</p>
              <p>Email: auxiliar.[hospital-id].[unidad-id]@imss.mx</p>
              <p>Contraseña: Auxiliar123!</p>
            </div>

            <div>
              <p className="font-semibold">Almacenistas:</p>
              <p>Email: almacen.[hospital-id].[unidad-id]@imss.mx</p>
              <p>Contraseña: Almacen123!</p>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-800 font-semibold">Importante:</p>
            <p className="text-sm text-amber-700">
              Se recomienda que cada usuario cambie su contraseña después del primer inicio de sesión.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
