import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import imssLogo from '@/assets/imss-logo.jpg';

export const generateFolioPDF = (folio: any, insumos: any[], tiposAnestesiaLabels: Record<string, string>) => {
  const doc = new jsPDF();
  
  // Colores del formato T33
  const imssBlue: [number, number, number] = [0, 83, 155]; // Azul IMSS
  const darkGray: [number, number, number] = [52, 73, 94]; // Gris oscuro para DATOS DEL PACIENTE
  const lightGray: [number, number, number] = [220, 220, 220]; // Gris claro para headers de tabla
  
  // Añadir logo IMSS
  doc.addImage(imssLogo, 'JPEG', 14, 8, 25, 25);
  
  // HEADER - Textos en negro sin fondo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTITUTO MEXICANO DEL SEGURO SOCIAL', 105, 12, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('SEGURIDAD Y SOLIDARIDAD SOCIAL', 105, 18, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text('"SERVICIO MÉDICO INTEGRAL PARA ANESTESIA"', 105, 26, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Anexo T33 "Reporte individual de procedimientos, bienes de consumo y medicamentos"', 105, 32, { align: 'center' });
  
  let yPos = 40;
  
  // TABLA 1: OOAD/UMAE, Unidad Médica, No. de contrato, Fecha, No. de folio
  autoTable(doc, {
    startY: yPos,
    head: [['OOAD/UMAE:', 'Unidad Médica:', 'No. de contrato:', 'Fecha:', 'No. de folio:']],
    body: [[
      folio.state_name || 'N/A',
      folio.hospital_display_name || 'N/A',
      folio.hospital_budget_code || 'N/A',
      new Date(folio.created_at || folio.fecha).toLocaleString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      folio.numero_folio
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 0
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 2;
  
  // TABLA 2: Horarios y Quirófano
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
      folio.hora_inicio_procedimiento ? new Date(`${folio.fecha}T${folio.hora_inicio_procedimiento}`).toLocaleString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A',
      folio.hora_fin_procedimiento ? new Date(`${folio.fecha}T${folio.hora_fin_procedimiento}`).toLocaleString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A',
      folio.hora_inicio_anestesia ? new Date(`${folio.fecha}T${folio.hora_inicio_anestesia}`).toLocaleString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A',
      folio.hora_fin_anestesia ? new Date(`${folio.fecha}T${folio.hora_fin_anestesia}`).toLocaleString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A'
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: 0,
      halign: 'center'
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 4;
  
  // Información del procedimiento
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proveedor: CBH+ ESPECIALISTAS EN INNOVACIÓN MÉDICA S.A. DE C.V.`, 14, yPos);
  yPos += 6;
  
  doc.text(`Procedimiento Quirúrgico: ${folio.cirugia || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Especialidad Quirúrgica: ${folio.especialidad_quirurgica || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  const tipoCirugiaLabels: Record<string, string> = {
    programada: 'PROGRAMADA',
    urgencia: 'URGENCIA',
    abierta: 'ABIERTA',
    minima_invasion: 'MÍNIMA INVASIÓN',
  };
  doc.text(`Tipo de Cirugía: ${tipoCirugiaLabels[folio.tipo_cirugia] || folio.tipo_cirugia || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  const tipoEventoLabels: Record<string, string> = {
    programado: 'Programado',
    urgencia: 'Urgencia',
  };
  doc.text(`Evento: ${tipoEventoLabels[folio.tipo_evento] || folio.tipo_evento || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Nombre del Cirujano: ${folio.cirujano_nombre || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Nombre del Anestesiólogo: ${folio.anestesiologo_nombre || 'N/A'}`, 14, yPos);
  yPos += 8;
  
  // DATOS DEL PACIENTE - Header con fondo gris oscuro
  doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.rect(14, yPos, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PACIENTE', 105, yPos + 5.5, { align: 'center' });
  
  yPos += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Datos del paciente en formato de texto simple
  doc.text(`Apellido paterno: ${folio.paciente_apellido_paterno || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Apellido materno: ${folio.paciente_apellido_materno || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Nombre(s): ${folio.paciente_nombre || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  const generoLabels: Record<string, string> = {
    masculino: 'Masculino',
    femenino: 'Femenino',
    M: 'Masculino',
    F: 'Femenino',
  };
  doc.text(`Género: ${generoLabels[folio.paciente_genero] || folio.paciente_genero || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`Edad: ${folio.paciente_edad || 'N/A'}`, 14, yPos);
  yPos += 6;
  
  doc.text(`NSS: ${folio.paciente_nss || 'N/A'}`, 14, yPos);
  yPos += 8;
  
  // Productividad de Procedimientos
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Productividad de Procedimientos:', 14, yPos);
  yPos += 2;
  
  autoTable(doc, {
    startY: yPos,
    head: [['No.', 'Clave del Procedimiento', 'Tipo de Procedimiento', 'Procedimiento Quirúrgico', 'Precio Unitario (Con IVA)', 'Importe (Sin IVA)']],
    body: [[
      '1',
      folio.tipo_anestesia || 'N/A',
      tiposAnestesiaLabels[folio.tipo_anestesia] || folio.tipo_anestesia || 'N/A',
      folio.cirugia || 'N/A',
      '',
      ''
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: lightGray,
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 0,
      halign: 'center'
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      cellPadding: 2
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 6;
  
  // Verificar si necesitamos una nueva página
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  // Bienes de consumo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bienes de consumo', 14, yPos);
  yPos += 2;
  
  // Filtrar insumos que no son medicamentos
  const bienesConsumo = insumos.filter(item => 
    !item.nombre.toLowerCase().includes('mg') && 
    !item.nombre.toLowerCase().includes('ml') &&
    !item.nombre.toLowerCase().includes('solución') &&
    !item.nombre.toLowerCase().includes('inyectable')
  );
  
  if (bienesConsumo.length > 0) {
    const bienesBody = bienesConsumo.map((item, index) => [
      (index + 1).toString(),
      item.nombre,
      `${item.cantidad} (PIEZA)`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['No.', 'Descripción', 'Cantidad']],
      body: bienesBody,
      theme: 'grid',
      headStyles: {
        fillColor: lightGray,
        textColor: 0,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: 0
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 145 },
        2: { cellWidth: 25, halign: 'center' }
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        cellPadding: 2
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }
  
  // Verificar si necesitamos una nueva página para medicamentos
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Medicamentos y Materiales
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Medicamentos y Materiales', 14, yPos);
  yPos += 2;
  
  // Filtrar medicamentos
  const medicamentos = insumos.filter(item => 
    item.nombre.toLowerCase().includes('mg') || 
    item.nombre.toLowerCase().includes('ml') ||
    item.nombre.toLowerCase().includes('solución') ||
    item.nombre.toLowerCase().includes('inyectable')
  );
  
  if (medicamentos.length > 0) {
    const medicamentosBody = medicamentos.map((item, index) => [
      (index + 1).toString(),
      item.nombre,
      item.descripcion || item.nombre,
      `${item.cantidad} (PIEZA)`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['No.', 'Medicamentos', 'Descripción', 'Cantidad']],
      body: medicamentosBody,
      theme: 'grid',
      headStyles: {
        fillColor: lightGray,
        textColor: 0,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: 0
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25, halign: 'center' }
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        cellPadding: 2
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Firma del médico
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('MÉDICO QUE REALIZÓ EL PROCEDIMIENTO (NOMBRE Y FIRMA)', 14, yPos);
  yPos += 15;
  doc.text('(FIRMA Y MATRÍCULA)', 14, yPos);
  
  // Guardar el PDF
  doc.save(`Folio_${folio.numero_folio}.pdf`);
};
