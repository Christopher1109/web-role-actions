import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TransferItem {
  id: string;
  cantidad: number;
  insumo_id: string | null;
  insumo?: {
    nombre: string | null;
    clave: string | null;
  } | null;
}

interface Transfer {
  id: string;
  hospital_id: string | null;
  hospital?: {
    nombre: string | null;
  } | null;
  estado: string;
  created_at: string;
  items: TransferItem[];
}

export default function CadenaSuministroDashboard() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("traspasos")
      .select(
        `
        id,
        hospital_id,
        estado,
        created_at,
        hospital:hospitales (
          nombre
        ),
        items:traspaso_items (
          id,
          cantidad,
          insumo_id,
          insumo:insumos_catalogo (
            nombre,
            clave
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setTransfers((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  if (loading) return <div className="p-4">Cargando traspasos...</div>;

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error al cargar traspasos: {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        Cadena de suministro – traspasos desde almacén central
      </h1>
      <p className="text-sm text-gray-600">
        Aquí se visualizan los traspasos creados desde el almacén central hacia
        los diferentes hospitales. La lógica para crear nuevos traspasos
        (a partir del formato segmentado del Gerente de Operaciones) se puede
        agregar después como siguiente paso.
      </p>

      {transfers.length === 0 && (
        <div className="p-4 border rounded text-gray-500">
          Aún no hay traspasos registrados desde el almacén central.
        </div>
      )}

      <div className="space-y-4">
        {transfers.map((t) => (
          <div key={t.id} className="border rounded p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">
                  {t.hospital?.nombre ?? "Hospital desconocido"}
                </div>
                <div className="text-xs text-gray-500">
                  ID traspaso: {t.id}
                </div>
              </div>
              <div className="text-right text-sm">
                <div
                  className={
                    "inline-flex px-2 py-1 rounded-full text-xs " +
                    (t.estado === "completado"
                      ? "bg-green-100 text-green-700"
                      : t.estado === "en_proceso"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700")
                  }
                >
                  {t.estado}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Clave</th>
                    <th className="px-2 py-1 text-left font-medium">Insumo</th>
                    <th className="px-2 py-1 text-right font-medium">
                      Cantidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-2 py-1">
                        {item.insumo?.clave ?? item.insumo_id ?? "-"}
                      </td>
                      <td className="px-2 py-1">{item.insumo?.nombre ?? "-"}</td>
                      <td className="px-2 py-1 text-right">
                        {item.cantidad ?? 0}
                      </td>
                    </tr>
                  ))}
                  {t.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-2 text-center text-gray-400"
                      >
                        Sin detalles de insumos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
