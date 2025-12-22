import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Package,
  ShoppingCart,
  CheckCircle,
  RefreshCw,
  Warehouse,
  Send,
  Clock,
  FileText,
  DollarSign,
  CreditCard,
  Truck,
  AlertTriangle,
  Route,
} from "lucide-react";
import * as XLSX from "xlsx";
import { StatusTimeline } from "@/components/StatusTimeline";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

interface DocumentoAgrupado {
  id: string;
  fecha_generacion: string;
  estado: string;
  enviado_a_gerente_almacen: boolean;
  procesado_por_almacen: boolean;
  procesado_at: string | null;
  detalles?: DetalleAgrupado[];
}

interface DetalleAgrupado {
  id: string;
  insumo_catalogo_id: string;
  total_faltante_requerido: number;
  cantidad_cubierta?: number;
  cantidad_pendiente?: number;
  insumo?: { id: string; nombre: string; clave: string };
}

interface OrdenCompra {
  id: string;
  numero_pedido: string;
  estado: string;
  proveedor: string;
  total_items: number;
  created_at: string;
  documento_origen_id: string | null;
  enviado_a_cadena: boolean;
  aprobado_at: string | null;
  items?: OrdenCompraItem[];
}

interface OrdenCompraItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_solicitada: number;
  cantidad_recibida: number;
  precio_unitario: number | null;
  estado: string;
  insumo?: { id: string; nombre: string; clave: string };
}

interface AlmacenCentralItem {
  id: string;
  insumo_catalogo_id: string;
  cantidad_disponible: number;
  lote: string;
  fecha_caducidad: string;
  insumo?: { id: string; nombre: string; clave: string };
}

/** Helpers */
const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().replace(/,/g, "");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const clampMin0 = (n: number) => (n < 0 ? 0 : n);

const isValidNonNegNumber = (n: number | null) => typeof n === "number" && Number.isFinite(n) && n >= 0;

const GerenteAlmacenDashboard = () => {
  const [documentos, setDocumentos] = useState<DocumentoAgrupado[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [almacenCentral, setAlmacenCentral] = useState<AlmacenCentralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Dialog for setting prices
  const [preciosDialogOpen, setPreciosDialogOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState<OrdenCompra | null>(null);
  const [precios, setPrecios] = useState<Record<string, number>>({});

  const fetchDataCallback = useCallback(() => {
    fetchData();
  }, []);

  // Realtime notifications
  useRealtimeNotifications({
    userRole: "gerente_almacen",
    onDocumentoAgrupado: fetchDataCallback,
    onPedidoActualizado: fetchDataCallback,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: docsData, error: docsError } = await supabase
        .from("documentos_necesidades_agrupado")
        .select(
          `
          *,
          detalles:documento_agrupado_detalle(
            *,
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `,
        )
        .eq("enviado_a_gerente_almacen", true)
        .order("fecha_generacion", { ascending: false })
        .limit(20);

      if (docsError) throw docsError;
      setDocumentos(docsData || []);

      const { data: ordenesData, error: ordenesError } = await supabase
        .from("pedidos_compra")
        .select(
          `
          *,
          items:pedido_items(
            *,
            insumo:insumos_catalogo(id, nombre, clave)
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (ordenesError) throw ordenesError;
      setOrdenesCompra(ordenesData || []);

      const { data: almacenData, error: almacenError } = await supabase
        .from("almacen_central")
        .select(
          `
          *,
          insumo:insumos_catalogo(id, nombre, clave)
        `,
        )
        .order("cantidad_disponible", { ascending: false });

      if (almacenError) throw almacenError;
      setAlmacenCentral(almacenData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  /**
   * DESCARGA EXCEL
   * - Usa cantidad_pendiente (si existe) como verdad para “Cantidad Pendiente Requerida”
   * - Si no existe, calcula total_faltante_requerido - cantidad_cubierta
   */
  const descargarExcelParaProveedor = async (documento: DocumentoAgrupado) => {
    const { data: freshDetalles, error } = await supabase
      .from("documento_agrupado_detalle")
      .select(
        `
        *,
        insumo:insumos_catalogo(id, nombre, clave)
      `,
      )
      .eq("documento_id", documento.id);

    if (error || !freshDetalles || freshDetalles.length === 0) {
      toast.error("Error al obtener datos actualizados del documento");
      return;
    }

    const detallesConPendiente = freshDetalles
      .map((d: any) => {
        const pendienteDB = toNumberOrNull(d.cantidad_pendiente);
        const cubierta = toNumberOrNull(d.cantidad_cubierta) ?? 0;
        const total = toNumberOrNull(d.total_faltante_requerido) ?? 0;

        const pendienteCalculado = clampMin0(total - cubierta);
        const pendienteFinal = isValidNonNegNumber(pendienteDB) ? (pendienteDB as number) : pendienteCalculado;

        return { ...d, _pendienteFinal: pendienteFinal };
      })
      .filter((d: any) => (toNumberOrNull(d._pendienteFinal) ?? 0) > 0);

    if (detallesConPendiente.length === 0) {
      toast.info("Todos los insumos de este documento ya están cubiertos");
      return;
    }

    const data = detallesConPendiente.map((d: any, index: number) => ({
      "No.": index + 1,
      Clave: d.insumo?.clave || "N/A",
      "Nombre del Insumo": d.insumo?.nombre || "N/A",
      "Cantidad Pendiente Requerida": d._pendienteFinal,
      "Cantidad Proveedor": "",
      "Precio Unitario ($)": "",
      "Cantidad Faltante": "",
      "ID Sistema": d.insumo_catalogo_id,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 50 },
      { wch: 26 },
      { wch: 22 },
      { wch: 20 },
      { wch: 22 },
      { wch: 40 },
    ];

    // Cantidad Faltante = Pendiente - Proveedor
    for (let i = 0; i < data.length; i++) {
      const rowNum = i + 2;
      ws[`G${rowNum}`] = { t: "n", f: `D${rowNum}-E${rowNum}`, z: "0" };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitud Proveedor");

    XLSX.writeFile(
      wb,
      `Solicitud_Proveedor_${new Date().toISOString().split("T")[0]}_${documento.id.slice(0, 8)}.xlsx`,
    );

    toast.success("Excel descargado con cantidad pendiente actualizada");
  };

  /**
   * SUBIR EXCEL (respuesta del proveedor)
   * TU REGLA:
   * - Si Cantidad Faltante trae número -> ese es el nuevo pendiente a guardar
   * - Si Cantidad Faltante viene vacía -> se guarda nuevamente la Cantidad Pendiente Requerida del renglón
   * - Se compre o no se compre (Cantidad Proveedor = 0/vacío), el pendiente se debe guardar para la siguiente iteración
   * - Solo se crea OC si hay items con Cantidad Proveedor > 0
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocId) return;

    setUploading(true);
    
    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error("Error reading file");
      toast.error("Error al leer el archivo");
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    reader.onload = async (e) => {
      try {
        const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(bytes, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Array<{
          "No.": number;
          Clave: string;
          "Nombre del Insumo": string;
          "Cantidad Pendiente Requerida": any;
          "Cantidad Proveedor": any;
          "Precio Unitario ($)": any;
          "Cantidad Faltante": any;
          "ID Sistema": string;
        }>;

        console.log("Excel parseado, filas:", jsonData.length);

        if (!jsonData || jsonData.length === 0) {
          toast.error("El Excel no tiene filas válidas");
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        // 1) Cargar TODOS los detalles del documento en UNA sola query
        const { data: allDetalles, error: detallesError } = await supabase
          .from("documento_agrupado_detalle")
          .select("id, insumo_catalogo_id, cantidad_cubierta, total_faltante_requerido")
          .eq("documento_id", selectedDocId);

        if (detallesError) {
          console.error("Error cargando detalles:", detallesError);
          toast.error("Error al cargar detalles del documento");
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        console.log("Detalles cargados:", allDetalles?.length);

        // Crear mapa para lookup O(1)
        const detallesMap = new Map(
          (allDetalles || []).map((d) => [d.insumo_catalogo_id, d])
        );

        // 2) Preparar items con cantidad proveedor > 0 para la OC
        const itemsParaOC: Array<{
          insumoId: string;
          cantProveedor: number;
          precio: number | null;
        }> = [];

        // 3) Preparar updates de cantidad_cubierta Y cantidad_pendiente
        const updates: Array<{ 
          id: string; 
          cantidad_cubierta: number;
          cantidad_pendiente: number;
          total_faltante: number;
        }> = [];

        for (const row of jsonData) {
          const insumoId = row["ID Sistema"];
          if (!insumoId) continue;

          const det = detallesMap.get(insumoId);
          if (!det) {
            console.log("No se encontró detalle para insumo:", insumoId);
            continue;
          }

          const cantProveedor = toNumberOrNull(row["Cantidad Proveedor"]) ?? 0;
          const precio = toNumberOrNull(row["Precio Unitario ($)"]);
          const cantidadFaltanteExcel = toNumberOrNull(row["Cantidad Faltante"]);
          const pendienteRequeridoExcel = toNumberOrNull(row["Cantidad Pendiente Requerida"]) ?? 0;
          
          // Actualizar cantidad_cubierta sumando lo que el proveedor puede dar
          const cubiertaActual = toNumberOrNull(det.cantidad_cubierta) ?? 0;
          const total = toNumberOrNull(det.total_faltante_requerido) ?? 0;
          const nuevaCubierta = cubiertaActual + cantProveedor;
          
          // Calcular nueva cantidad pendiente:
          // Si "Cantidad Faltante" tiene valor en el Excel, usar ese
          // Si no, calcular como total - nuevaCubierta
          let nuevoPendiente: number;
          if (isValidNonNegNumber(cantidadFaltanteExcel)) {
            nuevoPendiente = cantidadFaltanteExcel as number;
          } else {
            nuevoPendiente = clampMin0(total - nuevaCubierta);
          }
          
          // Siempre guardar el update para mantener cantidad_pendiente actualizada
          updates.push({ 
            id: det.id, 
            cantidad_cubierta: nuevaCubierta,
            cantidad_pendiente: nuevoPendiente,
            total_faltante: total
          });
          
          if (cantProveedor > 0) {
            itemsParaOC.push({ insumoId, cantProveedor, precio });
          }
        }

        console.log("Items para OC:", itemsParaOC.length, "Updates:", updates.length);

        // 4) Ejecutar updates de cantidad_cubierta Y cantidad_pendiente en paralelo
        if (updates.length > 0) {
          const BATCH_SIZE = 50;
          for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
              batch.map((u) =>
                supabase
                  .from("documento_agrupado_detalle")
                  .update({ 
                    cantidad_cubierta: u.cantidad_cubierta,
                    cantidad_pendiente: u.cantidad_pendiente
                  })
                  .eq("id", u.id)
              )
            );
            
            // Verificar errores
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
              console.error("Errores en updates:", errors);
            }
          }
          console.log("Cantidad cubierta y pendiente actualizadas");
        }

        // 5) Crear OC solo si hay items con cantidad > 0
        let numeroPedidoCreado: string | null = null;

        if (itemsParaOC.length > 0) {
          const { data: auth } = await supabase.auth.getUser();
          const user = auth.user;

          const numeroPedido = `OC-${Date.now().toString(36).toUpperCase()}`;
          console.log("Creando OC:", numeroPedido, "con", itemsParaOC.length, "items");

          const { data: orden, error: ordenError } = await supabase
            .from("pedidos_compra")
            .insert({
              numero_pedido: numeroPedido,
              creado_por: user?.id,
              total_items: itemsParaOC.length,
              estado: "pendiente",
              proveedor: "Por definir",
              documento_origen_id: selectedDocId,
            })
            .select()
            .single();

          if (ordenError) {
            console.error("Error creando orden:", ordenError);
            throw ordenError;
          }

          console.log("Orden creada:", orden.id);

          const items = itemsParaOC.map((item) => ({
            pedido_id: orden.id,
            insumo_catalogo_id: item.insumoId,
            cantidad_solicitada: item.cantProveedor,
            cantidad_recibida: 0,
            precio_unitario: item.precio,
            estado: "pendiente",
          }));

          const { error: itemsError } = await supabase.from("pedido_items").insert(items);
          if (itemsError) {
            console.error("Error insertando items:", itemsError);
            throw itemsError;
          }

          numeroPedidoCreado = numeroPedido;
          console.log("Items insertados correctamente");
        }

        // 6) Revisión final: si todo pendiente quedó en 0, marcar documento procesado
        const { data: allDetails, error: allDetailsErr } = await supabase
          .from("documento_agrupado_detalle")
          .select("cantidad_pendiente, total_faltante_requerido, cantidad_cubierta")
          .eq("documento_id", selectedDocId);

        if (!allDetailsErr && allDetails) {
          const allCovered = allDetails.every((d: any) => {
            const pendDB = toNumberOrNull(d.cantidad_pendiente);
            const total = toNumberOrNull(d.total_faltante_requerido) ?? 0;
            const cub = toNumberOrNull(d.cantidad_cubierta) ?? 0;

            const pend = isValidNonNegNumber(pendDB) ? (pendDB as number) : clampMin0(total - cub);
            return pend <= 0;
          });

          if (allCovered) {
            await supabase
              .from("documentos_necesidades_agrupado")
              .update({
                procesado_por_almacen: true,
                procesado_at: new Date().toISOString(),
              })
              .eq("id", selectedDocId);
          }
        }

        if (numeroPedidoCreado) {
          toast.success(`OC ${numeroPedidoCreado} creada con ${itemsParaOC.length} items`);
        } else {
          toast.info("No se creó OC porque el proveedor no indicó cantidades");
        }

        setSelectedDocId(null);
        await fetchData();
        
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error("Error al procesar archivo");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const abrirPreciosDialog = (orden: OrdenCompra) => {
    setOrdenEditando(orden);
    const initialPrecios: Record<string, number> = {};
    orden.items?.forEach((item) => {
      initialPrecios[item.id] = item.precio_unitario || 100;
    });
    setPrecios(initialPrecios);
    setPreciosDialogOpen(true);
  };

  const guardarPreciosYEnviarAFinanzas = async () => {
    if (!ordenEditando) return;

    setProcessingDoc(ordenEditando.id);
    try {
      for (const item of ordenEditando.items || []) {
        await supabase
          .from("pedido_items")
          .update({ precio_unitario: precios[item.id] || 100 })
          .eq("id", item.id);
      }

      await supabase
        .from("pedidos_compra")
        .update({
          estado: "enviado_a_finanzas",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ordenEditando.id);

      toast.success(`Orden ${ordenEditando.numero_pedido} enviada a Finanzas para pago`);
      setPreciosDialogOpen(false);
      setOrdenEditando(null);
      fetchData();
    } catch (error) {
      console.error("Error sending to finance:", error);
      toast.error("Error al enviar a finanzas");
    } finally {
      setProcessingDoc(null);
    }
  };

  const calcularTotalOrden = (orden: OrdenCompra) => {
    if (!orden.items) return 0;
    return orden.items.reduce((sum, item) => {
      const precio = item.precio_unitario || 100;
      return sum + precio * item.cantidad_solicitada;
    }, 0);
  };

  const getEstadoBadge = (estado: string) => {
    return <StatusTimeline currentStatus={estado} tipo="pedido" />;
  };

  const simularConfirmacionPago = async (orden: OrdenCompra) => {
    setProcessingDoc(orden.id);
    try {
      await supabase
        .from("pedidos_compra")
        .update({
          estado: "pagado_espera_confirmacion",
          aprobado_at: new Date().toISOString(),
          enviado_a_cadena: true,
          enviado_a_cadena_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orden.id);

      toast.success(`Pago confirmado. Orden ${orden.numero_pedido} enviada a Cadena de Suministros`);
      fetchData();
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast.error("Error al confirmar pago");
    } finally {
      setProcessingDoc(null);
    }
  };

  const documentosPendientes = documentos.filter((d) => !d.procesado_por_almacen);
  const ordenesPendientes = ordenesCompra.filter((o) => o.estado === "pendiente");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">LOAD</h1>
          <p className="text-muted-foreground">Logística y Operaciones de Almacén y Distribución</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentosPendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes por Enviar</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordenesPendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items en Almacén</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{almacenCentral.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total Central</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {almacenCentral.reduce((sum, item) => sum + item.cantidad_disponible, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="almacen" className="space-y-4">
        <TabsList>
          <TabsTrigger value="almacen">Almacén Central</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos Recibidos
            {documentosPendientes.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {documentosPendientes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes de Compra</TabsTrigger>
        </TabsList>

        <TabsContent value="almacen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock del Almacén Central México</CardTitle>
            </CardHeader>
            <CardContent>
              {almacenCentral.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay stock en el almacén central</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Cantidad Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {almacenCentral.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                        <TableCell className="font-medium">{item.insumo?.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{item.lote}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600">
                          {item.cantidad_disponible.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de Necesidades Recibidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Descarga el Excel, consulta con proveedores, y sube la respuesta con precios (aunque no surtan nada,
                actualiza pendientes).
              </p>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                className="hidden"
              />

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : documentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay documentos recibidos</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Recibido</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total Requerido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentos.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          {new Date(doc.fecha_generacion).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">{doc.detalles?.length || 0}</TableCell>
                        <TableCell className="text-right font-mono">
                          {doc.detalles?.reduce((sum, d) => sum + d.total_faltante_requerido, 0).toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          {doc.procesado_por_almacen ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Procesado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => descargarExcelParaProveedor(doc)}>
                              <Download className="mr-2 h-4 w-4" />
                              Descargar Excel
                            </Button>

                            {!doc.procesado_por_almacen && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedDocId(doc.id);
                                  fileInputRef.current?.click();
                                }}
                                disabled={uploading}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {uploading ? "Procesando..." : "Subir Respuesta"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ordenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <p className="text-sm text-muted-foreground">
                Revisa las órdenes, ajusta precios si es necesario, y envía a Finanzas para pago.
              </p>
            </CardHeader>
            <CardContent>
              {ordenesCompra.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay órdenes de compra</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total Estimado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesCompra.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono font-bold">{orden.numero_pedido}</TableCell>
                        <TableCell>{new Date(orden.created_at).toLocaleDateString("es-MX")}</TableCell>
                        <TableCell className="text-right">{orden.total_items}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${calcularTotalOrden(orden).toLocaleString()}
                        </TableCell>
                        <TableCell>{getEstadoBadge(orden.estado)}</TableCell>
                        <TableCell>
                          {orden.estado === "pendiente" && (
                            <Button
                              size="sm"
                              onClick={() => abrirPreciosDialog(orden)}
                              disabled={processingDoc === orden.id}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Enviar a Finanzas
                            </Button>
                          )}
                          {orden.estado === "enviado_a_finanzas" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              onClick={() => simularConfirmacionPago(orden)}
                              disabled={processingDoc === orden.id}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              {processingDoc === orden.id ? "Procesando..." : "Simular Confirmación de Pago"}
                            </Button>
                          )}
                          {orden.estado === "pagado_espera_confirmacion" && (
                            <Badge className="bg-cyan-100 text-cyan-800">
                              <Truck className="mr-1 h-3 w-3" />
                              Esperando recepción
                            </Badge>
                          )}
                          {orden.estado === "recibido" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Completado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={preciosDialogOpen} onOpenChange={setPreciosDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revisar Precios - Orden {ordenEditando?.numero_pedido}
            </DialogTitle>
          </DialogHeader>

          {ordenEditando && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Revisa o ajusta los precios antes de enviar a Finanzas para pago:
              </p>
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenEditando.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.insumo?.clave}</TableCell>
                        <TableCell>{item.insumo?.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{item.cantidad_solicitada}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={precios[item.id] || 100}
                            onChange={(e) =>
                              setPrecios({
                                ...precios,
                                [item.id]: Number(e.target.value),
                              })
                            }
                            className="w-24 h-8 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${((precios[item.id] || 100) * item.cantidad_solicitada).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">Total de la Orden</p>
                  <p className="text-2xl font-bold">
                    $
                    {ordenEditando.items
                      ?.reduce((sum, item) => sum + (precios[item.id] || 100) * item.cantidad_solicitada, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreciosDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarPreciosYEnviarAFinanzas} disabled={processingDoc === ordenEditando?.id}>
              <Send className="mr-2 h-4 w-4" />
              {processingDoc === ordenEditando?.id ? "Enviando..." : "Enviar a Finanzas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenteAlmacenDashboard;
