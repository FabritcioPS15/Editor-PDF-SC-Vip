import React, { useState, useRef } from 'react';
import WebcamCapture from './WebcamCapture';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pdfTemplateLayouts } from '../utils/pdfTemplateLayouts';

interface PDFTemplateEditorProps {
  onBack: () => void;
  onComplete: (editedPdfBytes: Uint8Array) => void;
  templatePdfBytes?: Uint8Array;
  capturedImage?: string;
  templateId?: string;
  templateTitle?: string;
}

interface EditableField {
  id: string;
  name: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

interface ImageField {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData?: string;
}

const PDFTemplateEditor: React.FC<PDFTemplateEditorProps> = ({
  onBack,
  onComplete,
  templatePdfBytes,
  capturedImage,
  templateId,
  templateTitle
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(templatePdfBytes || null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [previewScale, setPreviewScale] = useState<number>(1.5);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [simplePreview] = useState<boolean>(true);
  const storageKey = (name: string) => `pdfEditor:${templateId || 'default'}:${name}`;
  const readBool = (key: string, fallback: boolean) => {
    try {
      const v = localStorage.getItem(key);
      if (v === '1') return true;
      if (v === '0') return false;
      return fallback;
    } catch {
      return fallback;
    }
  };
  const writeBool = (key: string, value: boolean) => {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch {}
  };
  const [textFieldsCollapsed, setTextFieldsCollapsed] = useState<boolean>(() => readBool(storageKey('textCollapsed'), true));
  const [imagesCollapsed, setImagesCollapsed] = useState<boolean>(() => readBool(storageKey('imagesCollapsed'), true));
  const readJSON = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  const writeJSON = (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const [showImagesInPreview] = useState<boolean>(true);
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);
  const [imageFields, setImageFields] = useState<ImageField[]>([
    { id: 'firma', name: 'Firma', x: 100, y: 100, width: 80, height: 40 },
    { id: 'sello', name: 'Sello', x: 200, y: 100, width: 60, height: 60 },
    { id: 'foto', name: 'Foto del Postulante', x: 300, y: 100, width: 100, height: 120 }
  ]);
  
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [cameraForFieldId, setCameraForFieldId] = useState<string | null>(null);
  // Eliminado el cargador manual de plantilla desde el editor
  const previewUrlRef = useRef<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  // Overlay y drag eliminados

  // Carga de plantilla se hace desde el selector; se removió el cargador manual
  // Persistir estado de colapsado de secciones
  React.useEffect(() => {
    writeBool(storageKey('textCollapsed'), textFieldsCollapsed);
  }, [textFieldsCollapsed]);
  React.useEffect(() => {
    writeBool(storageKey('imagesCollapsed'), imagesCollapsed);
  }, [imagesCollapsed]);


  // Cargar bytes de plantilla si vienen desde el selector y preparar vista previa inicial
  React.useEffect(() => {
    const setupFromTemplate = async () => {
      if (templatePdfBytes) {
        try {
          setPdfBytes(templatePdfBytes);
          await loadPDFFields(templatePdfBytes);
          // Generar una vista previa inmediata con el PDF original
          try {
            const originalBlob = new Blob([new Uint8Array(templatePdfBytes)], { type: 'application/pdf' });
            const originalUrl = URL.createObjectURL(originalBlob);
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = originalUrl;
            setPdfUrl(originalUrl);
          } catch {}
        } catch (e) {
          // noop
        }
      }
    };
    setupFromTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatePdfBytes]);

  // Colocar automáticamente la foto capturada en el campo 'foto' si está disponible
  React.useEffect(() => {
    if (!capturedImage) return;
    setImageFields(prev => {
      let updated = false;
      const next = prev.map(f => {
        if (f.id === 'foto') {
          const needsUpdate = !f.imageData || f.imageData !== capturedImage;
          if (needsUpdate) {
            updated = true;
            return { ...f, imageData: capturedImage };
          }
        }
        return f;
      });
      return updated ? next : prev;
    });
  }, [capturedImage]);

  // Cargar campos del PDF con detección inteligente
  const loadPDFFields = async (bytes: Uint8Array) => {
    try {
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      setPageSize({ width, height });

      // Si hay layout predefinido por templateId, úsalo; si no, fallback relativo
      if (templateId && pdfTemplateLayouts[templateId]) {
        const layout = pdfTemplateLayouts[templateId];
        const baseEditable = layout.textFields.map(tf => ({
          id: tf.id,
          name: tf.name,
          value: tf.defaultValue ?? '',
          x: tf.x,
          y: tf.y,
          width: tf.width,
          height: tf.height,
          fontSize: tf.fontSize
        }));
        // Merge valores guardados
        const savedValues = readJSON<Record<string, string>>(storageKey('fields'), {});
        const mergedEditable = baseEditable.map(f => ({ ...f, value: savedValues[f.id] ?? f.value }));
        setEditableFields(mergedEditable);

        const layoutImages: ImageField[] = layout.imageFields.map(ifl => ({
          id: ifl.id,
          name: ifl.name,
          x: ifl.x,
          y: ifl.y,
          width: ifl.width,
          height: ifl.height
        }));
        // Inyectar foto si existe y luego aplicar guardado
        const withPhoto: ImageField[] = capturedImage
          ? layoutImages.map(f => f.id === 'foto' ? { ...f, imageData: capturedImage } : f)
          : layoutImages;
        const savedImages = readJSON<Record<string, string>>(storageKey('images'), {});
        const mergedImages = withPhoto.map(f => ({ ...f, imageData: savedImages[f.id] ?? f.imageData }));
        setImageFields(mergedImages);
      } else {
        const isA4 = width > 500 && height > 700; // A4 aproximado
        const isLetter = width > 500 && height > 650; // Letter aproximado
        let fields: EditableField[] = [];
        if (isA4 || isLetter) {
          fields = [
            { id: 'apellidos_nombres', name: '', value: '', x: width * 0.12, y: height * 0.98, width: width * 0.5, height: 20, fontSize: 11 },
            { id: 'dni', name: 'DNI', value: '', x: width * 0.12, y: height * 0.83, width: width * 0.25, height: 20, fontSize: 11 },
            { id: 'fecha_inscripcion', name: 'Fecha de inscripción', value: new Date().toLocaleDateString(), x: width * 0.55, y: height * 0.88, width: width * 0.25, height: 20, fontSize: 11 },
            { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', value: '', x: width * 0.55, y: height * 0.83, width: width * 0.25, height: 20, fontSize: 11 }
          ];
        } else {
          fields = [
            { id: 'apellidos_nombres', name: '', value: '', x: width * 0.1, y: height * 0.8, width: width * 0.55, height: 20, fontSize: 11 },
            { id: 'dni', name: 'DNI', value: '', x: width * 0.1, y: height * 0.75, width: width * 0.3, height: 20, fontSize: 11 },
            { id: 'fecha_inscripcion', name: 'Fecha de inscripción', value: new Date().toLocaleDateString(), x: width * 0.6, y: height * 0.8, width: width * 0.3, height: 20, fontSize: 11 },
            { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', value: '', x: width * 0.6, y: height * 0.75, width: width * 0.3, height: 20, fontSize: 11 }
          ];
        }
        const savedValues = readJSON<Record<string, string>>(storageKey('fields'), {});
        const mergedEditable = fields.map(f => ({ ...f, value: savedValues[f.id] ?? f.value }));
        setEditableFields(mergedEditable);
        const fallbackImages: ImageField[] = [
          { id: 'firma', name: 'Firma', x: width * 0.08, y: height * 0.15, width: width * 0.18, height: height * 0.08 },
          { id: 'sello', name: 'Sello', x: width * 0.32, y: height * 0.12, width: width * 0.12, height: width * 0.12 },
          { id: 'foto', name: 'Foto del Postulante', x: width * 0.52, y: height * 0.08, width: width * 0.22, height: height * 0.28 }
        ];
        const withPhoto: ImageField[] = capturedImage
          ? fallbackImages.map(f => f.id === 'foto' ? { ...f, imageData: capturedImage } : f)
          : fallbackImages;
        const savedImages = readJSON<Record<string, string>>(storageKey('images'), {});
        const mergedImages = withPhoto.map(f => ({ ...f, imageData: savedImages[f.id] ?? f.imageData }));
        setImageFields(mergedImages);
      }
      
    } catch (error) {
      console.error('Error loading PDF fields:', error);
    }
  };

  // Renderizado de vista previa en tiempo real cuando cambian campos o imágenes
  React.useEffect(() => {
    let timeoutId: number | undefined;

    const renderPreview = async () => {
      if (!pdfBytes) return;
      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Pintar textos con fuente estándar
        const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
        for (const field of editableFields) {
          if (field.value && field.value.trim()) {
            firstPage.drawText(field.value, {
              x: field.x,
              y: field.y,
              size: field.fontSize,
              color: rgb(0, 0, 0),
              font: helvetica
            });
          }
        }

        // Normalizar imágenes a PNG/JPEG y convertir a bytes
        const normalizeDataUrl = async (dataUrl: string): Promise<string> => {
          if (dataUrl.startsWith('data:image/png') || dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
            return dataUrl;
          }
          // Convertir otros formatos (p.ej. WEBP) a JPEG usando canvas
          return await new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const jpeg = canvas.toDataURL('image/jpeg', 0.92);
                resolve(jpeg);
              } else {
                resolve(dataUrl);
              }
            };
            img.src = dataUrl;
          });
        };
        // helpers no usados luego del recorte con canvas en preview
        const dataUrlToBytes = async (dataUrl: string): Promise<Uint8Array> => {
          const normalized = await normalizeDataUrl(dataUrl);
          const res = await fetch(normalized);
          const buf = await res.arrayBuffer();
          return new Uint8Array(buf);
        };
        // Mostrar/ocultar imágenes en la vista previa según preferencia del usuario
        if (showImagesInPreview) {
          for (const imageField of imageFields) {
            if (!imageField.imageData) continue;
            try {
              // Recortar por los costados (cover) igual que en el PDF final
              const normalized = await normalizeDataUrl(imageField.imageData);
              const cropped = await (async () => {
                return await new Promise<string>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    const srcW = img.naturalWidth;
                    const srcH = img.naturalHeight;
                    const scale = Math.max(imageField.width / srcW, imageField.height / srcH);
                    const cropW = Math.round(imageField.width / scale);
                    const cropH = Math.round(imageField.height / scale);
                    const sx = Math.max(0, Math.floor((srcW - cropW) / 2));
                    const sy = Math.max(0, Math.floor((srcH - cropH) / 2));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(imageField.width);
                    canvas.height = Math.round(imageField.height);
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
                      resolve(canvas.toDataURL('image/jpeg', 0.92));
                    } else {
                      resolve(normalized);
                    }
                  };
                  img.src = normalized;
                });
              })();
              const bytes = await dataUrlToBytes(cropped);
              let embedded: any;
              const normalizedSrc = cropped.startsWith('data:image/png') ? 'png' : 'jpeg';
              if (normalizedSrc === 'png') {
                embedded = await pdfDoc.embedPng(bytes);
              } else {
                embedded = await pdfDoc.embedJpg(bytes);
              }
              firstPage.drawImage(embedded, {
                x: imageField.x,
                y: imageField.y,
                width: imageField.width,
                height: imageField.height
              });
            } catch (e) {
              // ignorar errores individuales de imagen para no romper vista previa
            }
          }
        }

        const bytes = await pdfDoc.save();
        const copy = new Uint8Array(bytes);
        const blob = new Blob([copy], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // Revocar URL anterior
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPdfUrl(url);
      } catch (e) {
        // si falla, no romper la UI
      }
    };

    // Debounce ligero para no renderizar en cada tecla
    // @ts-ignore - setTimeout devuelve number en browsers
    timeoutId = window.setTimeout(renderPreview, 100);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [pdfBytes, editableFields, imageFields]);

  // Ajustar zoom para encajar al ancho del contenedor
  React.useEffect(() => {
    const updateScaleToFit = () => {
      if (!fitToWidth || !pageSize || !previewContainerRef.current) return;
      const containerWidth = previewContainerRef.current.clientWidth;
      if (containerWidth > 0) {
        const scale = containerWidth / pageSize.width;
        setPreviewScale(scale);
      }
    };
    updateScaleToFit();
    window.addEventListener('resize', updateScaleToFit);
    return () => window.removeEventListener('resize', updateScaleToFit);
  }, [fitToWidth, pageSize]);

  // Actualizar valor de campo
  const updateFieldValue = (fieldId: string, value: string) => {
    setEditableFields(prev => {
      const next = prev.map(field => field.id === fieldId ? { ...field, value } : field);
      // Persistir
      const asMap: Record<string, string> = {};
      next.forEach(f => { asMap[f.id] = f.value; });
      writeJSON(storageKey('fields'), asMap);
      return next;
    });
  };

  // Utilidades para campos de fecha
  const isDateField = (field: EditableField): boolean => {
    const id = field.id.toLowerCase();
    const name = field.name.toLowerCase();
    return id.includes('fecha') || name.includes('fecha');
  };

  const isNumericField = (field: EditableField): boolean => {
    const id = field.id.toLowerCase();
    const name = field.name.toLowerCase();
    // Campos solicitados: DNI, Código de archivo, Nota general, Horas de curso
    return (
      id.includes('dni') ||
      id.includes('codigo_archivo') || name.includes('código de archivo') ||
      id.includes('nota_general') || name.includes('nota general') ||
      id.includes('hora_curso') || id.includes('horas_curso') || name.includes('horas de curso')
    );
  };

  const isFieldComplete = (field: EditableField): boolean => {
    const value = (field.value || '').trim();
    if (isDateField(field)) {
      return ddmmyyyyToIso(value) !== '';
    }
    if (isNumericField(field)) {
      return value.length > 0;
    }
    return value.length > 0;
  };

  const ddmmyyyyToIso = (value: string): string => {
    // Convierte "dd/mm/yyyy" a "yyyy-mm-dd"; si no coincide, devuelve cadena vacía
    const m = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return '';
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  };

  const isoToDdmmyyyy = (iso: string): string => {
    // Convierte "yyyy-mm-dd" a "dd/mm/yyyy"
    const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const yyyy = m[1];
    const mm = m[2];
    const dd = m[3];
    return `${dd}/${mm}/${yyyy}`;
  };

  // Actualizar posición de campo
  const updateFieldPosition = (fieldId: string, x: number, y: number) => {
    setEditableFields(prev => 
      prev.map(field => 
        field.id === fieldId ? { ...field, x, y } : field
      )
    );
  };

  // Agregar campo de texto dinámicamente
  const addTextField = () => {
    setEditableFields(prev => [
      ...prev,
      {
        id: `campo_${prev.length + 1}`,
        name: 'Campo personalizado',
        value: '',
        x: 60,
        y: 60,
        width: 200,
        height: 20,
        fontSize: 11
      }
    ]);
  };

  // Eliminar campo de texto
  // (eliminado a solicitud)

  const clearAllTextFields = () => {
    setEditableFields(prev => {
      const next = prev.map(f => ({ ...f, value: '' }));
      writeJSON(storageKey('fields'), {});
      return next;
    });
  };

  // Actualizar imagen
  const updateImageField = (fieldId: string, imageData: string) => {
    setImageFields(prev => {
      const next = prev.map(field => field.id === fieldId ? { ...field, imageData } : field);
      const asMap: Record<string, string> = {};
      next.forEach(f => { if (f.imageData) asMap[f.id] = f.imageData; });
      writeJSON(storageKey('images'), asMap);
      return next;
    });
  };

  // Generar PDF final
  const generateFinalPDF = async () => {
    if (!pdfBytes) return;

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Agregar campos de texto con fuente estándar
      const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      for (const field of editableFields) {
        if (field.value.trim()) {
          firstPage.drawText(field.value, {
            x: field.x,
            y: field.y,
            size: field.fontSize,
            color: rgb(0, 0, 0),
            font: helvetica
          });
        }
      }

      // Agregar imágenes
      const normalizeDataUrl = async (dataUrl: string): Promise<string> => {
        if (dataUrl.startsWith('data:image/png') || dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
          return dataUrl;
        }
        return await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const jpeg = canvas.toDataURL('image/jpeg', 0.92);
              resolve(jpeg);
            } else {
              resolve(dataUrl);
            }
          };
          img.src = dataUrl;
        });
      };
      // helpers no usados luego del recorte con canvas
      const cropDataUrlToCover = async (dataUrl: string, dstW: number, dstH: number): Promise<string> => {
        return await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const srcW = img.naturalWidth;
            const srcH = img.naturalHeight;
            const scale = Math.max(dstW / srcW, dstH / srcH);
            const cropW = Math.round(dstW / scale);
            const cropH = Math.round(dstH / scale);
            const sx = Math.max(0, Math.floor((srcW - cropW) / 2));
            const sy = Math.max(0, Math.floor((srcH - cropH) / 2));
            const canvas = document.createElement('canvas');
            canvas.width = dstW;
            canvas.height = dstH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, dstW, dstH);
              resolve(canvas.toDataURL('image/jpeg', 0.92));
            } else {
              resolve(dataUrl);
            }
          };
          img.src = dataUrl;
        });
      };
      const dataUrlToBytes = async (dataUrl: string): Promise<Uint8Array> => {
        const normalized = await normalizeDataUrl(dataUrl);
        const res = await fetch(normalized);
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      };
      for (const imageField of imageFields) {
        if (!imageField.imageData) continue;
        try {
          const normalized = await normalizeDataUrl(imageField.imageData);
          const cropped = await cropDataUrlToCover(normalized, Math.round(imageField.width), Math.round(imageField.height));
          const bytes = await dataUrlToBytes(cropped);
          let embedded: any;
          const normalizedSrc = cropped.startsWith('data:image/png') ? 'png' : 'jpeg';
          if (normalizedSrc === 'png') {
            embedded = await pdfDoc.embedPng(bytes);
          } else {
            embedded = await pdfDoc.embedJpg(bytes);
          }
          firstPage.drawImage(embedded, {
            x: imageField.x,
            y: imageField.y,
            width: imageField.width,
            height: imageField.height
          });
        } catch (error) {
          console.error(`Error adding image ${imageField.name}:`, error);
        }
      }

      const pdfBytesFinal = await pdfDoc.save();
      onComplete(pdfBytesFinal);
    } catch (error) {
      console.error('Error generating final PDF:', error);
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Editor de Plantilla PDF</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel de Control */}
        <div className="flex flex-col max-h-[80vh]">
          <div className="space-y-6 overflow-y-auto pr-2 flex-1">
          {/* Campos de Texto */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Campos de Texto</h3>
              <div className="flex items-center gap-2">
                {!textFieldsCollapsed && (
                  <button
                    onClick={clearAllTextFields}
                    className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                    title="Borrar todo el contenido de los campos"
                  >
                    Limpiar Todo
                  </button>
                )}
                <button
                  onClick={() => setTextFieldsCollapsed(!textFieldsCollapsed)}
                  className={`px-2 py-1 text-sm rounded border ${textFieldsCollapsed ? 'bg-white border-gray-300 text-gray-700' : 'bg-orange-50 border-orange-300 text-orange-700'}`}
                >
                  {textFieldsCollapsed ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            </div>
            {!textFieldsCollapsed && (
              <>
                {(() => {
                  // Agrupar por secciones básicas
                  const groups: Record<string, EditableField[]> = {
                    'Identificación': [],
                    'Fechas': [],
                    'Curso': [],
                    'Notas': [],
                    'Otros': []
                  };
                  for (const f of editableFields) {
                    const id = f.id.toLowerCase();
                    const name = f.name.toLowerCase();
                    const isNombre = id.includes('apellidos_nombres') || name.includes('apellidos') || name.includes('nombres');
                    if (id.includes('dni') || id.includes('codigo') || isNombre) groups['Identificación'].push(f);
                    else if (isDateField(f)) groups['Fechas'].push(f);
                    else if (id.includes('curso') || name.includes('curso')) groups['Curso'].push(f);
                    else if (id.includes('nota') || name.includes('nota')) groups['Notas'].push(f);
                    else groups['Otros'].push(f);
                  }
                  const order = ['Identificación', 'Fechas', 'Curso', 'Notas', 'Otros'];
                  return (
                    <div className="space-y-5">
                      {order.map((section) => (
                        groups[section].length > 0 && (
                          <div key={section}>
                            <h4 className="mb-2">
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-orange-600 rounded">
                                {section}
                              </span>
                            </h4>
                            <div className="space-y-3">
                              {groups[section].map((field) => (
                                <div key={field.id} className="flex flex-col gap-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    {field.name}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    {isDateField(field) ? (
                                      <input
                                        type="date"
                                        value={ddmmyyyyToIso(field.value) || ''}
                                        onChange={(e) => updateFieldValue(field.id, isoToDdmmyyyy(e.target.value))}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                      />
                                    ) : isNumericField(field) ? (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={field.value}
                                        onChange={(e) => {
                                          const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                                          updateFieldValue(field.id, onlyDigits);
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder={`Ingrese ${field.name.toLowerCase()}`}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e) => updateFieldValue(field.id, e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder={`Ingrese ${field.name.toLowerCase()}`}
                                      />
                                    )}
                                    {isFieldComplete(field) ? (
                                      <span
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs"
                                        title="Campo completo"
                                      >
                                        ✓
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs"
                                        title="Campo pendiente"
                                      >
                                        ?
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => updateFieldValue(field.id, '')}
                                      className="text-xs text-gray-600 hover:text-gray-800"
                                      title="Limpiar contenido del campo"
                                    >
                                      Limpiar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  );
                })()}
                <button
                  onClick={addTextField}
                  className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  Agregar campo
                </button>
              </>
            )}
          </div>

          {/* Campos de Imagen */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Imágenes</h3>
              <button
                onClick={() => setImagesCollapsed(!imagesCollapsed)}
                className={`px-2 py-1 text-sm rounded border ${imagesCollapsed ? 'bg-white border-gray-300 text-gray-700' : 'bg-orange-50 border-orange-300 text-orange-700'}`}
              >
                {imagesCollapsed ? 'Mostrar' : 'Ocultar'}
              </button>
            </div>
            {!imagesCollapsed && (
              <div className="space-y-4">
                {imageFields.map((field) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-3 text-center">{field.name}</h4>
                    {field.id === 'foto' ? (
                      <div className="flex flex-col items-center gap-3">
                        {field.imageData ? (
                          <img 
                            src={field.imageData} 
                            alt={field.name}
                            className="w-40 h-48 object-cover border border-gray-200 rounded"
                          />
                        ) : (
                          <div className="w-40 h-48 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm">
                            Sin foto
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    updateImageField(field.id, e.target?.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Subir imagen
                          </button>
                          <button
                            onClick={() => setCameraForFieldId(field.id)}
                            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                          >
                            Tomar foto
                          </button>
                          {capturedImage && field.imageData !== capturedImage && (
                            <button
                              onClick={() => updateImageField(field.id, capturedImage as string)}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                              title="Usar la última foto tomada con la cámara"
                            >
                              Usar última captura
                            </button>
                          )}
                          {field.imageData && (
                            <button
                              onClick={() => updateImageField(field.id, '')}
                              className="px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50"
                              title="Quitar la foto actual"
                            >
                              Quitar foto
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          <p>Consejo: la foto se recorta para encajar al tamaño del documento.</p>
                          <p>Para mejores resultados, use "Tomar foto" y centre el rostro.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {field.imageData ? (
                          <img 
                            src={field.imageData} 
                            alt={field.name}
                            className="max-w-32 max-h-32 object-contain border border-gray-200 rounded"
                          />
                        ) : null}
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  updateImageField(field.id, e.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                        >
                          {field.imageData ? 'Cambiar imagen' : `Agregar ${field.name}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controles de Posicionamiento */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Posicionamiento</h3>
              <button
                onClick={() => setShowPositionEditor(!showPositionEditor)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {showPositionEditor ? 'Ocultar' : 'Ajustar Posiciones'}
              </button>
            </div>
            
            {showPositionEditor && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Los campos se posicionan automáticamente, pero puedes ajustarlos si es necesario.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {editableFields.map((field) => (
                    <div key={field.id} className="border border-gray-200 rounded p-3">
                      <h4 className="font-medium text-sm mb-2">{field.name}</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-gray-500">X:</label>
                          <input
                            type="number"
                            value={Math.round(field.x)}
                            onChange={(e) => updateFieldPosition(field.id, parseFloat(e.target.value) || 0, field.y)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500">Y:</label>
                          <input
                            type="number"
                            value={Math.round(field.y)}
                            onChange={(e) => updateFieldPosition(field.id, field.x, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Botón Generar PDF (fijo fuera del scroll) */}
          <div className="pt-4">
            <button
              onClick={generateFinalPDF}
              disabled={!pdfBytes}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Generar PDF Final
            </button>
          </div>
        </div>

        {/* Preview del PDF con zoom y overlay draggable */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">{templateTitle || 'Vista Previa'}</h3>
            <div className="text-sm text-gray-500">Editor de Plantilla PDF</div>
          </div>
          {pdfUrl && pageSize ? (
            <div
              ref={previewContainerRef}
              className="relative overflow-auto border border-gray-200 rounded"
              style={{
                width: '100%',
                maxHeight: '88vh'
              }}
            >
              {/* PDF */}
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`}
                className="block"
                style={{
                  width: simplePreview ? '100%' : pageSize.width * previewScale,
                  height: simplePreview ? '88vh' : pageSize.height * previewScale,
                }}
                title="PDF Preview"
              />

              {/* Overlay eliminado */}
            </div>
          ) : (
            <div className="w-full h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Carga un PDF para ver la vista previa</p>
            </div>
          )}
        </div>
      </div>

      {cameraForFieldId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-60" onClick={() => setCameraForFieldId(null)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">Tomar foto</h4>
              <button
                onClick={() => setCameraForFieldId(null)}
                className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
            <WebcamCapture
              isProcessing={false}
              onImageCapture={(img) => {
                if (cameraForFieldId) {
                  updateImageField(cameraForFieldId, img);
                }
                setCameraForFieldId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFTemplateEditor;
