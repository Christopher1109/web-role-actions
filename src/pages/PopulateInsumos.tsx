import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Package, Loader2, CheckCircle, XCircle } from 'lucide-react';

const PopulateInsumos = () => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handlePopulate = async () => {
    try {
      setLoading(true);
      setResultado(null);
      
      toast.info('Iniciando población de insumos...', {
        description: 'Este proceso puede tomar unos segundos',
      });

      const { data, error } = await supabase.functions.invoke('populate-alta-especialidad');

      if (error) throw error;

      setResultado(data);

      if (data.success) {
        toast.success('Insumos poblados correctamente', {
          description: `${data.insumos_creados} creados, ${data.insumos_actualizados} actualizados`,
        });
      } else {
        toast.error('Error al poblar insumos', {
          description: data.error || 'Error desconocido',
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al poblar insumos', {
        description: error.message,
      });
      setResultado({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurar Insumos por Tipo de Anestesia</h1>
        <p className="text-muted-foreground">
          Poblar la base de datos con los insumos predefinidos para Anestesia General Balanceada Adulto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Anestesia General Balanceada Adulto
          </CardTitle>
          <CardDescription>
            Este proceso creará o actualizará 23 insumos con sus cantidades mínimas, máximas y reglas especiales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Nota:</strong> Este proceso es seguro y puede ejecutarse múltiples veces. 
              Si los insumos ya existen, se actualizarán con los valores correctos.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Se configurarán los siguientes tipos de insumos:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Insumos con cantidad fija (8 insumos)</li>
              <li>Insumos con rango de cantidad (11 insumos)</li>
              <li>Insumos a elección del anestesiólogo (3 insumos)</li>
              <li>Insumos desactivados (1 insumo)</li>
            </ul>
          </div>

          <Button
            onClick={handlePopulate}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Poblando insumos...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Poblar Insumos
              </>
            )}
          </Button>

          {resultado && (
            <Card className={resultado.success ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {resultado.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Población Exitosa
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Error en la Población
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resultado.success ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total de insumos:</p>
                        <p className="font-semibold">{resultado.total_insumos}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Insumos creados:</p>
                        <p className="font-semibold text-green-600">{resultado.insumos_creados}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Insumos actualizados:</p>
                        <p className="font-semibold text-blue-600">{resultado.insumos_actualizados}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tipo de anestesia:</p>
                        <p className="font-semibold">{resultado.tipo_anestesia}</p>
                      </div>
                    </div>
                    {resultado.errores && resultado.errores.length > 0 && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                          <p className="font-semibold mb-2">Se encontraron algunos errores:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            {resultado.errores.map((error: string, idx: number) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-semibold">Error:</p>
                      <p className="text-sm">{resultado.error}</p>
                      {resultado.details && (
                        <p className="text-xs mt-2 opacity-75">{resultado.details}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Siguiente paso</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Una vez poblados los insumos, dirígete a la página de <strong>Paquetes</strong> para 
            visualizar la configuración completa de "Anestesia General Balanceada Adulto" con 
            todas las cantidades mínimas, máximas y notas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PopulateInsumos;
