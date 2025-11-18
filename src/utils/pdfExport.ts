import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  const marginLeft = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - marginLeft * 2;

  const headerBlue: [number, number, number] = [210, 222, 239];
  const lightGray: [number, number, number] = [230, 230, 230];

  // Logo CB Médica en esquina superior izquierda
  doc.addImage(cbMedicaLogo, "JPEG", marginLeft, 10, 30, 15);

  // ENCABEZADO INSTITUCIONAL
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INSTITUTO MEXICANO DEL SEGURO SOCIAL", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("SEGURIDAD Y SOLIDARIDAD SOCIAL", pageWidth / 2, 21, { align: "center" });

  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', pageWidth / 2, 34, {
    align: "center",
  });

  let yPos = 42;

  /************************************************************
   * BLOQUE 1: OOAD/UMAE + HORARIOS (IGUAL QUE PLANTILLA)
   ************************************************************/
  autoTable(doc, {
    startY: yPos,
    startX: marginLeft,
    tableWidth,
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "N/A",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        folio.fecha ? new Date(folio.fecha).toLocaleDateString("es-MX") : "N/A",
        folio.numero_folio || "N/A",
      ],
      [
        "Número de Quirófano",
        "Hora de Inicio del Procedimiento Quirúrgico",
        "Hora de la finalización del Procedimiento Quirúrgico",
        "Hora de inicio de la Anestesia",
        "Hora de finalización de la Anestesia",
      ],
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
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 7,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    didParseCell: (data) => {
      const { section, row, column, cell } = data;

      // Encabezado superior (OOAD/UMAE...)
      if (section === "head") {
        cell.styles.fillColor = headerBlue;
        cell.styles.fontStyle = "bold";
        cell.styles.halign = "center";
      }

      // Fila 1 (valores) – sin color de fondo
      if (section === "body" && row.index === 0) {
        cell.styles.halign = "center";
      }

      // Fila 2: labels de horarios (azul pastel, negritas)
      if (section === "body" && row.index === 1) {
        cell.styles.fillColor = headerBlue;
        cell.styles.fontStyle = "bold";
        cell.styles.halign = "center";
      }

      // Fila 3: valores de horarios
      if (section === "body" && row.index === 2) {
        cell.styles.halign = "center";
      }
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.18 },
      1: { cellWidth: tableWidth * 0.24 },
      2: { cellWidth: tableWidth * 0.18 },
      3: { cellWidth: tableWidth * 0.2 },
      4: { cellWidth: tableWidth * 0.2 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  /************************************************************
   * BLOQUE 2: PROVEEDOR / PROCEDIMIENTO
   * (filas una debajo de otra, títulos azules)
   ************************************************************/
  const proveedorRows: RowInput[] = [
    ["Proveedor:", "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.", "", ""],
    [
      "Procedimiento Quirúrgico:",
      folio.cirugia || "N/A",
      "Especialidad Quirúrgica:",
      folio.especialidad_quirurgica || "N/A",
    ],
    ["Tipo de Cirugía:", folio.tipo_cirugia || "N/A", "Evento:", folio.tipo_evento || "N/A"],
    [
      "Nombre del Cirujano:",
      folio.cirujano_nombre || "N/A",
      "Nombre del Anestesiólogo:",
      folio.anestesiologo_nombre || "N/A",
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    startX: marginLeft,
    tableWidth,
    body: proveedorRows,
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.2 },
      1: { cellWidth: tableWidth * 0.3 },
      2: { cellWidth: tableWidth * 0.2 },
      3: { cellWidth: tableWidth * 0.3 },
    },
    didParseCell: (data) => {
      const { section, column, cell } = data;
      if (section === "body" && (column.index === 0 || column.index === 2)) {
        cell.styles.fillColor = headerBlue;
        cell.styles.fontStyle = "bold";
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  /************************************************************
   * BLOQUE 3: DATOS DEL PACIENTE
   ************************************************************/
  const datosPacienteBody: RowInput[] = [
    [
      {
        content: "DATOS DEL PACIENTE",
        colSpan: 6,
        styles: {
          fillColor: headerBlue,
          fontStyle: "bold",
          halign: "center",
        },
      },
    ],
    [
      { content: "Apellido paterno:", styles: { fillColor: headerBlue, fontStyle: "bold" } },
      { content: "Apellido materno:", styles: { fillColor: headerBlue, fontStyle: "bold" } },
      { content: "Nombre(s):", styles: { fillColor: headerBlue, fontStyle: "bold" } },
      { content: "Género:", styles: { fillColor: headerBlue, fontStyle: "bold" } },
      { content: "Edad:", styles: { fillColor: headerBlue, fontStyle: "bold" } },
      { content: "NSS:", styles: { fillColor: headerBlue, fontStyle: "bold" } },
    ],
    [
      folio.paciente_apellido_paterno || "N/A",
      folio.paciente_apellido_materno || "N/A",
      folio.paciente_nombre || "N/A",
      folio.paciente_genero || "N/A",
      folio.paciente_edad?.toString() || "N/A",
      folio.paciente_nss || "N/A",
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    startX: marginLeft,
    tableWidth,
    body: datosPacienteBody,
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.19 },
      1: { cellWidth: tableWidth * 0.19 },
      2: { cellWidth: tableWidth * 0.19 },
      3: { cellWidth: tableWidth * 0.14 },
      4: { cellWidth: tableWidth * 0.1 },
      5: { cellWidth: tableWidth * 0.19 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  /************************************************************
   * BLOQUE 4: PRODUCTIVIDAD DE PROCEDIMIENTOS
   ************************************************************/
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", marginLeft, yPos);
  yPos += 2;

  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "N/A";

  autoTable(doc, {
    startY: yPos,
    startX: marginLeft,
    tableWidth,
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
      fontSize: 7,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.06, halign: "center" },
      1: { cellWidth: tableWidth * 0.2 },
      2: { cellWidth: tableWidth * 0.2 },
      3: { cellWidth: tableWidth * 0.26 },
      4: { cellWidth: tableWidth * 0.14, halign: "right" },
      5: { cellWidth: tableWidth * 0.14, halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  /************************************************************
   * BLOQUE 5: BIENES DE CONSUMO
   ************************************************************/
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de consumo", marginLeft, yPos);
  yPos += 2;

  const insumosBody: RowInput[] = insumos.map((insumo, index) => {
    const catalogName = insumo.nombre_catalogo || insumo.nombre || insumo.descripcion || "N/A";

    const commonName = insumo.nombre_comun || insumo.descripcion_corta || insumo.descripcion || insumo.nombre || "N/A";

    return [(index + 1).toString(), catalogName, commonName, `${insumo.cantidad ?? 1} (PIEZA)`];
  });

  autoTable(doc, {
    startY: yPos,
    startX: marginLeft,
    tableWidth,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      fontSize: 7,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.06, halign: "center" },
      1: { cellWidth: tableWidth * 0.44 },
      2: { cellWidth: tableWidth * 0.3 },
      3: { cellWidth: tableWidth * 0.2, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  /************************************************************
   * BLOQUE 6: FIRMAS (MÉDICO / TÉCNICO)
   ************************************************************/
  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  const firmasBody: RowInput[] = [
    [
      {
        content: "MÉDICO QUE REALIZÓ EL PROCEDIMIENTO\n(FIRMA Y MATRÍCULA)",
        styles: {
          fillColor: headerBlue,
          fontStyle: "bold",
          halign: "center",
        },
      },
      {
        content: "TÉCNICO\n(NOMBRE Y FIRMA)",
        styles: {
          fillColor: headerBlue,
          fontStyle: "bold",
          halign: "center",
        },
      },
    ],
    ["", ""],
  ];

  autoTable(doc, {
    startY: yPos,
    startX: marginLeft,
    tableWidth,
    body: firmasBody,
    theme: "grid",
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 6,
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: tableWidth / 2 },
      1: { cellWidth: tableWidth / 2 },
    },
  });

  // Guardar PDF
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
