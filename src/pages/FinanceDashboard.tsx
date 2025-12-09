import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PurchaseOrder {
  id: string;
  numero_pedido: string;
  proveedor: string | null;
  estado: string;
  created_at: string;
  total_items: number;
  comprobante_url: string | null;
}

export default function FinanceDashboard() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos_compra")
      .select("id, numero_pedido, proveedor, estado, created_at, total_items, comprobante_url");
    if (error) console.error(error);
    if (data) setOrders(data as any);
    setLoading(false);
  }

  async function handleMarkPaid(order: PurchaseOrder, file?: File) {
    // TODO: Upload file to storage and update comprobante_url
    // Then update estado to 'pagada' and notify almacén
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Finanzas</h1>
      {loading ? <p>Cargando órdenes…</p> : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Pedido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map(order => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap">{order.numero_pedido}</td>
                <td className="px-6 py-4 whitespace-nowrap">{order.proveedor || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{order.total_items}</td>
                <td className="px-6 py-4 whitespace-nowrap">{order.estado}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* TODO: file input and button to mark as paid */}
                  <button onClick={() => handleMarkPaid(order)} className="px-4 py-2 bg-green-600 text-white rounded-md">Marcar pagado</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
