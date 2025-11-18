import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  // Colores del formato T33 IMSS
  const lightGray: [number, number, number] = [230, 230, 230];

  // Márgenes fijos para que todo quede alineado
  const marginLeft = 14;
  const marginRight = 14;

  // Anchos de columna CONSISTENTES para las primeras 2 tablas (5 columnas)
  // Ajusta estos números si quieres afinar, pero mantenlos IGUALES en ambas tablas
  const headerColumnStyles = {
    0: { cellWidth: 38 }, // OOAD/UMAE
    1: { cellWidth: 58 }, // Unidad Médica
    2: { cellWidth: 34 }, // No. de contrato
    3: { cellWidth: 34 }, // Fecha
    4: { cellWidth: 34 }, // No. de folio
  };

  // Logo CB Médica en esquina superior izquierda
  doc.addImage(cbMedicaLogo, "JPEG", marginLeft, 10, 30, 15);

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

  /******************************************************************
   * SECCIÓN 1: IDENTIFICACIÓN + SECCIÓN 2: QUIRÓFANO Y HORARIOS
   *  -> 4 filas, 5 columnas, TODAS ALINEADAS
   ******************************************************************/

  const fechaCompleta =
    folio.fecha && folio.created_at
      ? new Date(folio.fecha + "T" + new Date(folio.created_at).toTimeString().slice(0, 8)).toLocaleString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "N/A";

  const horaInicioProc =
    folio.hora_inicio_procedimiento && folio.fecha
      ? new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toLocaleString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "N/A";

  const horaFinProc =
    folio.hora_fin_procedimiento && folio.fecha
      ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "N/A";

  const horaInicioAnestesia =
    folio.hora_inicio_anestesia && folio.fecha
      ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "N/A";

  const horaFinAnestesia =
    folio.hora_fin_anestesia && folio.fecha
      ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleString("es-MX", {
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
    margin: { left: marginLeft, right: marginRight },
    // 4 filas, 5 columnas, TODAS con los mismos anchos
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "N/A",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        fechaCompleta,
        folio.numero_folio || "N/A",
      ],
      [
        "Número de Quirófano",
        "Hora de Inicio del Procedimiento Quirúrgico",
        "Hora de la finalización del Procedimiento Quirúrgico",
        "Hora de inicio de la Anestesia",
        "Hora de finalización de la Anestesia",
      ],
      [folio.numero_quirofano || "N/A", horaInicioProc, horaFinProc, horaInicioAnestesia, horaFinAnestesia],
    ],
    theme: "grid",
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
      halign: "center",
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: headerColumnStyles,
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  /******************************************************************
   * A PARTIR DE AQUÍ TODO SIGUE IGUAL QUE TU VERSIÓN ANTERIOR
   * (proveedor, paciente, bienes de consumo, etc.)
   ******************************************************************/

  // SECCIÓN 3: Datos del proveedor y procedimiento
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  doc.text("Proveedor: CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.", marginLeft, yPos);
  yPos += 5;

  doc.text(`Procedimiento Quirúrgico: ${folio.cirugia || "N/A"}`, marginLeft, yPos);
  yPos += 5;

  doc.text(`Especialidad Quirúrgica: ${folio.especialidad_quirurgica || "N/A"}`, marginLeft, yPos);
  yPos += 5;

  doc.text(`Tipo de Cirugía: ${folio.tipo_cirugia || "N/A"}`, marginLeft, yPos);
  yPos += 5;

  doc.text(`Evento: ${folio.tipo_evento || "N/A"}`, marginLeft, yPos);
  yPos += 5;

  doc.text(`Nombre del Cirujano: ${folio.cirujano_nombre || "N/A"}`, marginLeft, yPos);
  yPos += 5;

  doc.text(`Nombre del Anestesiólogo: ${folio.anestesiologo_nombre || "N/A"}`, marginLeft, yPos);
  yPos += 8;

  // SECCIÓN 4: DATOS DEL PACIENTE
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", marginLeft, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginRight },
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
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // SECCIÓN 5: Productividad de Procedimientos
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", marginLeft, yPos);
  yPos += 2;

  const tipoAnestesiaDisplay = folio.tipo_anestesia
    ? tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
    : "N/A";

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginRight },
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
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // SECCIÓN 6: Bienes de consumo
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de consumo", marginLeft, yPos);
  yPos += 2;

  const insumosBody = insumos.map((insumo, index) => [
    (index + 1).toString(),
    insumo.descripcion_corta || insumo.descripcion || insumo.nombre || "N/A",
    `${insumo.cantidad} (PIEZA)`,
  ]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: marginLeft, right: marginRight },
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
      1: { cellWidth: 145 },
      2: { cellWidth: 25, halign: "center" },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // SECCIÓN FINAL: Firma (puedes luego convertir esto en tabla para el recuadro completo)
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (NOMBRE Y FIRMA)", marginLeft, yPos);
  yPos += 10;
  doc.line(marginLeft, yPos, 100, yPos);
  yPos += 4;
  doc.text("(FIRMA Y MATRÍCULA)", marginLeft, yPos);

  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
