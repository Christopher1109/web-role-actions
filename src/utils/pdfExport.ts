import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  // Colores
  const lightGray: [number, number, number] = [230, 230, 230]; // gris para secciones interiores
  const headerBlue: [number, number, number] = [215, 226, 243]; // azul pastel tipo IMSS

  // Parámetros de tabla para alinear todo
  const PAGE_MARGIN_LEFT = 14;
  const PAGE_MARGIN_RIGHT = 14;
  const TABLE_WIDTH = 210 - PAGE_MARGIN_LEFT - PAGE_MARGIN_RIGHT; // ancho total dentro de márgenes
  const columnStylesFiveCols = {
    0: { cellWidth: TABLE_WIDTH / 5 },
    1: { cellWidth: TABLE_WIDTH / 5 },
    2: { cellWidth: TABLE_WIDTH / 5 },
    3: { cellWidth: TABLE_WIDTH / 5 },
    4: { cellWidth: TABLE_WIDTH / 5 },
  } as const;

  // Logo CB Médica en esquina superior izquierda
  doc.addImage(cbMedicaLogo, "JPEG", PAGE_MARGIN_LEFT, 10, 30, 15);

  // ENCABEZADO INSTITUCIONAL
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

  // ==============================
  // SECCIÓN 1: OOAD / Unidad / Contrato / Fecha / Folio
  // ==============================
  autoTable(doc, {
    startY: yPos,
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
            })
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
      tableWidth: TABLE_WIDTH,
      halign: "center",
    },
    margin: { left: PAGE_MARGIN_LEFT, right: PAGE_MARGIN_RIGHT },
    columnStyles: columnStylesFiveCols,
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // ==============================
  // SECCIÓN 2: Quirófano y horarios (MISMAS COLUMNAS Y ANCHOS)
  // ==============================
  autoTable(doc, {
    startY: yPos,
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
          ? new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_fin_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_inicio_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_fin_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: headerBlue,
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
      tableWidth: TABLE_WIDTH,
      halign: "center",
    },
    margin: { left: PAGE_MARGIN_LEFT, right: PAGE_MARGIN_RIGHT },
    columnStyles: columnStylesFiveCols,
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // ==============================
  // SECCIÓN 3: Proveedor y datos de procedimiento
  // (NO SE MODIFICA LA ESTRUCTURA QUE YA TENÍAS)
  // ==============================
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  doc.text("Proveedor: CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.", PAGE_MARGIN_LEFT, yPos);
  yPos += 5;

  doc.text(`Procedimiento Quirúrgico: ${folio.cirugia || "N/A"}`, PAGE_MARGIN_LEFT, yPos);
  yPos += 5;

  doc.text(`Especialidad Quirúrgica: ${folio.especialidad_quirurgica || "N/A"}`, PAGE_MARGIN_LEFT, yPos);
  yPos += 5;

  doc.text(`Tipo de Cirugía: ${folio.tipo_cirugia || "N/A"}`, PAGE_MARGIN_LEFT, yPos);
  yPos += 5;

  doc.text(`Evento: ${folio.tipo_evento || "N/A"}`, PAGE_MARGIN_LEFT, yPos);
  yPos += 5;

  doc.text(`Nombre del Cirujano: ${folio.cirujano_nombre || "N/A"}`, PAGE_MARGIN_LEFT, yPos);
  yPos += 5;

  doc.text(`Nombre del Anestesiólogo: ${folio.anestesiologo_nombre || "N/A"}`, PAGE_MARGIN_LEFT, yPos);
  yPos += 8;

  // ==============================
  // SECCIÓN 4: DATOS DEL PACIENTE
  // (SE DEJA COMO LO TENÍAS)
  // ==============================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", PAGE_MARGIN_LEFT, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    body: [
      ["Apellido paterno:", folio.paciente_apellido_paterno || "N/A"],
      ["Apellido materno:", folio.paciente_apellido_materno || "N/A"],
      ["Nombre(s):", folio.paciente_nombre || "N/A"],
      ["Género:", folio.paciente_genero || "N/A"],
      ["Edad:", folio.paciente_edad?.toString() || "N/A"],
      ["NSS:", folio.paciente_nss || "N/A"],
    ],
    theme: "grid",
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: 150 },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      tableWidth: TABLE_WIDTH,
    },
    margin: { left: PAGE_MARGIN_LEFT, right: PAGE_MARGIN_RIGHT },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ==============================
  // SECCIÓN 5: Productividad de Procedimientos
  // ==============================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", PAGE_MARGIN_LEFT, yPos);
  yPos += 2;

  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "N/A";

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        "No.",
        "Clave del Procedimiento",
        "Tipo de Procedimiento",
        "Procedimiento Quirúrgico",
        "Precio Unitario (Con IVA)",
        "Importe (Sin IVA)",
      ],
    ],
    body: [["1", "N/A", tipoAnestesiaDisplay, folio.cirugia || "N/A", "", ""]],
    theme: "grid",
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
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: 45 },
      3: { cellWidth: 50 },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      tableWidth: TABLE_WIDTH,
    },
    margin: { left: PAGE_MARGIN_LEFT, right: PAGE_MARGIN_RIGHT },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ==============================
  // SECCIÓN 6: Bienes de consumo
  // ==============================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de consumo", PAGE_MARGIN_LEFT, yPos);
  yPos += 2;

  const insumosBody = insumos.map((insumo, index) => [
    (index + 1).toString(),
    // Aquí podrías mapear a un nombre más corto si agregas un campo tipo "nombre_corto"
    insumo.descripcion_corta || insumo.descripcion || insumo.nombre || "N/A",
    `${insumo.cantidad} (PIEZA)`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["No.", "Descripción", "Cantidad"]],
    body: insumosBody,
    theme: "grid",
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
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: TABLE_WIDTH - 40 },
      2: { cellWidth: 25, halign: "center" },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
      tableWidth: TABLE_WIDTH,
    },
    margin: { left: PAGE_MARGIN_LEFT, right: PAGE_MARGIN_RIGHT },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==============================
  // SECCIÓN FINAL: FIRMAS
  // ==============================
  if (yPos > 250) {
    doc.addPage();
    yPos = 40;
  }

  const firmaTableWidth = TABLE_WIDTH;
  autoTable(doc, {
    startY: yPos,
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (FIRMA Y MATRÍCULA)", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["", ""]],
    theme: "grid",
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 20,
    },
    columnStyles: {
      0: { cellWidth: firmaTableWidth / 2 },
      1: { cellWidth: firmaTableWidth / 2 },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      tableWidth: firmaTableWidth,
    },
    margin: { left: PAGE_MARGIN_LEFT, right: PAGE_MARGIN_RIGHT },
  });

  // Guardar PDF
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
