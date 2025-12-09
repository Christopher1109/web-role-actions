import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CentralInventoryItem {
  id: string;
  insumo_id: string;
  nombre: string;
  clave: string;
  cantidad_actual: number;
  updated_at: string;
}

/**
 * This dashboard is intended for the Gerente de Almacén and Cadena de Suministro.
 * It displays the current stock at the Almacén Central and provides actions
 * to update quantities when purchase orders are fulfilled.  It should also
 * allow users to create outgoing traspasos (shipments) to hospitals based
 * on the consolidated requirements.
 */
export default function CentralInventoryDashboard() {
  const [inventory, setInventory] = useState<CentralInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase
      .from("central_inventory")
      .select(
        `id, cantidad_actual, updated_at, insumo:insumos_catalogo(id, nombre, clave)`
      );
    if (error) {
      console.error(error);
    }
    if (data) {
      // Flatten the nested object for easier rendering
      const items = data.map((item: any) => ({
        id: item.id,
        insumo_id: item.insumo?.id,
        nombre: item.insumo?.nombre,
        clave: item.insumo?.clave,
        cantidad_actual: item.cantidad_actual,
        updated_at: item.updated_at,
      }));
      setInventory(items);
    }
    setLoading(false);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Almacén Central</h1>
        <p className="text-muted-foreground">Inventario global y acciones de reaprovisionamiento</p>
      </div>
      {loading ? (
        <p>Cargando inventario…</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insumo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actualizado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.clave}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cantidad_actual}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.updated_at).toLocaleDateString("es-MX")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* TODO: Add button to update inventory from completed purchase orders */}
      {/* TODO: Add button to create traspasos to hospitals based on segmentado format */}
    </div>
  );
}
