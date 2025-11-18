import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  // Colores IMSS
  const lightGray: [number, number, number] = [230, 230, 230];
  const black: [number, number, number] = [0, 0, 0];

  // Márgenes unificados para TODAS las tablas
  const tableMargin = { top: 0, right: 14, bottom: 0, left: 14 };

  // Logo CB Médica
  doc.addImage(cbMedicaLogo, "JPEG", 14, 10, 30, 15);

  // ENCABEZADO
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
  // SECCIÓN 1: OOAD / Unidad / Contrato / Fecha / Folio
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
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
    headStyles: {
      fillColor: lightGray,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: black,
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 32 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 1;

  // =========================
  // SECCIÓN 2: Horarios y quirófano
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
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
    headStyles: {
      fillColor: lightGray,
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
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // =========================
  // SECCIÓN 3: Proveedor y procedimiento (en tabla con bordes)
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
    body: [
      ["Proveedor:", "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V."],
      ["Procedimiento Quirúrgico:", folio.cirugia || "N/A"],
      ["Especialidad Quirúrgica:", folio.especialidad_quirurgica || "N/A"],
      ["Tipo de Cirugía:", folio.tipo_cirugia || "N/A"],
      ["Evento:", folio.tipo_evento || "N/A"],
      ["Nombre del Cirujano:", folio.cirujano_nombre || "N/A"],
      ["Nombre del Anestesiólogo:", folio.anestesiologo_nombre || "N/A"],
    ],
    theme: "grid",
    bodyStyles: {
      fontSize: 8,
      textColor: black,
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: 0 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // SECCIÓN 4: Datos del paciente
  // =========================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", 14, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
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
      fillColor: lightGray,
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
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 45 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { cellWidth: 30 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // SECCIÓN 5: Productividad de procedimientos
  // =========================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", 14, yPos);
  yPos += 2;

  const tipoAnestesiaDisplay =
    folio.tipo_anestesia && (tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia);

  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
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
    body: [["1", folio.clave_procedimiento || "N/A", tipoAnestesiaDisplay || "N/A", folio.cirugia || "N/A", "", ""]],
    theme: "grid",
    headStyles: {
      fillColor: lightGray,
      textColor: black,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: black,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: 45 },
      3: { cellWidth: 60 },
      4: { cellWidth: 21, halign: "right" },
      5: { cellWidth: 21, halign: "right" },
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // =========================
  // SECCIÓN 6: Bienes de consumo
  // =========================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de Consumo:", 14, yPos);
  yPos += 2;

  // Para cada insumo:
  // - "Bienes de consumo" = nombre de catálogo / técnico
  // - "Descripción" = nombre corto / comercial / común si existe
  const insumosBody = insumos.map((insumo, index) => {
    const catalogName = insumo.nombre_catalogo || insumo.nombre || insumo.descripcion || "N/A";

    const shortName =
      insumo.nombre_corto ||
      insumo.descripcion_corta ||
      insumo.nombre_comun ||
      insumo.descripcion ||
      insumo.nombre ||
      "N/A";

    return [(index + 1).toString(), catalogName, shortName, `${insumo.cantidad} (PIEZA)`];
  });

  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
    theme: "grid",
    headStyles: {
      fillColor: lightGray,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: black,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 70 },
      3: { cellWidth: 25, halign: "center" },
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // =========================
  // SECCIÓN FINAL: Firmas (tabla con recuadro y 2 columnas)
  // =========================
  autoTable(doc, {
    startY: yPos,
    margin: tableMargin,
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (FIRMA Y MATRÍCULA)", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["", ""]],
    theme: "grid",
    headStyles: {
      fillColor: lightGray,
      textColor: black,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: black,
      minCellHeight: 20,
    },
    columnStyles: {
      0: { cellWidth: 91 },
      1: { cellWidth: 91 },
    },
    styles: {
      lineColor: black,
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  // Guardar PDF
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
