import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CentralInventoryRow {
  id: string;
  insumo_id: string | null;
  cantidad_actual: number;
  updated_at: string;
  insumo?: {
    nombre: string | null;
    clave: string | null;
  } | null;
}

export default function CentralInventoryDashboard() {
  const [rows, setRows] = useState<CentralInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("central_inventory")
        .select(
          `
          id,
          insumo_id,
          cantidad_actual,
          updated_at,
          insumo:insumos_catalogo (
            nombre,
            clave
          )
        `
        )
        .order("updated_at", { ascending: false });

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setRows((data || []) as any);
      }
      setLoading(false);
    };

    fetchInventory();
  }, []);

  if (loading) return <div className="p-4">Cargando inventario central...</div>;

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error al cargar inventario central: {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Inventario del almacén central</h1>
      <p className="text-sm text-gray-600">
        Vista solo lectura del stock global. Los movimientos entran por órdenes
        de compra y salen mediante traspasos a hospitales.
      </p>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Clave</th>
              <th className="px-3 py-2 text-left font-medium">Insumo</th>
              <th className="px-3 py-2 text-right font-medium">
                Cantidad actual
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Última actualización
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  {row.insumo?.clave ?? row.insumo_id ?? "-"}
                </td>
                <td className="px-3 py-2">{row.insumo?.nombre ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  {row.cantidad_actual ?? 0}
                </td>
                <td className="px-3 py-2">
                  {new Date(row.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-4 text-center text-gray-500"
                  colSpan={4}
                >
                  No hay registros en el almacén central todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
