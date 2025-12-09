import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PurchaseOrder {
  id: string;
  numero_pedido: string;
  proveedor: string | null;
  estado: string;
  created_at: string;
  comprobante_url: string | null;
}

export default function FinanceDashboard() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos_compra")
      .select(
        `
        id,
        numero_pedido,
        proveedor,
        estado,
        created_at,
        comprobante_url
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setOrders((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMarkPaid = async (order: PurchaseOrder) => {
    const url = window.prompt(
      "URL del comprobante (opcional):",
      order.comprobante_url || ""
    );

    const { error } = await supabase
      .from("pedidos_compra")
      .update({
        estado: "pagada",
        comprobante_url: url || null,
      })
      .eq("id", order.id);

    if (error) {
      console.error(error);
      alert("Error al marcar como pagada: " + error.message);
      return;
    }

    await fetchOrders();
  };

  if (loading) return <div className="p-4">Cargando órdenes de compra...</div>;

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error al cargar órdenes de compra: {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Finanzas – Órdenes de compra</h1>
      <p className="text-sm text-gray-600">
        Aquí finanzas puede ver las órdenes generadas por el Gerente de Almacén
        y marcarlas como pagadas, guardando un enlace al comprobante.
      </p>

      {orders.length === 0 && (
        <div className="p-4 border rounded text-gray-500">
          No hay órdenes de compra registradas.
        </div>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">No. pedido</th>
              <th className="px-3 py-2 text-left font-medium">Proveedor</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-left font-medium">Creado</th>
              <th className="px-3 py-2 text-left font-medium">Comprobante</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">{o.numero_pedido}</td>
                <td className="px-3 py-2">{o.proveedor ?? "-"}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "inline-flex px-2 py-1 rounded-full text-xs " +
                      (o.estado === "pagada"
                        ? "bg-green-100 text-green-700"
                        : o.estado === "en_proceso"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700")
                    }
                  >
                    {o.estado}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  {o.comprobante_url ? (
                    <a
                      href={o.comprobante_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline text-xs"
                    >
                      Ver comprobante
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Sin comprobante
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {o.estado !== "pagada" && (
                    <button
                      onClick={() => handleMarkPaid(o)}
                      className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                    >
                      Marcar como pagada
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  No hay órdenes de compra aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
