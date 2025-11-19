import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ImportMedicamentosLimites() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    importados: number;
    errores: string[];
    message: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultado(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo Excel");
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("import-medicamentos-limites", {
        body: formData,
      });

      if (error) throw error;

      setResultado(data);
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error("Hubo problemas durante la importación");
      }
    } catch (error: any) {
      console.error("Error al importar:", error);
      toast.error(error.message || "Error al importar el archivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <h1 className="text-3xl font-bold">Importar Límites de Medicamentos</h1>
        <p className="text-muted-foreground mt-2">
          Importa el archivo Excel con los límites mínimos y máximos de medicamentos por tipo de anestesia
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Archivo</CardTitle>
            <CardDescription>
              Sube el archivo <strong>medicamentos_maximos_y_minimos.xlsx</strong> que contiene los límites
              de medicamentos para cada tipo de anestesia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Archivo Excel</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            {file && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Archivo seleccionado: <strong>{file.name}</strong>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleImport} 
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? (
                <>Importando...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Medicamentos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className={resultado.success ? "text-green-600" : "text-red-600"}>
                {resultado.success ? "Importación Exitosa" : "Importación con Errores"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">{resultado.message}</p>
                <p className="text-sm text-muted-foreground">
                  Registros importados: <strong>{resultado.importados}</strong>
                </p>
              </div>

              {resultado.errores && resultado.errores.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      Se encontraron {resultado.errores.length} errores:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs max-h-60 overflow-y-auto">
                      {resultado.errores.slice(0, 20).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {resultado.errores.length > 20 && (
                        <li className="font-medium">
                          ... y {resultado.errores.length - 20} errores más
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información Importante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • El archivo debe contener los códigos de procedimiento (ej: 19.01.001) seguidos de las filas de insumos
            </p>
            <p>
              • Cada insumo debe tener: ID BCB, descripción, cantidad mínima y cantidad máxima
            </p>
            <p>
              • Los insumos deben existir previamente en la base de datos
            </p>
            <p>
              • La importación eliminará los límites existentes y creará nuevos registros
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}