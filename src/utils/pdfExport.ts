import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF("p", "mm", "a4");

  // Configuración general
  const pageMarginLeft = 14;
  const pageMarginRight = 14;
  const contentWidth = doc.internal.pageSize.getWidth() - pageMarginLeft - pageMarginRight;
  const lightGray: [number, number, number] = [230, 230, 230];

  // Logo CB Médica
  doc.addImage(cbMedicaLogo, "JPEG", pageMarginLeft, 10, 30, 15);

  // Encabezado institucional
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INSTITUTO MEXICANO DEL SEGURO SOCIAL", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("SEGURIDAD Y SOLIDARIDAD SOCIAL", doc.internal.pageSize.getWidth() / 2, 21, { align: "center" });

  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', doc.internal.pageSize.getWidth() / 2, 27, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    'Anexo T 33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"',
    doc.internal.pageSize.getWidth() / 2,
    33,
    { align: "center" },
  );

  let yPos = 40;

  // =========================
  // 1) OOAD / Unidad / Contrato / Fecha / Folio
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "",
        folio.hospital_display_name || "",
        folio.hospital_budget_code || "",
        folio.fecha
          ? new Date(folio.fecha).toLocaleDateString("es-MX")
          : "",
        folio.numero_folio || "",
      ],
    ],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // =========================
  // 2) Horarios - Primera fila
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [
      [
        "Hora de Inicio del Procedimiento",
        "Hora de la finalización del Procedimiento",
        "Hora de inicio de la Anestesia",
        "Hora de finalización de la Anestesia",
      ],
    ],
    body: [
      [
        folio.hora_inicio_procedimiento || "",
        folio.hora_fin_procedimiento || "",
        folio.hora_inicio_anestesia || "",
        folio.hora_fin_anestesia || "",
      ],
    ],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      halign: "center",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // =========================
  // 3) Quirófano y Procedimiento - Segunda fila
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["Número de Quirófano", "Procedimiento Quirúrgico"]],
    body: [[folio.numero_quirofano || "", folio.cirugia || ""]],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      halign: "center",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.3 },
      1: { cellWidth: contentWidth * 0.7 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // =========================
  // 4) Proveedor / Procedimiento / Especialidad / Tipo
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["Proveedor:", "Procedimiento Quirúrgico:", "Especialidad Quirúrgica:", "Tipo de Cirugía"]],
    body: [
      [
        "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.",
        folio.cirugia || "",
        folio.especialidad_quirurgica || "",
        folio.tipo_cirugia || "",
      ],
    ],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // =========================
  // 5) Abierta/Mínima Invasión (fila adicional)
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    body: [["Abierta/Mínima Invasión"]],
    theme: "grid",
    tableWidth: contentWidth,
    bodyStyles: {
      fillColor: lightGray,
      fontSize: 8,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // =========================
  // 6) Evento / Cirujano / Anestesiólogo
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["Evento", "Programado/ Urgencia", "Nombre del Cirujano", "Nombre del Anestesiólogo"]],
    body: [
      [
        folio.tipo_evento || "",
        folio.tipo_evento || "",
        folio.cirujano_nombre || "",
        folio.anestesiologo_nombre || "",
      ],
    ],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // =========================
  // 7) DATOS DEL PACIENTE
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["DATOS DEL PACIENTE"]],
    body: [],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // Datos del paciente - campos
  const generoDisplay = folio.paciente_genero === "Femenino" ? "☑ Femenino  ☐ Masculino" : "☐ Femenino  ☑ Masculino";
  
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["Apellido paterno:", "Apellido materno:", "Nombre(s):", "Género:", "Edad:", "NSS:"]],
    body: [
      [
        folio.paciente_apellido_paterno || "",
        folio.paciente_apellido_materno || "",
        folio.paciente_nombre || "",
        generoDisplay,
        folio.paciente_edad?.toString() || "",
        folio.paciente_nss || "",
      ],
    ],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // =========================
  // 8) Productividad de Procedimientos
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Productividad de Procedimientos:", pageMarginLeft, yPos);
  yPos += 2;

  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "";

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [
      [
        "No.",
        "Clave del Procedimiento(s)",
        "Tipo de Procedimiento Quirúrgico",
        "Procedimiento",
        "Precio Unitario (Sin IVA)",
        "Importe (Con IVA)",
      ],
    ],
    body: [["1", "", tipoAnestesiaDisplay, folio.cirugia || "", "", ""]],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.06, halign: "center" },
      1: { cellWidth: contentWidth * 0.15 },
      2: { cellWidth: contentWidth * 0.22 },
      3: { cellWidth: contentWidth * 0.22 },
      4: { cellWidth: contentWidth * 0.175, halign: "right" },
      5: { cellWidth: contentWidth * 0.175, halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // =========================
  // 9) Bienes de consumo
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bienes de consumo", pageMarginLeft, yPos);
  yPos += 2;

  const bienesBody = insumos.map((insumo, index) => [
    (index + 1).toString(),
    insumo.descripcion || insumo.nombre || "",
    insumo.cantidad.toString(),
  ]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["No.", "Descripción", "Cantidad"]],
    body: bienesBody,
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.08, halign: "center" },
      1: { cellWidth: contentWidth * 0.72 },
      2: { cellWidth: contentWidth * 0.2, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // =========================
  // 10) Medicamentos
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Medicamentos", pageMarginLeft, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["No.", "Descripción", "Cantidad"]],
    body: [["", "", ""]],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      minCellHeight: 15,
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.08, halign: "center" },
      1: { cellWidth: contentWidth * 0.72 },
      2: { cellWidth: contentWidth * 0.2, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // =========================
  // 11) Firmas
  // =========================
  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["(FIRMA Y MATRÍCULA)", ""]],
    theme: "grid",
    tableWidth: contentWidth,
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      minCellHeight: 25,
      halign: "center",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5 },
      1: { cellWidth: contentWidth * 0.5 },
    },
  });

  // Guardar
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
