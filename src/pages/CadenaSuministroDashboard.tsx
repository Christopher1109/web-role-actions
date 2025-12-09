import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SegmentoHospital {
  hospital_id: string;
  hospital_nombre: string;
  insumos: Array<{ insumo_id: string; nombre: string; clave: string; cantidad: number }>;
}

/**
 * Cadena de Suministro dashboard
 *
 * Este componente está pensado para tomar el formato segmentado generado por
 * Gerente de Operaciones y convertirlo en traspasos desde el almacén central a
 * cada hospital.  Debe permitir seleccionar qué insumos se envían y en qué
 * cantidades, y luego crear registros en una tabla `traspasos` para cada hospital.
 */
export default function CadenaSuministroDashboard() {
  const [requerimientos, setRequerimientos] = useState<SegmentoHospital[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSegmentados();
  }, []);

  async function fetchSegmentados() {
    setLoading(true);
    // Este ejemplo asume que existe una tabla `formatos_generados` con
    // `tipo = 'cadena_suministro'` y `data_json.requerimientos_por_hospital`.
    const { data, error } = await supabase
      .from("formatos_generados")
      .select("id, created_at, data_json")
      .eq("tipo", "cadena_suministro")
      .eq("estado", "generado");
    if (error) console.error(error);
    if (data && data.length > 0) {
      const reqs: SegmentoHospital[] = [];
      data.forEach((fmt: any) => {
        const perHospital = fmt.data_json.requerimientos_por_hospital || {};
        Object.keys(perHospital).forEach(hospCode => {
          const insumosList = perHospital[hospCode].map((item: any) => ({
            insumo_id: item.id,
            nombre: item.insumo,
            clave: item.clave,
            cantidad: item.cantidad,
          }));
          reqs.push({
            hospital_id: hospCode,
            hospital_nombre: hospCode, // TODO: map hospital code to display name
            insumos: insumosList,
          });
        });
      });
      setRequerimientos(reqs);
    }
    setLoading(false);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Cadena de Suministro</h1>
      {loading ? <p>Cargando…</p> : (
        <div className="space-y-8">
          {requerimientos.map(seg => (
            <div key={seg.hospital_id} className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">Hospital {seg.hospital_nombre}</h2>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insumo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seg.insumos.map(i => (
                    <tr key={i.insumo_id}>
                      <td className="px-4 py-2 whitespace-nowrap">{i.nombre}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{i.clave}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{i.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* TODO: Add button to create traspaso for this hospital */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
