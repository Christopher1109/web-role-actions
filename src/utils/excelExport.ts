import * as XLSX from 'xlsx';

interface T29Record {
  folio: string;
  fecha: string;
  nombrePaciente: string;
  edad: number;
  genero: string;
  cirugia: string;
  tipoAnestesia: string;
  cirujano: string;
  anestesiologo: string;
  unidad: string;
  estado: string;
}

interface T30Record {
  fecha: string;
  folio: string;
  nombreInsumo: string;
  lote: string;
  cantidad: number;
  unidad: string;
  origen: string;
  anestesiologo: string;
}

export const generateAnexoT29 = (
  folios: any[],
  fechaInicio: string,
  fechaFin: string
) => {
  const data: T29Record[] = folios.map(folio => ({
    folio: folio.numeroFolio,
    fecha: folio.fechaHora,
    nombrePaciente: folio.paciente.nombre,
    edad: folio.paciente.edad,
    genero: folio.paciente.genero === 'M' ? 'Masculino' : folio.paciente.genero === 'F' ? 'Femenino' : 'Otro',
    cirugia: folio.cirugia,
    tipoAnestesia: getTipoAnestesiaLabel(folio.tipoAnestesia),
    cirujano: folio.cirujano,
    anestesiologo: folio.anestesiologo,
    unidad: folio.unidad,
    estado: folio.estado === 'activo' ? 'Activo' : 'Cancelado',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: [
      'folio',
      'fecha',
      'nombrePaciente',
      'edad',
      'genero',
      'cirugia',
      'tipoAnestesia',
      'cirujano',
      'anestesiologo',
      'unidad',
      'estado',
    ],
  });

  // Configurar anchos de columna
  worksheet['!cols'] = [
    { wch: 15 }, // folio
    { wch: 12 }, // fecha
    { wch: 30 }, // nombrePaciente
    { wch: 8 },  // edad
    { wch: 10 }, // genero
    { wch: 25 }, // cirugia
    { wch: 30 }, // tipoAnestesia
    { wch: 30 }, // cirujano
    { wch: 30 }, // anestesiologo
    { wch: 15 }, // unidad
    { wch: 12 }, // estado
  ];

  // Renombrar encabezados
  const headerMapping: Record<string, string> = {
    folio: 'Folio',
    fecha: 'Fecha',
    nombrePaciente: 'Nombre del Paciente',
    edad: 'Edad',
    genero: 'Género',
    cirugia: 'Tipo de Cirugía',
    tipoAnestesia: 'Tipo de Anestesia',
    cirujano: 'Cirujano',
    anestesiologo: 'Anestesiólogo',
    unidad: 'Unidad',
    estado: 'Estado',
  };

  Object.keys(headerMapping).forEach((key, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].v = headerMapping[key];
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Anexo T29');

  // Agregar información del periodo
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ['ANEXO T29 - LISTADO DE PACIENTES'],
    [''],
    ['Fecha de inicio:', fechaInicio],
    ['Fecha de fin:', fechaFin],
    ['Total de registros:', data.length.toString()],
    ['Fecha de generación:', new Date().toLocaleDateString('es-MX')],
  ]);
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Información');

  const fileName = `Anexo_T29_${fechaInicio}_${fechaFin}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const generateAnexoT30 = (
  folios: any[],
  fechaInicio: string,
  fechaFin: string
) => {
  const data: T30Record[] = [];

  folios.forEach(folio => {
    folio.insumosUtilizados.forEach((insumo: any) => {
      data.push({
        fecha: folio.fechaHora,
        folio: folio.numeroFolio,
        nombreInsumo: insumo.nombre,
        lote: insumo.lote,
        cantidad: insumo.cantidad,
        unidad: folio.unidad,
        origen: 'LOAD', // En producción esto vendría de la BD
        anestesiologo: folio.anestesiologo,
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: [
      'fecha',
      'folio',
      'nombreInsumo',
      'lote',
      'cantidad',
      'unidad',
      'origen',
      'anestesiologo',
    ],
  });

  // Configurar anchos de columna
  worksheet['!cols'] = [
    { wch: 12 }, // fecha
    { wch: 15 }, // folio
    { wch: 30 }, // nombreInsumo
    { wch: 18 }, // lote
    { wch: 10 }, // cantidad
    { wch: 15 }, // unidad
    { wch: 12 }, // origen
    { wch: 30 }, // anestesiologo
  ];

  // Renombrar encabezados
  const headerMapping: Record<string, string> = {
    fecha: 'Fecha',
    folio: 'Folio',
    nombreInsumo: 'Nombre del Insumo',
    lote: 'Lote',
    cantidad: 'Cantidad',
    unidad: 'Unidad',
    origen: 'Origen',
    anestesiologo: 'Anestesiólogo',
  };

  Object.keys(headerMapping).forEach((key, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].v = headerMapping[key];
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Anexo T30');

  // Agregar información del periodo
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ['ANEXO T30 - LISTADO DE INSUMOS UTILIZADOS'],
    [''],
    ['Fecha de inicio:', fechaInicio],
    ['Fecha de fin:', fechaFin],
    ['Total de registros:', data.length.toString()],
    ['Fecha de generación:', new Date().toLocaleDateString('es-MX')],
  ]);
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Información');

  const fileName = `Anexo_T30_${fechaInicio}_${fechaFin}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

const getTipoAnestesiaLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    general_balanceada_adulto: 'General Balanceada Adulto',
    general_balanceada_pediatrica: 'General Balanceada Pediátrica',
    general_alta_especialidad: 'General Alta Especialidad',
    general_endovenosa: 'General Endovenosa',
    locorregional: 'Locorregional',
    sedacion: 'Sedación',
  };
  return labels[tipo] || tipo;
};
