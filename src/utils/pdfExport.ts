import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  // Colores
  const lightGray: [number, number, number] = [230, 230, 230];
  const headerBlue: [number, number, number] = [217, 225, 242];

  // Logo
  doc.addImage(cbMedicaLogo, "JPEG", 14, 10, 30, 15);

  // ENCABEZADO INSTITUCIONAL (igual que ya lo tienes)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INSTITUTO MEXICANO DEL SEGURO SOCIAL", 105, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("SEGURIDAD Y SOLIDARIDAD SOCIAL", 105, 21, { align: "center" });

  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', 105, 28, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', 105, 34, {
    align: "center",
  });

  let yPos = 42;

  // 👇👇👇 REEMPLAZA DESDE AQUÍ (SECCIÓN 1 + SECCIÓN 2) 👇👇👇

  // Usamos exactamente las mismas columnas en las dos tablas
  const headerColumnStyles = {
    0: { cellWidth: 36 }, // OOAD / Número de Quirófano
    1: { cellWidth: 36 }, // Unidad Médica / Hora inicio proc.
    2: { cellWidth: 36 }, // No. contrato / Hora fin proc.
    3: { cellWidth: 36 }, // Fecha / Hora inicio anestesia
    4: { cellWidth: 36 }, // Folio / Hora fin anestesia
  };

  // SECCIÓN 1: OOAD / Unidad / Contrato / Fecha / Folio
  autoTable(doc, {
    startY: yPos,
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "N/A",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        folio.fecha
          ? new Date(
              folio.fecha +
                "T" +
                (folio.created_at ? new Date(folio.created_at).toTimeString().slice(0, 8) : "00:00:00"),
            ).toLocaleDateString("es-MX")
          : "N/A",
        folio.numero_folio,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: headerColumnStyles,
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // SECCIÓN 2: Número de quirófano y horarios (alineado EXACTO a la tabla de arriba)
  autoTable(doc, {
    startY: yPos,
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
    head: [
      [
        "Número de Quirófano",
        "Hora de Inicio del Procedimiento Quirúrgico",
        "Hora de la finalización del Procedimiento Quirúrgico",
        "Hora de inicio de la Anestesia",
        "Hora de finalización de la Anestesia",
      ],
    ],
    body: [
      [
        folio.numero_quirofano || "N/A",
        folio.hora_inicio_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toLocaleTimeString("es-MX")
          : "N/A",
        folio.hora_fin_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleTimeString("es-MX")
          : "N/A",
        folio.hora_inicio_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleTimeString("es-MX")
          : "N/A",
        folio.hora_fin_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleTimeString("es-MX")
          : "N/A",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: headerColumnStyles,
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // 👆👆👆 HASTA AQUÍ LO NUEVO. DE AQUÍ PARA ABAJO DEJA TU CÓDIGO COMO LO TENÍAS 👆👆👆

  // ... aquí sigues con la SECCIÓN 3 (Proveedor / Procedimiento / etc.),
  // SECCIÓN 4 (Datos del paciente), etc.
};
