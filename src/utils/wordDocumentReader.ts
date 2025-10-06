import mammoth from 'mammoth';

// Utility to read Word document content using mammoth.js
export async function readWordDocumentContent(filePath: string): Promise<string> {
  try {
    // Convert file path to actual file URL
    const fileUrl = new URL(filePath, window.location.origin).href;
    
    // Fetch the file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse the Word document using mammoth with maximum style preservation
    const result = await mammoth.convertToHtml({ 
      arrayBuffer,
      // Disable style mapping to preserve original formatting
      styleMap: [],
      includeEmbeddedStyleMap: true,
      includeDefaultStyleMap: false,
      // Preserve all formatting
      convertImage: mammoth.images.inline(function(element) {
        return element.read("base64").then(function(imageBuffer) {
          return {
            src: "data:" + element.contentType + ";base64," + imageBuffer.toString("base64")
          };
        });
      })
    });
    
    // Get the HTML content with all original formatting preserved
    let htmlContent = result.value;
    
    // Debug: Log the content to see what mammoth is returning
    console.log('Mammoth conversion result:', result);
    console.log('HTML content:', htmlContent);
    
    // Don't add any wrapper styling - keep the original formatting
    // The mammoth library already preserves fonts, sizes, colors, alignment, etc.
    
    // Only add placeholders for common fields if they don't exist and are clearly placeholders
    if (!htmlContent.includes('[NOMBRE]') && !htmlContent.includes('[nombre]')) {
      htmlContent = htmlContent.replace(/\b(nombre|name)\b/gi, '[NOMBRE]');
    }
    if (!htmlContent.includes('[FECHA]') && !htmlContent.includes('[fecha]')) {
      htmlContent = htmlContent.replace(/\b(fecha|date)\b/gi, '[FECHA]');
    }
    if (!htmlContent.includes('[DOCUMENTO]') && !htmlContent.includes('[documento]')) {
      htmlContent = htmlContent.replace(/\b(documento|document)\b/gi, '[DOCUMENTO]');
    }
    
    return htmlContent;
    
  } catch (error) {
    console.error('Error reading Word document:', error);
    
    // Fallback to template based on document name
    if (filePath.includes('HOJA DE CARGO')) {
      return getHojaDeCargoTemplate();
    }
    
    return getDefaultTemplate();
  }
}

function getHojaDeCargoTemplate(): string {
  return `<div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 10px;">HOJA DE CARGO</h1>
    <p style="font-size: 10pt; color: #666;">Documento oficial de personal</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Datos del Empleado</h2>
    <p><strong>Nombre completo:</strong> [NOMBRE]</p>
    <p><strong>Número de documento:</strong> [DOCUMENTO]</p>
    <p><strong>Cargo:</strong> [CARGO]</p>
    <p><strong>Departamento:</strong> [DEPARTAMENTO]</p>
    <p><strong>Fecha de ingreso:</strong> [FECHA]</p>
    <p><strong>Salario:</strong> [SALARIO]</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Información Personal</h2>
    <p><strong>Dirección:</strong> [DIRECCION]</p>
    <p><strong>Teléfono:</strong> [TELEFONO]</p>
    <p><strong>Email:</strong> [EMAIL]</p>
    <p><strong>Estado civil:</strong> [ESTADO_CIVIL]</p>
    <p><strong>Fecha de nacimiento:</strong> [FECHA_NACIMIENTO]</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Información Laboral</h2>
    <p><strong>Jefe inmediato:</strong> [JEFE]</p>
    <p><strong>Horario de trabajo:</strong> [HORARIO]</p>
    <p><strong>Tipo de contrato:</strong> [TIPO_CONTRATO]</p>
    <p><strong>Fecha de inicio:</strong> [FECHA_INICIO]</p>
    <p><strong>Fecha de finalización:</strong> [FECHA_FIN]</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Responsabilidades</h2>
    <p style="text-align: justify; line-height: 1.5;">[Descripción de las responsabilidades del cargo...]</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Beneficios</h2>
    <p style="text-align: justify; line-height: 1.5;">[Lista de beneficios y prestaciones...]</p>
  </div>
  
  <div style="margin-top: 40px;">
    <div style="display: flex; justify-content: space-between;">
      <div>
        <p><strong>Firma del Empleado:</strong></p>
        <p style="margin-top: 40px;">_________________________</p>
        <p>[NOMBRE]</p>
        <p>Fecha: [FECHA]</p>
      </div>
      <div>
        <p><strong>Firma del Empleador:</strong></p>
        <p style="margin-top: 40px;">_________________________</p>
        <p>[JEFE]</p>
        <p>Fecha: [FECHA]</p>
      </div>
    </div>
  </div>
  
  <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #666;">
    <p>Documento generado el ${new Date().toLocaleDateString()}</p>
  </div>`;
}

function getDefaultTemplate(): string {
  return `<div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 10px;">DOCUMENTO</h1>
    <p style="font-size: 10pt; color: #666;">Documento personalizado</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Información Personal</h2>
    <p><strong>Nombre:</strong> [NOMBRE]</p>
    <p><strong>Documento:</strong> [DOCUMENTO]</p>
    <p><strong>Fecha:</strong> [FECHA]</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Contenido Principal</h2>
    <p>Edita aquí el contenido de tu documento...</p>
  </div>
  
  <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #666;">
    <p>Documento generado el ${new Date().toLocaleDateString()}</p>
  </div>`;
}

export function getWordDocumentFields(documentName: string): string[] {
  if (documentName.includes('HOJA DE CARGO')) {
    return [
      'NOMBRE',
      'DOCUMENTO', 
      'CARGO',
      'DEPARTAMENTO',
      'FECHA',
      'SALARIO',
      'DIRECCION',
      'TELEFONO',
      'EMAIL',
      'ESTADO_CIVIL',
      'FECHA_NACIMIENTO',
      'JEFE',
      'HORARIO',
      'TIPO_CONTRATO',
      'FECHA_INICIO',
      'FECHA_FIN'
    ];
  }
  
  return ['NOMBRE', 'DOCUMENTO', 'FECHA', 'DIRECCION', 'TELEFONO'];
}
