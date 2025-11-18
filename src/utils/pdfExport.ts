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

  // Logo
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
    'Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"',
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
        folio.state_name || "N/A",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        folio.fecha
          ? new Date(
              folio.fecha +
                "T" +
                (folio.created_at ? new Date(folio.created_at).toTimeString().slice(0, 8) : "00:00:00"),
            ).toLocaleString("es-MX", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.numero_folio || "N/A",
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
    columnStyles: {
      0: { cellWidth: contentWidth * 0.18 },
      1: { cellWidth: contentWidth * 0.24 },
      2: { cellWidth: contentWidth * 0.18 },
      3: { cellWidth: contentWidth * 0.2 },
      4: { cellWidth: contentWidth * 0.2 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 1;

  // =========================
  // 2) Horarios y Quirófano
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
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
          ? new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toLocaleString("es-MX", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_fin_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleString("es-MX", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_inicio_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleString("es-MX", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_fin_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleString("es-MX", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
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
    columnStyles: {
      0: { cellWidth: contentWidth * 0.12 },
      1: { cellWidth: contentWidth * 0.22 },
      2: { cellWidth: contentWidth * 0.22 },
      3: { cellWidth: contentWidth * 0.22 },
      4: { cellWidth: contentWidth * 0.22 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // 3) Proveedor / Procedimiento / Especialidad / Tipo / Evento / Nombres
  // =========================
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const drawFullWidthLabelValue = (label: string, value: string) => {
    autoTable(doc, {
      startY: yPos,
      margin: { left: pageMarginLeft, right: pageMarginRight },
      theme: "grid",
      tableWidth: contentWidth,
      head: [[`${label}`]],
      body: [[value || "N/A"]],
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
      columnStyles: {
        0: { cellWidth: contentWidth },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY;
  };

  drawFullWidthLabelValue("Proveedor:", "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.");
  drawFullWidthLabelValue("Procedimiento Quirúrgico:", folio.cirugia || "N/A");
  drawFullWidthLabelValue("Especialidad Quirúrgica:", folio.especialidad_quirurgica || "N/A");
  drawFullWidthLabelValue("Tipo de Cirugía:", folio.tipo_cirugia || "N/A");
  drawFullWidthLabelValue("Evento:", folio.tipo_evento || "N/A");
  drawFullWidthLabelValue("Nombre del Cirujano:", folio.cirujano_nombre || "N/A");
  drawFullWidthLabelValue("Nombre del Anestesiólogo:", folio.anestesiologo_nombre || "N/A");

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // 4) Datos del paciente (barra gris + fila)
  // =========================

  // Barra "DATOS DEL PACIENTE"
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
      halign: "left",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // Fila con 6 columnas
  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    theme: "grid",
    tableWidth: contentWidth,
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
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.2 },
      1: { cellWidth: contentWidth * 0.2 },
      2: { cellWidth: contentWidth * 0.22 },
      3: { cellWidth: contentWidth * 0.13 },
      4: { cellWidth: contentWidth * 0.1 },
      5: { cellWidth: contentWidth * 0.15 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // 5) Productividad de Procedimientos
  // =========================
  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "N/A";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Productividad de Procedimientos:", pageMarginLeft, yPos - 1);

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    theme: "grid",
    tableWidth: contentWidth,
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
      1: { cellWidth: contentWidth * 0.16 },
      2: { cellWidth: contentWidth * 0.22 },
      3: { cellWidth: contentWidth * 0.26 },
      4: { cellWidth: contentWidth * 0.15, halign: "right" },
      5: { cellWidth: contentWidth * 0.15, halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // 6) Bienes de consumo
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bienes de Consumo:", pageMarginLeft, yPos - 1);

  const insumosBody = insumos.map((insumo, index) => {
    const nombreCatalogo = insumo.descripcion || insumo.nombre || "N/A";

    const nombreCorto =
      insumo.nombre_comun ||
      insumo.nombre_corto ||
      insumo.descripcion_corta ||
      insumo.nombre_simple ||
      insumo.nombre_abreviado ||
      nombreCatalogo;

    return [(index + 1).toString(), nombreCatalogo, nombreCorto, `${insumo.cantidad} (PIEZA)`];
  });

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    theme: "grid",
    tableWidth: contentWidth,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
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
      0: { cellWidth: contentWidth * 0.06, halign: "center" },
      1: { cellWidth: contentWidth * 0.42 },
      2: { cellWidth: contentWidth * 0.32 },
      3: { cellWidth: contentWidth * 0.2, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // =========================
  // 7) Cuadro de firmas (Médico / Técnico)
  // =========================
  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: pageMarginLeft, right: pageMarginRight },
    theme: "grid",
    tableWidth: contentWidth,
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (FIRMA Y MATRÍCULA)", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["", ""]],
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
