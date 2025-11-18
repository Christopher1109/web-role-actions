import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  // Colores del formato T33 IMSS
  const headerBlue: [number, number, number] = [210, 220, 240]; // azul pastel
  const lightGray: [number, number, number] = [230, 230, 230];
  const black: [number, number, number] = [0, 0, 0];

  const marginLeft = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - marginLeft * 2;

  // Logo CB Médica
  doc.addImage(cbMedicaLogo, "JPEG", marginLeft, 10, 30, 15);

  // ENCABEZADO INSTITUCIONAL
  doc.setTextColor(...black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INSTITUTO MEXICANO DEL SEGURO SOCIAL", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("SEGURIDAD Y SOLIDARIDAD SOCIAL", pageWidth / 2, 21, { align: "center" });

  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', pageWidth / 2, 27, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', pageWidth / 2, 33, {
    align: "center",
  });

  let yPos = 40;

  // ============================================================
  // 1) CABECERA: OOAD/UMAE + Unidad + Contrato + Fecha + Folio
  // ============================================================

  const fechaCompleta = folio.fecha
    ? new Date(
        `${folio.fecha}T${folio.created_at ? new Date(folio.created_at).toTimeString().slice(0, 8) : "00:00:00"}`,
      ).toLocaleString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "N/A";

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "N/A",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        fechaCompleta,
        folio.numero_folio || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: black,
      halign: "center",
      valign: "middle",
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.18 },
      1: { cellWidth: tableWidth * 0.22 },
      2: { cellWidth: tableWidth * 0.2 },
      3: { cellWidth: tableWidth * 0.2 },
      4: { cellWidth: tableWidth * 0.2 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // ============================================================
  // 2) HORARIOS + NÚMERO DE QUIRÓFANO (alineado con cabecera)
  // ============================================================

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
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
        folio.numero_quirofano || "",
        folio.hora_inicio_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toTimeString().slice(0, 8)
          : "",
        folio.hora_fin_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toTimeString().slice(0, 8)
          : "",
        folio.hora_inicio_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toTimeString().slice(0, 8)
          : "",
        folio.hora_fin_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toTimeString().slice(0, 8)
          : "",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: black,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: black,
      halign: "center",
      valign: "middle",
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.18 },
      1: { cellWidth: tableWidth * 0.22 },
      2: { cellWidth: tableWidth * 0.2 },
      3: { cellWidth: tableWidth * 0.2 },
      4: { cellWidth: tableWidth * 0.2 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // ============================================================
  // 3) PROVEEDOR + PROCEDIMIENTO (mismas filas que plantilla)
  // ============================================================

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
    body: [
      [
        { content: "Proveedor:", styles: { fontStyle: "bold", fillColor: lightGray } },
        {
          content: "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.",
          colSpan: 4,
        },
      ],
      [
        { content: "Procedimiento Quirúrgico:", styles: { fontStyle: "bold", fillColor: lightGray } },
        { content: folio.cirugia || "N/A", colSpan: 2 },
        { content: "Especialidad Quirúrgica:", styles: { fontStyle: "bold", fillColor: lightGray } },
        { content: folio.especialidad_quirurgica || "N/A" },
      ],
      [
        { content: "Tipo de Cirugía:", styles: { fontStyle: "bold", fillColor: lightGray } },
        { content: folio.tipo_cirugia || "N/A" },
        { content: "Evento:", styles: { fontStyle: "bold", fillColor: lightGray } },
        { content: folio.tipo_evento || "N/A", colSpan: 2 },
      ],
      [
        { content: "Nombre del Cirujano:", styles: { fontStyle: "bold", fillColor: lightGray } },
        { content: folio.cirujano_nombre || "N/A", colSpan: 2 },
        { content: "Nombre del Anestesiólogo:", styles: { fontStyle: "bold", fillColor: lightGray } },
        { content: folio.anestesiologo_nombre || "N/A" },
      ],
    ] as RowInput[],
    theme: "grid",
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
      halign: "left",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.18 },
      1: { cellWidth: tableWidth * 0.22 },
      2: { cellWidth: tableWidth * 0.2 },
      3: { cellWidth: tableWidth * 0.2 },
      4: { cellWidth: tableWidth * 0.2 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // ============================================================
  // 4) DATOS DEL PACIENTE (fila horizontal como plantilla)
  // ============================================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DATOS DEL PACIENTE", marginLeft, yPos - 1);

  autoTable(doc, {
    startY: yPos + 1,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
    head: [["Apellido paterno", "Apellido materno", "Nombre(s)", "Género", "Edad", "NSS"]],
    body: [
      [
        folio.paciente_apellido_paterno || "",
        folio.paciente_apellido_materno || "",
        folio.paciente_nombre || "",
        folio.paciente_genero || "",
        folio.paciente_edad?.toString() || "",
        folio.paciente_nss || "",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: black,
      halign: "center",
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.18 },
      1: { cellWidth: tableWidth * 0.18 },
      2: { cellWidth: tableWidth * 0.24 },
      3: { cellWidth: tableWidth * 0.1 },
      4: { cellWidth: tableWidth * 0.1 },
      5: { cellWidth: tableWidth * 0.2 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ============================================================
  // 5) PRODUCTIVIDAD DE PROCEDIMIENTOS
  // ============================================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Productividad de Procedimientos:", marginLeft, yPos - 1);

  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "N/A";

  autoTable(doc, {
    startY: yPos + 1,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
    head: [
      [
        "No.",
        "Clave del Procedimiento",
        "Tipo de Procedimiento",
        "Procedimiento Quirúrgico",
        "Precio Unitario (Sin IVA)",
        "Importe (Con IVA)",
      ],
    ],
    body: [["1", "N/A", tipoAnestesiaDisplay, folio.cirugia || "N/A", "", ""]],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: black,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: black,
      halign: "center",
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.08 },
      1: { cellWidth: tableWidth * 0.18 },
      2: { cellWidth: tableWidth * 0.22 },
      3: { cellWidth: tableWidth * 0.27 },
      4: { cellWidth: tableWidth * 0.12 },
      5: { cellWidth: tableWidth * 0.13 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ============================================================
  // 6) BIENES DE CONSUMO (catálogo + nombre corto)
  // ============================================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bienes de consumo", marginLeft, yPos - 1);

  const insumosBody = insumos.map((insumo, index) => {
    const nombreCatalogo =
      insumo.nombre_catalogo || insumo.descripcion_larga || insumo.descripcion || insumo.nombre || "";

    const nombreComun =
      insumo.nombre_comun ||
      insumo.nombre_corto ||
      insumo.descripcion_corta ||
      insumo.descripcion_simple ||
      nombreCatalogo;

    return [(index + 1).toString(), nombreCatalogo, nombreComun, `${insumo.cantidad ?? 1} (PIEZA)`];
  });

  autoTable(doc, {
    startY: yPos + 1,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: black,
      halign: "left",
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.08, halign: "center" },
      1: { cellWidth: tableWidth * 0.4 },
      2: { cellWidth: tableWidth * 0.34 },
      3: { cellWidth: tableWidth * 0.18, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ============================================================
  // 7) BLOQUE DE FIRMAS (Médico + Técnico con recuadro)
  // ============================================================

  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth,
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (FIRMA Y MATRÍCULA)", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["", ""]],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      minCellHeight: 25, // altura de recuadro para firmas
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.5 },
      1: { cellWidth: tableWidth * 0.5 },
    },
  });

  // Guardar PDF
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
