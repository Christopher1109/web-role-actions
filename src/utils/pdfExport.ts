import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF("p", "mm", "letter"); // tamaño carta como el T33
  const lightGray: [number, number, number] = [230, 230, 230];

  // ========== ENCABEZADO ==========
  doc.addImage(cbMedicaLogo, "JPEG", 14, 10, 30, 15);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
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

  // ========== 1. CUADRO OOAD / UNIDAD / CONTRATO / FECHA / FOLIO ==========
  autoTable(doc, {
    startY: yPos,
    head: [["OOAD/UMAE:", "Unidad Médica:", "No. de contrato:", "Fecha:", "No. de folio:"]],
    body: [
      [
        folio.state_name || "NUEVO LEÓN",
        folio.hospital_display_name || "N/A",
        folio.hospital_budget_code || "N/A",
        folio.fecha && folio.created_at
          ? new Date(`${folio.fecha}T${new Date(folio.created_at).toTimeString().slice(0, 8)}`).toLocaleString(
              "es-MX",
              {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              },
            )
          : "N/A",
        folio.numero_folio || "N/A",
      ],
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
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { cellWidth: 40 },
      4: { cellWidth: 35 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // ========== 2. CUADRO HORARIOS Y QUIRÓFANO ==========
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
      0: { cellWidth: 20 },
      1: { cellWidth: 46 },
      2: { cellWidth: 46 },
      3: { cellWidth: 44 },
      4: { cellWidth: 44 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // ========== 3. CUADRO PROVEEDOR / PROCEDIMIENTO (en recuadros) ==========
  autoTable(doc, {
    startY: yPos,
    body: [
      ["Proveedor:", "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V."],
      ["Procedimiento Quirúrgico:", folio.cirugia || "N/A"],
      ["Especialidad Quirúrgica:", folio.especialidad_quirurgica || "N/A"],
      ["Tipo de Cirugía:", (folio.tipo_cirugia || "N/A").toUpperCase()],
      ["Evento:", (folio.tipo_evento || "N/A").toUpperCase()],
      ["Nombre del Cirujano:", folio.cirujano_nombre || "N/A"],
      ["Nombre del Anestesiólogo:", folio.anestesiologo_nombre || "N/A"],
    ],
    theme: "grid",
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
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 150 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // ========== 4. DATOS DEL PACIENTE (tabla 6 columnas) ==========
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", 14, yPos - 1);

  autoTable(doc, {
    startY: yPos + 1,
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
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 40 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ========== 5. PRODUCTIVIDAD DE PROCEDIMIENTOS ==========
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", 14, yPos - 1);

  const tipoAnestesiaDisplay =
    folio.tipo_anestesia && (tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia);

  autoTable(doc, {
    startY: yPos + 1,
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
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 30 },
      2: { cellWidth: 45 },
      3: { cellWidth: 55 },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ========== 6. BIENES DE CONSUMO ==========
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de Consumo", 14, yPos - 1);

  const insumosBody =
    insumos && insumos.length > 0
      ? insumos.map((insumo, index) => [
          (index + 1).toString(),
          insumo.clave || "",
          insumo.descripcion || insumo.nombre || "N/A",
          `${insumo.cantidad} (PIEZA)`,
        ])
      : [];

  autoTable(doc, {
    startY: yPos + 1,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
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
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 30 },
      2: { cellWidth: 105 },
      3: { cellWidth: 25, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ========== 7. FIRMA ==========
  if (yPos > 250) {
    doc.addPage();
    yPos = 30;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (NOMBRE Y FIRMA)", 14, yPos);
  yPos += 8;
  doc.line(14, yPos, 100, yPos);
  yPos += 4;
  doc.text("(FIRMA Y MATRÍCULA)", 14, yPos);

  doc.save(`Folio_T33_${folio.numero_folio || "sin_folio"}.pdf`);
};
