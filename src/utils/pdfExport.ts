import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  // Doc A4 en mm
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Colores T33
  const headerBlue: [number, number, number] = [210, 225, 245];
  const lightGray: [number, number, number] = [230, 230, 230];

  // Márgenes y ancho útil (todos los cuadros usan esto)
  const MARGIN_LEFT = 14;
  const MARGIN_RIGHT = 14;
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // MISMO ancho de columnas para tabla 1 y 2
  const firstBlockColumnStyles: Record<number, any> = {
    0: { cellWidth: 30 }, // OOAD / Número de quirófano
    1: { cellWidth: 38 },
    2: { cellWidth: 38 },
    3: { cellWidth: 38 },
    4: { cellWidth: 38 }, // 30 + 38*4 = 182 = CONTENT_WIDTH
  };

  // Logo CB Médica
  doc.addImage(cbMedicaLogo, "JPEG", MARGIN_LEFT, 10, 30, 15);

  // ENCABEZADO INSTITUCIONAL
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INSTITUTO MEXICANO DEL SEGURO SOCIAL", 105, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("SEGURIDAD Y SOLIDARIDAD SOCIAL", 105, 21, { align: "center" });

  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', 105, 27, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', 105, 33, {
    align: "center",
  });

  let yPos = 40;

  // =========================
  // 1) OOAD / Unidad / Contrato / Fecha / Folio
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "N/A",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        folio.fecha ? new Date(folio.fecha).toLocaleDateString("es-MX") : "N/A",
        folio.numero_folio || "N/A",
      ],
    ],
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      halign: "center",
    },
    columnStyles: firstBlockColumnStyles,
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // =========================
  // 2) Quirófano + Horas
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
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
        folio.hora_inicio_procedimiento || "N/A",
        folio.hora_fin_procedimiento || "N/A",
        folio.hora_inicio_anestesia || "N/A",
        folio.hora_fin_anestesia || "N/A",
      ],
    ],
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      halign: "center",
    },
    // MISMAS columnas que la tabla 1
    columnStyles: firstBlockColumnStyles,
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // =========================================================
  // 3) PROVEEDOR / PROCEDIMIENTO / ESPECIALIDAD / EVENTO
  // =========================================================
  const proveedorTableBody: RowInput[] = [
    [
      {
        content: "Proveedor:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      {
        content: "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.",
        colSpan: 3,
        styles: { halign: "left" },
      },
    ],
    [
      {
        content: "Procedimiento Quirúrgico:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      { content: folio.cirugia || "N/A", styles: { halign: "left" } },
      {
        content: "Especialidad Quirúrgica:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      { content: folio.especialidad_quirurgica || "N/A", styles: { halign: "left" } },
    ],
    [
      {
        content: "Tipo de Cirugía:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      { content: folio.tipo_cirugia || "N/A", styles: { halign: "left" } },
      {
        content: "Evento:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      { content: folio.tipo_evento || "N/A", styles: { halign: "left" } },
    ],
    [
      {
        content: "Nombre del Cirujano:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      { content: folio.cirujano_nombre || "N/A", styles: { halign: "left" } },
      {
        content: "Nombre del Anestesiólogo:",
        styles: { fillColor: headerBlue, fontStyle: "bold", halign: "left" },
      },
      { content: folio.anestesiologo_nombre || "N/A", styles: { halign: "left" } },
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    body: proveedorTableBody,
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // 4) DATOS DEL PACIENTE
  // =========================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", 105, yPos, { align: "center" });
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    head: [["Apellido paterno", "Apellido materno", "Nombre(s)", "Género", "Edad", "NSS"]],
    body: [
      [
        folio.paciente_apellido_paterno || "N/A",
        folio.paciente_apellido_materno || "N/A",
        folio.paciente_nombre || "N/A",
        folio.paciente_genero || "N/A",
        folio.paciente_edad?.toString() || "N/A",
        folio.paciente_nss || "N/A",
      ],
    ],
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      halign: "center",
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // =========================
  // 5) PRODUCTIVIDAD DE PROCEDIMIENTOS
  // =========================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", MARGIN_LEFT, yPos);
  yPos += 2;

  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "N/A";

  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    head: [
      [
        "No.",
        "Clave del Procedimiento(s)",
        "Tipo de Procedimiento",
        "Procedimiento Quirúrgico",
        "Precio Unitario (Sin IVA)",
        "Importe (Con IVA)",
      ],
    ],
    body: [["1", "N/A", tipoAnestesiaDisplay, folio.cirugia || "N/A", "", ""]],
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: "center" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // 6) BIENES DE CONSUMO
  // =========================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de consumo", MARGIN_LEFT, yPos);
  yPos += 2;

  const insumosBody = insumos.map((insumo, index) => [
    (index + 1).toString(),
    insumo.nombre_catalogo || insumo.nombre || insumo.descripcion || "N/A",
    insumo.nombre_comun || insumo.descripcion || insumo.nombre || "N/A",
    `${insumo.cantidad} (PIEZA)`,
  ]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: "center" },
      3: { halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // =========================
  // 7) FIRMAS
  // =========================
  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    tableWidth: CONTENT_WIDTH,
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (FIRMA Y MATRÍCULA)", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["", ""]],
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 16,
      fontSize: 8,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
  });

  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
