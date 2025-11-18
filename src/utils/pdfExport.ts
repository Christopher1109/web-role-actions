import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import cbMedicaLogo from '@/assets/cb-medica-logo.jpg';

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();
  
  // Colores del formato T33 IMSS
  const lightGray: [number, number, number] = [230, 230, 230];
  
  // Logo CB Médica en esquina superior izquierda
  doc.addImage(cbMedicaLogo, 'JPEG', 14, 10, 30, 15);
  
  // ENCABEZADO INSTITUCIONAL
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTITUTO MEXICANO DEL SEGURO SOCIAL', 105, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text('SEGURIDAD Y SOLIDARIDAD SOCIAL', 105, 21, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', 105, 28, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', 105, 34, { align: 'center' });
  
  let yPos = 42;
  
  // SECCIÓN 1: Identificación básica
  autoTable(doc, {
    startY: yPos,
    head: [['OOAD/UMAE:', 'Unidad Médica:', 'No. de contrato:', 'Fecha:', 'No. de folio:']],
    body: [[
      folio.state_name || 'N/A',
      folio.hospital_display_name || 'N/A',
      folio.hospital_budget_code || 'N/A',
      folio.fecha ? new Date(folio.fecha + 'T' + (folio.created_at ? new Date(folio.created_at).toTimeString().slice(0, 8) : '00:00:00')).toLocaleString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A',
      folio.numero_folio
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0]
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 1;
  
  // SECCIÓN 2: Horarios y Quirófano
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Número de Quirófano',
      'Hora de Inicio del Procedimiento Quirúrgico',
      'Hora de la finalización del Procedimiento Quirúrgico',
      'Hora de inicio de la Anestesia',
      'Hora de finalización de la Anestesia'
    ]],
    body: [[
      folio.numero_quirofano || 'N/A',
      folio.hora_inicio_procedimiento && folio.fecha ? 
        new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toLocaleString('es-MX', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A',
      folio.hora_fin_procedimiento && folio.fecha ? 
        new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleString('es-MX', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A',
      folio.hora_inicio_anestesia && folio.fecha ? 
        new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleString('es-MX', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A',
      folio.hora_fin_anestesia && folio.fecha ? 
        new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleString('es-MX', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A'
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      halign: 'center'
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 3;
  
  // SECCIÓN 3: Datos del proveedor y procedimiento
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Proveedor: CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.', 14, yPos);
  yPos += 5;
  
  doc.text(`Procedimiento Quirúrgico: ${folio.cirugia || 'N/A'}`, 14, yPos);
  yPos += 5;
  
  doc.text(`Especialidad Quirúrgica: ${folio.especialidad_quirurgica || 'N/A'}`, 14, yPos);
  yPos += 5;
  
  doc.text(`Tipo de Cirugía: ${folio.tipo_cirugia || 'N/A'}`, 14, yPos);
  yPos += 5;
  
  doc.text(`Evento: ${folio.tipo_evento || 'N/A'}`, 14, yPos);
  yPos += 5;
  
  doc.text(`Nombre del Cirujano: ${folio.cirujano_nombre || 'N/A'}`, 14, yPos);
  yPos += 5;
  
  doc.text(`Nombre del Anestesiólogo: ${folio.anestesiologo_nombre || 'N/A'}`, 14, yPos);
  yPos += 8;
  
  // SECCIÓN 4: DATOS DEL PACIENTE
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PACIENTE', 14, yPos);
  yPos += 2;
  
  autoTable(doc, {
    startY: yPos,
    body: [
      ['Apellido paterno:', folio.paciente_apellido_paterno || 'N/A'],
      ['Apellido materno:', folio.paciente_apellido_materno || 'N/A'],
      ['Nombre(s):', folio.paciente_nombre || 'N/A'],
      ['Género:', folio.paciente_genero || 'N/A'],
      ['Edad:', folio.paciente_edad?.toString() || 'N/A'],
      ['NSS:', folio.paciente_nss || 'N/A']
    ],
    theme: 'grid',
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 150 }
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 6;
  
  // SECCIÓN 5: Productividad de Procedimientos
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Productividad de Procedimientos:', 14, yPos);
  yPos += 2;
  
  const tipoAnestesiaDisplay = folio.tipo_anestesia ? 
    tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia : 'N/A';
  
  autoTable(doc, {
    startY: yPos,
    head: [[
      'No.',
      'Clave del Procedimiento',
      'Tipo de Procedimiento',
      'Procedimiento Quirúrgico',
      'Precio Unitario (Con IVA)',
      'Importe (Sin IVA)'
    ]],
    body: [[
      '1',
      'N/A',
      tipoAnestesiaDisplay,
      folio.cirugia || 'N/A',
      '',
      ''
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 45 },
      3: { cellWidth: 50 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 6;
  
  // SECCIÓN 6: Bienes de consumo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bienes de consumo', 14, yPos);
  yPos += 2;
  
  const insumosBody = insumos.map((insumo, index) => [
    (index + 1).toString(),
    insumo.descripcion || insumo.nombre || 'N/A',
    `${insumo.cantidad} (PIEZA)`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['No.', 'Descripción', 'Cantidad']],
    body: insumosBody,
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 145 },
      2: { cellWidth: 25, halign: 'center' }
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // SECCIÓN FINAL: Firma
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (NOMBRE Y FIRMA)', 14, yPos);
  yPos += 10;
  doc.line(14, yPos, 100, yPos);
  yPos += 4;
  doc.text('(FIRMA Y MATRÍCULA)', 14, yPos);
  
  // Guardar PDF
  doc.save(`Folio_T33_${folio.numero_folio}.pdf`);
};
