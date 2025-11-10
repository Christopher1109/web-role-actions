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
      
      // Usar la primera hoja (índice 0)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Mapa para rastrear hospitales únicos
      const hospitalesMap = new Map();

      // Procesar datos del Excel
      for (const row of jsonData) {
        if (!row['ESTADO'] || !row['Clave\r\nPresupuestal']) continue;

        const nombreEstado = String(row['ESTADO']).trim();
        const clavePresupuestal = String(row['Clave\r\nPresupuestal']).trim();
        const tipo = String(row['Tipo'] || '').trim();
        const numero = String(row['Número DE CLINICA'] || '').trim();
        const localidad = String(row['Localidad'] || '').trim();
        const procedimiento = String(row['Procedimiento'] || '').trim();

        // Normalizar nombre del estado para obtener código
        let codigoEstado = '';
        const estadoNormalizado = nombreEstado.toLowerCase();
        
        if (estadoNormalizado.includes('baja california sur')) {
          codigoEstado = '03';
        } else if (estadoNormalizado.includes('baja california')) {
          codigoEstado = '02';
        } else if (estadoNormalizado.includes('chihuahua')) {
          codigoEstado = '08';
        } else if (estadoNormalizado.includes('coahuila')) {
          codigoEstado = '05';
        } else if (estadoNormalizado.includes('durango')) {
          codigoEstado = '10';
        } else if (estadoNormalizado.includes('jalisco')) {
          codigoEstado = '14';
        } else if (estadoNormalizado.includes('nayarit')) {
          codigoEstado = '19';
        } else if (estadoNormalizado.includes('nuevo león') || estadoNormalizado.includes('nuevo leon')) {
          codigoEstado = '20';
        } else if (estadoNormalizado.includes('sinaloa')) {
          codigoEstado = '26';
        } else if (estadoNormalizado.includes('sonora')) {
          codigoEstado = '27';
        } else if (estadoNormalizado.includes('zacatecas')) {
          codigoEstado = '34';
        } else if (estadoNormalizado.includes('puebla')) {
          codigoEstado = '22';
        } else if (estadoNormalizado.includes('veracruz norte')) {
          codigoEstado = '31';
        } else if (estadoNormalizado.includes('veracruz sur')) {
          codigoEstado = '32';
        } else if (estadoNormalizado.includes('guanajuato')) {
          codigoEstado = 'GTO';
        } else if (estadoNormalizado.includes('ciudad de méxico') || estadoNormalizado.includes('cdmx')) {
          codigoEstado = 'CDMX';
        } else if (estadoNormalizado.includes('d.f. norte')) {
          codigoEstado = '39';
        } else if (estadoNormalizado.includes('d.f. sur')) {
          codigoEstado = '40';
        } else if (estadoNormalizado.includes('umae') && estadoNormalizado.includes('torreón')) {
          codigoEstado = '4Q';
        } else if (estadoNormalizado.includes('umae') && estadoNormalizado.includes('magdalena')) {
          codigoEstado = '4O';
        } else {
          console.warn(`Estado no reconocido: ${nombreEstado}`);
          continue;
        }

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
        if (procedimiento) {
          hospitalesMap.get(hospitalKey).procedimientos.push({
            clave: `PROC-${procedimiento.substring(0, 20).toUpperCase().replace(/\s+/g, '-')}`,
            nombre: procedimiento,
            maximo: null,
            precio: null
          });
        }
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
              <p>Email: lider.[estado].1@imss.mx (ej: lider.chihuahua.1@imss.mx)</p>
              <p>Contraseña: Lider123!</p>
              <p className="text-muted-foreground text-xs mt-1">
                * Si un estado tiene más de 4 hospitales, se crean múltiples líderes numerados
              </p>
            </div>

            <div>
              <p className="font-semibold">Auxiliares de Anestesia:</p>
              <p>Email: auxiliar.[estado].1@imss.mx (ej: auxiliar.chihuahua.1@imss.mx)</p>
              <p>Contraseña: Auxiliar123!</p>
              <p className="text-muted-foreground text-xs mt-1">
                * Un auxiliar por cada quirófano
              </p>
            </div>

            <div>
              <p className="font-semibold">Almacenistas:</p>
              <p>Email: almacenista.[estado].1@imss.mx (ej: almacenista.chihuahua.1@imss.mx)</p>
              <p>Contraseña: Almacen123!</p>
              <p className="text-muted-foreground text-xs mt-1">
                * Un almacenista por cada almacén
              </p>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-800 font-semibold">Importante:</p>
            <p className="text-sm text-amber-700">
              Los nombres de estado en los emails están sin espacios ni acentos (ej: "nuevoleon", "bajacalifornia").
              Se recomienda que cada usuario cambie su contraseña después del primer inicio de sesión.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
