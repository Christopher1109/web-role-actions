import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();
  
  // Configuración de colores
  const primaryColor: [number, number, number] = [41, 128, 185];
  const secondaryColor: [number, number, number] = [52, 73, 94];
  
  // Encabezado
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTITUTO MEXICANO DEL SEGURO SOCIAL', 105, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text('SEGURIDAD Y SOLIDARIDAD SOCIAL', 105, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', 105, 25, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Anexo T 33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', 105, 31, { align: 'center' });
  
  // Restablecer color de texto
  doc.setTextColor(0, 0, 0);
  
  let yPos = 42;
  
  // Información General
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
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
  
  // Tabla de información general
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Unidad Médica:', folio.unidad, 'No. de folio:', folio.numero_folio, 'Fecha:', new Date(folio.created_at).toLocaleDateString('es-MX')]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: primaryColor },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      2: { fontStyle: 'bold', cellWidth: 25 },
      4: { fontStyle: 'bold', cellWidth: 20 },
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  
  // Tabla de horarios
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        'Hora Inicio Procedimiento',
        folio.hora_inicio_procedimiento,
        'Hora Fin Procedimiento',
        folio.hora_fin_procedimiento
      ],
      [
        'Hora Inicio Anestesia',
        folio.hora_inicio_anestesia,
        'Hora Fin Anestesia',
        folio.hora_fin_anestesia
      ],
      [
        'Número de Quirófano',
        folio.numero_quirofano,
        '',
        ''
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      2: { fontStyle: 'bold', cellWidth: 45 },
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  
  // Procedimiento y tipo
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        'Procedimiento Quirúrgico:',
        folio.cirugia,
        'Especialidad:',
        folio.especialidad_quirurgica
      ],
      [
        'Tipo de Cirugía:',
        tipoCirugiaLabels[folio.tipo_cirugia] || folio.tipo_cirugia,
        'Tipo de Anestesia:',
        tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia
      ],
      [
        'Evento:',
        tipoEventoLabels[folio.tipo_evento] || folio.tipo_evento,
        '',
        ''
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      2: { fontStyle: 'bold', cellWidth: 35 },
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  
  // Sección: DATOS DEL PACIENTE
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(10, yPos, 190, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PACIENTE', 105, yPos + 5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  yPos += 10;
  
  // Tabla de datos del paciente
  const nombreCompleto = folio.paciente_nombre?.split(' ').slice(0, -2).join(' ') || '';
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        'Apellido Paterno:',
        folio.paciente_apellido_paterno,
        'Apellido Materno:',
        folio.paciente_apellido_materno
      ],
      [
        'Nombre(s):',
        nombreCompleto,
        'NSS:',
        folio.paciente_nss
      ],
      [
        'Género:',
        generoLabels[folio.paciente_genero] || folio.paciente_genero,
        'Edad:',
        `${folio.paciente_edad} años`
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      2: { fontStyle: 'bold', cellWidth: 35 },
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 8;
  
  // Bienes de consumo y medicamentos
  if (insumos && insumos.length > 0) {
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(10, yPos, 190, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BIENES DE CONSUMO Y MEDICAMENTOS', 105, yPos + 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    yPos += 10;
    
    const insumosData = insumos.map((insumo, idx) => [
      (idx + 1).toString(),
      insumo.nombre_insumo,
      insumo.lote || 'N/A',
      insumo.cantidad.toString()
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['No.', 'Descripción', 'Lote', 'Cantidad']],
      body: insumosData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: primaryColor, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 100 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25, halign: 'center' },
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }
  
  // Firma
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MÉDICO QUE REALIZÓ EL PROCEDIMIENTO', 105, yPos, { align: 'center' });
  
  yPos += 15;
  doc.line(50, yPos, 160, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('(NOMBRE Y FIRMA)', 105, yPos + 5, { align: 'center' });
  
  // Guardar PDF
  doc.save(`Folio_${folio.numero_folio}_T33.pdf`);
};
