import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cbMedicaLogo from "@/assets/cb-medica-logo.jpg";

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();

  // Parámetros generales de página
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2;

  // Colores del formato T33 IMSS (azul/gris pastel)
  const headerFill: [number, number, number] = [215, 226, 241]; // parecido a la plantilla
  const lightGray: [number, number, number] = [230, 230, 230];

  // ====== LOGO + ENCABEZADO INSTITUCIONAL ======
  doc.addImage(cbMedicaLogo, "JPEG", marginX, 10, 30, 15);

  const centerX = pageWidth / 2;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INSTITUTO MEXICANO DEL SEGURO SOCIAL", centerX, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("SEGURIDAD Y SOLIDARIDAD SOCIAL", centerX, 21, { align: "center" });

  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', centerX, 28, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', centerX, 34, {
    align: "center",
  });

  let yPos = 42;

  // ====== SECCIÓN 1: OOAD / Unidad / Contrato / Fecha / Folio ======
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
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    headStyles: {
      fillColor: headerFill,
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

  // ====== SECCIÓN 2: Horarios y Quirófano ======
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
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_fin_procedimiento && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_inicio_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
        folio.hora_fin_anestesia && folio.fecha
          ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "N/A",
      ],
    ],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    headStyles: {
      fillColor: headerFill,
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

  // ====== SECCIÓN 3: PROVEEDOR / PROCEDIMIENTO / TIPO / EVENTO / MÉDICOS ======
  // Aquí TODO va en dos columnas, un renglón debajo de otro, izquierda sombreada
  const proveedorTableBody = [
    ["Proveedor:", "CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V."],
    ["Procedimiento Quirúrgico:", folio.cirugia || "N/A"],
    ["Especialidad Quirúrgica:", folio.especialidad_quirurgica || "N/A"],
    ["Tipo de Cirugía:", folio.tipo_cirugia || "N/A"],
    ["Evento:", folio.tipo_evento || "N/A"],
    ["Nombre del Cirujano:", folio.cirujano_nombre || "N/A"],
    ["Nombre del Anestesiólogo:", folio.anestesiologo_nombre || "N/A"],
  ];

  autoTable(doc, {
    startY: yPos,
    body: proveedorTableBody,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: {
        cellWidth: 55,
        fontStyle: "bold",
        fillColor: headerFill,
      },
      1: {
        cellWidth: usableWidth - 55,
      },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // ====== SECCIÓN 4: DATOS DEL PACIENTE (igual al T33: encabezado + fila de datos) ======
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", marginX, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
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
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    headStyles: {
      fillColor: headerFill,
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
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ====== SECCIÓN 5: PRODUCTIVIDAD DE PROCEDIMIENTOS ======
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Productividad de Procedimientos:", marginX, yPos);
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
        "Precio Unitario (Sin IVA)",
        "Importe (Con IVA)",
      ],
    ],
    body: [["1", "N/A", tipoAnestesiaDisplay, folio.cirugia || "N/A", "", ""]],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    headStyles: {
      fillColor: headerFill,
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
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: 45 },
      3: { cellWidth: 60 },
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

  // ====== SECCIÓN 6: BIENES DE CONSUMO ======
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Bienes de Consumo:", marginX, yPos);
  yPos += 2;

  const insumosBody = insumos.map((insumo, index) => {
    // nombre largo (catálogo) y nombre corto/común si existe
    const nombreCatalogo = insumo.nombre_catalogo || insumo.nombre_largo || insumo.nombre || "N/A";

    const nombreCorto =
      insumo.nombre_comun || insumo.descripcion_corta || insumo.nombre_corto || insumo.descripcion || nombreCatalogo;

    return [(index + 1).toString(), nombreCatalogo, nombreCorto, `${insumo.cantidad} (PIEZA)`];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["No.", "Bienes de consumo", "Descripción", "Cantidad"]],
    body: insumosBody,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    headStyles: {
      fillColor: headerFill,
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
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 80 },
      2: { cellWidth: 60 },
      3: { cellWidth: 25, halign: "center" },
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ====== SECCIÓN FINAL: FIRMAS (Médico y Técnico, con recuadros) ======
  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }

  autoTable(doc, {
    startY: yPos,
    head: [["MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (FIRMA Y MATRÍCULA)", "TÉCNICO (NOMBRE Y FIRMA)"]],
    body: [["", ""]],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    headStyles: {
      fillColor: headerFill,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      minCellHeight: 25,
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2,
    },
  });

  // Guardar PDF
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
