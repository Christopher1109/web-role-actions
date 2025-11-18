import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();
  
  // Colores exactos del formato T33
  const headerColor: [number, number, number] = [40, 116, 166]; // Azul IMSS
  const sectionHeaderColor: [number, number, number] = [52, 73, 94]; // Gris oscuro para headers de sección
  
  // HEADER PRINCIPAL - Fondo azul
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Textos del header en blanco
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTITUTO MEXICANO DEL SEGURO SOCIAL', 105, 12, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text('SEGURIDAD Y SOLIDARIDAD SOCIAL', 105, 19, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', 105, 28, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Anexo T 33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', 105, 36, { align: 'center' });
  
  // Restablecer color de texto a negro
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 48;
  
  // Labels para mapeo
  const tipoCirugiaLabels: Record<string, string> = {
    abierta: 'Abierta',
    minima_invasion: 'Mínima Invasión',
  };

  const tipoEventoLabels: Record<string, string> = {
    programado: 'Programado',
    urgencia: 'Urgencia',
  };

  const generoLabels: Record<string, string> = {
    M: 'Masculino',
    F: 'Femenino',
    Otro: 'Otro',
  };
  
  // TABLA 1: Unidad Médica, Folio y Fecha
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        { content: 'Unidad Médica:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.hospital_display_name || '', styles: { cellWidth: 60 } },
        { content: 'No. de folio:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.numero_folio, styles: { cellWidth: 35 } },
        { content: 'Fecha:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: new Date(folio.created_at || folio.fecha).toLocaleDateString('es-MX'), styles: { cellWidth: 30 } }
      ]
    ],
    theme: 'grid',
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { cellWidth: 20 },
      5: { cellWidth: 30 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 2;
  
  // TABLA 2: Horarios
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        { content: 'Hora Inicio Procedimiento', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.hora_inicio_procedimiento || '' },
        { content: 'Hora Fin Procedimiento', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.hora_fin_procedimiento || '' }
      ],
      [
        { content: 'Hora Inicio Anestesia', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.hora_inicio_anestesia || '' },
        { content: 'Hora Fin Anestesia', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.hora_fin_anestesia || '' }
      ],
      [
        { content: 'Número de Quirófano', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.numero_quirofano || '', colSpan: 3 }
      ]
    ],
    theme: 'grid',
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 45 },
      2: { cellWidth: 50 },
      3: { cellWidth: 45 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 2;
  
  // TABLA 3: Procedimiento y Tipo
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        { content: 'Procedimiento Quirúrgico:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.cirugia || '', colSpan: 2 },
        { content: 'Especialidad:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.especialidad_quirurgica || '' }
      ],
      [
        { content: 'Tipo de Cirugía:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: tipoCirugiaLabels[folio.tipo_cirugia] || folio.tipo_cirugia || '' },
        { content: 'Tipo de Anestesia:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia || '', colSpan: 2 }
      ],
      [
        { content: 'Evento:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: tipoEventoLabels[folio.tipo_evento] || folio.tipo_evento || '', colSpan: 4 }
      ]
    ],
    theme: 'grid',
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 6;
  
  // SECCIÓN: DATOS DEL PACIENTE - Header oscuro
  doc.setFillColor(sectionHeaderColor[0], sectionHeaderColor[1], sectionHeaderColor[2]);
  doc.rect(15, yPos, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PACIENTE', 105, yPos + 5.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  yPos += 10;
  
  // TABLA 4: Datos del Paciente
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        { content: 'Apellido Paterno:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.paciente_apellido_paterno || '' },
        { content: 'Apellido Materno:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.paciente_apellido_materno || '' }
      ],
      [
        { content: 'Nombre(s):', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.paciente_nombre || '' },
        { content: 'NSS:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.paciente_nss || '' }
      ],
      [
        { content: 'Género:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: generoLabels[folio.paciente_genero] || folio.paciente_genero || '' },
        { content: 'Edad:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: folio.paciente_edad ? `${folio.paciente_edad} años` : '' }
      ]
    ],
    theme: 'grid',
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 60 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 8;
  
  // SECCIÓN: MÉDICO QUE REALIZÓ EL PROCEDIMIENTO
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('MÉDICO QUE REALIZÓ EL PROCEDIMIENTO', 105, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Línea para firma
  doc.setLineWidth(0.5);
  doc.line(60, yPos, 150, yPos);
  
  yPos += 5;
  
  // Texto (NOMBRE Y FIRMA)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('(NOMBRE Y FIRMA)', 105, yPos, { align: 'center' });
  
  // Si hay insumos, agregar tabla en nueva página
  if (insumos && insumos.length > 0) {
    doc.addPage();
    
    // Header de nueva página
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INSUMOS UTILIZADOS', 105, 16, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Tabla de insumos
    autoTable(doc, {
      startY: 32,
      head: [['Insumo', 'Clave', 'Lote', 'Cantidad']],
      body: insumos.map((insumo: any) => [
        insumo.nombre,
        insumo.clave || 'N/A',
        insumo.lote || 'N/A',
        insumo.cantidad.toString()
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { 
        fillColor: headerColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    });
  }
  
  // Guardar PDF
  doc.save(`Folio_${folio.numero_folio}.pdf`);
};
