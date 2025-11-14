export interface PDFTextFieldLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  defaultValue?: string;
}

export interface PDFImageFieldLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFTemplateLayout {
  textFields: PDFTextFieldLayout[];
  imageFields: PDFImageFieldLayout[];
}

// Coordenadas en puntos PDF (origen en esquina inferior izquierda)
// Ajusta estos valores para tu plantilla "Llenar Datos".
export const pdfTemplateLayouts: Record<string, PDFTemplateLayout> = {
  'llenar-datos': {
    textFields: [
      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 170, y: 529, width: 280, height: 20, fontSize: 11 },
      { id: 'dni', name: 'DNI', x: 80, y: 508.5, width: 100, height: 20, fontSize: 11 },
      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 442, y: 575, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 459, y: 511, width: 160, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 292, y: 426, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 292, y: 383, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_3', name: 'Fecha curso 3', x: 292, y: 338, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_4', name: 'Fecha curso 4', x: 292, y: 293, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_5', name: 'Fecha curso 5', x: 292, y: 253, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'nota_general', name: 'Nota general', x: 396, y: 330, width: 40, height: 20, fontSize: 11, defaultValue: '18' },
      { id: 'hora_curso', name: 'Horas de curso',x: 148, y: 205.4, width: 40, height: 20, fontSize: 11 },
      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 143, y: 190.4, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 438, y: 190.4, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
    ],
    imageFields: [
      { id: 'foto', name: 'Foto del Postulante', x: 358, y: 624, width: 90, height: 100 },
      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
    ]
  }
  ,
  'reca-aiia': {
    textFields: [
      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 186, y: 484.6, width: 100, height: 20, fontSize: 11 },
      { id: 'dni', name: 'DNI', x: 94, y:  455.6, width: 80, height: 20, fontSize: 11 },
      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 288, y: 532, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 476, y: 456.5, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 232, y: 361, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 232, y: 345, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_3', name: 'Fecha curso 3', x: 232, y: 328, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_4', name: 'Fecha curso 4', x: 232, y: 310, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'nota_curso_1', name: 'Nota curso 1', x: 314, y: 361, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_2', name: 'Nota curso 2', x: 314, y: 345, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_3', name: 'Nota curso 3', x: 314, y: 328, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_4', name: 'Nota curso 4', x: 314, y: 310, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_5', name: 'Nota Practica de manejo', x: 314, y: 260, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_6', name: 'Nota Promedio', x: 314, y: 245, width: 40, height: 20, fontSize: 11 },
      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 161, y: 181.8, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 456, y: 181.8, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
    ],
    imageFields: [
      { id: 'foto', name: 'Foto del Postulante', x: 386, y: 570, width: 90, height: 100 },
      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
    ]
  }
  ,
  'llenar-datos2': {
    textFields: [
      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 200, y: 500, width: 100, height: 20, fontSize: 11 },
      { id: 'dni', name: 'DNI', x: 106, y:  471.4, width: 80, height: 20, fontSize: 11 },
      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 300, y: 546, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 430, y: 471.6, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 282, y: 376, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 282, y: 360, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_3', name: 'Fecha curso 3', x: 282, y: 342, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'fecha_curso_4', name: 'Fecha curso 4', x: 282, y: 324, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'nota_curso_1', name: 'Nota curso 1', x: 382, y: 376, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_2', name: 'Nota curso 2', x: 382, y: 360, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_3', name: 'Nota curso 3', x: 382, y: 342, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_4', name: 'Nota curso 4', x: 382, y: 324, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_5', name: 'Nota Practica de manejo', x: 382, y: 276, width: 40, height: 20, fontSize: 11 },
      { id: 'nota_curso_6', name: 'Nota Promedio', x: 382, y: 260, width: 40, height: 20, fontSize: 11 },
      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 178, y: 197, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 416, y: 197, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
    ],
    imageFields: [
      { id: 'foto', name: 'Foto del Postulante', x: 414, y: 580, width: 90, height: 100 },
      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
    ]
	  }
	  ,
	  'actualizacion-transporte-mercancias': {
	    textFields: [
	      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 172, y: 508.2, width: 100, height: 20, fontSize: 11 },
	      { id: 'dni', name: 'DNI', x: 70, y:  479.8, width: 80, height: 20, fontSize: 11 },
	      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 332, y: 556, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 472, y: 479.8, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
	      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 225, y: 350, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 225, y: 324, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'nota_curso_1', name: 'Nota curso 1', x: 310, y: 350, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_2', name: 'Nota curso 2', x: 310, y: 324, width: 40, height: 20, fontSize: 11 },
        { id: 'Horas_Curso', name: 'Horas de curso', x: 142, y: 268, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_6', name: 'Nota Promedio', x: 310, y: 301, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 136, y: 238, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 454, y: 238, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
	    ],
	    imageFields: [
	      { id: 'foto', name: 'Foto del Postulante', x: 382, y: 594, width: 90, height: 100 },
	      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
	      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
	    ]
	  }
	  ,
	  'actualizacion-transporte-personas': {
	    textFields: [
	      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 176, y: 481.4, width: 100, height: 20, fontSize: 11 },
	      { id: 'dni', name: 'DNI', x: 76, y:  452.8, width: 80, height: 20, fontSize: 11 },
	      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 364, y: 529, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 506, y: 452.8, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
	      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 244, y: 323, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 244, y: 296, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'nota_curso_1', name: 'Nota curso 1', x: 336, y: 323, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_2', name: 'Nota curso 2', x: 336, y: 296, width: 40, height: 20, fontSize: 11 },
	      { id: 'Horas_Curso', name: 'Horas de curso', x: 148, y: 240, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_6', name: 'Nota Promedio', x: 336, y: 272, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 146, y: 209, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 490, y: 209, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
	    ],
	    imageFields: [
	      { id: 'foto', name: 'Foto del Postulante', x: 412, y: 564, width: 90, height: 100 },
	      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
	      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
	    ]
	  }
	  ,
	  'cambiemos-de-actitud': {
	    textFields: [
	      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 170, y: 476.8, width: 100, height: 20, fontSize: 11 },
	      { id: 'dni', name: 'DNI', x: 76, y:  448, width: 80, height: 20, fontSize: 11 },
	      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 304, y: 524, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 498, y: 449, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
	      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 221, y: 323, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 221, y: 307.4, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'nota_curso_1', name: 'Nota curso 1', x: 294, y: 323, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_2', name: 'Nota curso 2', x: 294, y: 307.4, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_promedio', name: 'Nota Promedio', x: 294, y: 292, width: 40, height: 20, fontSize: 11 },
	      { id: 'Hora_curso', name: 'Horas de curso', x: 148, y: 260, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 146, y: 230, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 430, y: 230, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
	    ],
	    imageFields: [
	      { id: 'foto', name: 'Foto del Postulante', x: 346, y: 562, width: 90, height: 100 },
	      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
	      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
	    ]
	  }
	  ,
	  'motos-biiic': {
	    textFields: [
	      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 188, y: 477, width: 100, height: 20, fontSize: 11 },
	      { id: 'dni', name: 'DNI', x: 102, y:  449, width: 80, height: 20, fontSize: 11 },
	      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 328, y: 525, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 458, y: 449, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
	      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 224, y: 323, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 224, y: 308, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_3', name: 'Fecha curso 3', x: 224, y: 292, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'nota_curso_1', name: 'Nota curso 1', x: 307, y: 323, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_2', name: 'Nota curso 2', x: 307, y: 308, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_3', name: 'Nota curso 3', x: 307, y: 292, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso', name: 'Horas de curso', x: 168, y: 244.2, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_6', name: 'Nota Promedio', x: 307, y: 276, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 166, y: 214, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 448, y: 214, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
	    ],
	    imageFields: [
	      { id: 'foto', name: 'Foto del Postulante', x: 380, y: 560, width: 90, height: 100 },
	      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
	      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
	    ]
	  }
	  ,
	  'reca-aiib-space': {
	    textFields: [
	      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 200, y: 500, width: 100, height: 20, fontSize: 11 },
	      { id: 'dni', name: 'DNI', x: 106, y:  471.4, width: 80, height: 20, fontSize: 11 },
	      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 300, y: 546, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 430, y: 471.6, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
	      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 282, y: 376, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 282, y: 360, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_3', name: 'Fecha curso 3', x: 282, y: 342, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_4', name: 'Fecha curso 4', x: 282, y: 324, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'nota_curso_1', name: 'Nota curso 1', x: 382, y: 376, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_2', name: 'Nota curso 2', x: 382, y: 360, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_3', name: 'Nota curso 3', x: 382, y: 342, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_4', name: 'Nota curso 4', x: 382, y: 324, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_5', name: 'Nota Practica de manejo', x: 382, y: 276, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_6', name: 'Nota Promedio', x: 382, y: 260, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 178, y: 197, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 416, y: 197, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
	    ],
	    imageFields: [
	      { id: 'foto', name: 'Foto del Postulante', x: 386, y: 570, width: 90, height: 100 },
	      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
	      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
	    ]
	  }
	  ,
	  'reca-aiib-iiic': {
	    textFields: [
	      { id: 'apellidos_nombres', name: 'Apellidos y Nombres', x: 200, y: 500, width: 100, height: 20, fontSize: 11 },
	      { id: 'dni', name: 'DNI', x: 106, y:  471.4, width: 80, height: 20, fontSize: 11 },
	      { id: 'fecha_inscripcion', name: 'Fecha de inscripción', x: 300, y: 546, width: 60, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', x: 430, y: 471.6, width: 100, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'codigo_archivo', name: 'Código de archivo', x: 374, y: 754, width: 80, height: 20, fontSize: 18 },
	      { id: 'fecha_curso_1', name: 'Fecha curso 1', x: 282, y: 376, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_2', name: 'Fecha curso 2', x: 282, y: 360, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_3', name: 'Fecha curso 3', x: 282, y: 342, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'fecha_curso_4', name: 'Fecha curso 4', x: 282, y: 324, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'nota_curso_1', name: 'Nota curso 1', x: 382, y: 376, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_2', name: 'Nota curso 2', x: 382, y: 360, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_3', name: 'Nota curso 3', x: 382, y: 342, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_4', name: 'Nota curso 4', x: 382, y: 324, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_5', name: 'Nota Practica de manejo', x: 382, y: 276, width: 40, height: 20, fontSize: 11 },
	      { id: 'nota_curso_6', name: 'Nota Promedio', x: 382, y: 260, width: 40, height: 20, fontSize: 11 },
	      { id: 'horas_curso_fecha_inicio', name: 'Fecha de inicio', x: 178, y: 197, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' },
	      { id: 'horas_curso_fecha_termino', name: 'Fecha de término', x: 416, y: 197, width: 80, height: 20, fontSize: 11, defaultValue: '  /  /    ' }
	    ],
	    imageFields: [
	      { id: 'foto', name: 'Foto del Postulante', x: 386, y: 570, width: 90, height: 100 },
	      { id: 'firma', name: 'Firma', x: 160, y: 110, width: 160, height: 60 },
	      { id: 'sello', name: 'Sello', x: 422, y: 110, width: 100, height: 70 }
	    ]
	  }
};


