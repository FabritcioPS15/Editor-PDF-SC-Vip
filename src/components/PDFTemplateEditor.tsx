import React, { useState, useRef, useCallback, useEffect } from 'react';
import WebcamCapture from './WebcamCapture';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pdfTemplateLayouts } from '../utils/pdfTemplateLayouts';
import { Upload, Camera, X } from 'lucide-react';

interface PDFTemplateEditorProps {
  onBack: () => void;
  onComplete: (editedPdfBytes: Uint8Array, formData?: { apellidos?: string; nombres?: string }) => void;
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
  capturedImage: propCapturedImage, // Renombrado para evitar conflicto
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
  
  const readBool = useCallback((key: string, fallback: boolean) => {
    try {
      const v = localStorage.getItem(key);
      if (v === '1') return true;
      if (v === '0') return false;
      return fallback;
    } catch {
      return fallback;
    }
  }, []);

  const writeBool = useCallback((key: string, value: boolean) => {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch {}
  }, []);

  const [textFieldsCollapsed, setTextFieldsCollapsed] = useState<boolean>(() => 
    readBool(storageKey('textCollapsed'), true)
  );
  const [imagesCollapsed, setImagesCollapsed] = useState<boolean>(() => 
    readBool(storageKey('imagesCollapsed'), true)
  );

  const readJSON = useCallback(<T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, []);

  const writeJSON = useCallback((key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, []);

  const [showImagesInPreview] = useState<boolean>(true);
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);
  const [imageFields, setImageFields] = useState<ImageField[]>([]);
  
  const [imageSourceModal, setImageSourceModal] = useState<{open: boolean, fieldId: string | null}>({open: false, fieldId: null});
  const [imageSourceType, setImageSourceType] = useState<'camera' | 'upload'>('camera');
  const [localCapturedImage, setLocalCapturedImage] = useState<string | null>(null); // Renombrado
  
  const previewUrlRef = useRef<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Persistir estado de colapsado de secciones
  useEffect(() => {
    writeBool(storageKey('textCollapsed'), textFieldsCollapsed);
  }, [textFieldsCollapsed, writeBool]);

  useEffect(() => {
    writeBool(storageKey('imagesCollapsed'), imagesCollapsed);
  }, [imagesCollapsed, writeBool]);

  // Inicializar campos de imagen por defecto
  useEffect(() => {
    const defaultImageFields: ImageField[] = [
      { id: 'firma', name: 'Firma', x: 100, y: 100, width: 80, height: 40 },
      { id: 'sello', name: 'Sello', x: 200, y: 100, width: 60, height: 60 },
      { id: 'foto', name: 'Foto del Postulante', x: 300, y: 100, width: 100, height: 120 }
    ];
    
    // Cargar imágenes guardadas o usar valores por defecto
    const savedImages = readJSON<Record<string, string>>(storageKey('images'), {});
    const mergedImages = defaultImageFields.map(field => ({
      ...field,
      imageData: savedImages[field.id] || field.imageData
    }));
    
    setImageFields(mergedImages);
  }, [readJSON]);

  // Cargar bytes de plantilla si vienen desde el selector y preparar vista previa inicial
  useEffect(() => {
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
          } catch (error) {
            console.error('Error creating preview URL:', error);
          }
        } catch (e) {
          console.error('Error setting up template:', e);
        }
      } else {
        // Si no hay templatePdfBytes, limpiar todos los campos
        setEditableFields([]);
        setImageFields([]);
        setPdfBytes(null);
        setPdfUrl('');
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      }
    };
    setupFromTemplate();
  }, [templatePdfBytes]);

  // Colocar automáticamente la foto capturada desde las props en el campo 'foto'
  useEffect(() => {
    if (!propCapturedImage) return;
    
    setImageFields(prev => {
      let updated = false;
      const next = prev.map(f => {
        if (f.id === 'foto') {
          const needsUpdate = !f.imageData || f.imageData !== propCapturedImage;
          if (needsUpdate) {
            updated = true;
            return { ...f, imageData: propCapturedImage };
          }
        }
        return f;
      });
      return updated ? next : prev;
    });
  }, [propCapturedImage]);

  // Abrir modal para seleccionar fuente de imagen
  const openImageSourceModal = (fieldId: string) => {
    setImageSourceModal({open: true, fieldId});
    setLocalCapturedImage(null);
  };

  // Cerrar modal
  const closeImageSourceModal = () => {
    setImageSourceModal({open: false, fieldId: null});
    setLocalCapturedImage(null);
  };

  // Manejar imagen capturada desde la cámara
  const handleImageCaptured = (imageData: string) => {
    setLocalCapturedImage(imageData);
  };

  // Confirmar el uso de la imagen capturada
  const confirmImage = () => {
    if (localCapturedImage && imageSourceModal.fieldId) {
      updateImageField(imageSourceModal.fieldId, localCapturedImage);
      closeImageSourceModal();
    }
  };

  // Manejador para cargar imagen desde archivo
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      if (imageData && imageSourceModal.fieldId) {
        updateImageField(imageSourceModal.fieldId, imageData);
        closeImageSourceModal();
      }
    };
    reader.onerror = () => {
      console.error('Error reading file');
    };
    reader.readAsDataURL(file);
    
    // Resetear el input para permitir cargar el mismo archivo de nuevo
    e.target.value = '';
  }, [imageSourceModal.fieldId]);

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
        const withPhoto: ImageField[] = propCapturedImage
          ? layoutImages.map(f => f.id === 'foto' ? { ...f, imageData: propCapturedImage } : f)
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
            { id: 'apellidos_nombres', name: 'Apellidos y Nombres', value: '', x: width * 0.12, y: height * 0.98, width: width * 0.5, height: 20, fontSize: 11 },
            { id: 'dni', name: 'DNI', value: '', x: width * 0.12, y: height * 0.83, width: width * 0.25, height: 20, fontSize: 11 },
            { id: 'fecha_inscripcion', name: 'Fecha de inscripción', value: new Date().toLocaleDateString(), x: width * 0.55, y: height * 0.88, width: width * 0.25, height: 20, fontSize: 11 },
            { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', value: '', x: width * 0.55, y: height * 0.83, width: width * 0.25, height: 20, fontSize: 11 }
          ];
        } else {
          fields = [
            { id: 'apellidos_nombres', name: 'Apellidos y Nombres', value: '', x: width * 0.1, y: height * 0.8, width: width * 0.55, height: 20, fontSize: 11 },
            { id: 'dni', name: 'DNI', value: '', x: width * 0.1, y: height * 0.75, width: width * 0.3, height: 20, fontSize: 11 },
            { id: 'fecha_inscripcion', name: 'Fecha de inscripción', value: new Date().toLocaleDateString(), x: width * 0.6, y: height * 0.8, width: width * 0.3, height: 20, fontSize: 11 },
            { id: 'fecha_nacimiento', name: 'Fecha de nacimiento', value: '', x: width * 0.6, y: height * 0.75, width: width * 0.3, height: 20, fontSize: 11 }
          ];
        }
        const savedValues = readJSON<Record<string, string>>(storageKey('fields'), {});
        const mergedEditable = fields.map(f => ({ ...f, value: savedValues[f.id] ?? f.value }));
        setEditableFields(mergedEditable);
      }
      
    } catch (error) {
      console.error('Error loading PDF fields:', error);
    }
  };

  // Normalizar Data URL de imagen
  const normalizeDataUrl = async (dataUrl: string): Promise<string> => {
    if (dataUrl.startsWith('data:image/png') || dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
      return dataUrl;
    }
    // Convertir otros formatos (p.ej. WEBP) a JPEG usando canvas
    return await new Promise<string>((resolve, reject) => {
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
          reject(new Error('Could not get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  };

  // Convertir Data URL a bytes
  const dataUrlToBytes = async (dataUrl: string): Promise<Uint8Array> => {
    const normalized = await normalizeDataUrl(dataUrl);
    const res = await fetch(normalized);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  };

  // Recortar imagen para que encaje (cover)
  const cropDataUrlToCover = async (dataUrl: string, dstW: number, dstH: number): Promise<string> => {
    return await new Promise<string>((resolve, reject) => {
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
        canvas.width = Math.round(dstW);
        canvas.height = Math.round(dstH);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = dataUrl;
    });
  };

  // Renderizado de vista previa en tiempo real cuando cambian campos o imágenes
  useEffect(() => {
    let timeoutId: number | undefined;

    const renderPreview = async () => {
      if (!pdfBytes) {
        console.log('No hay pdfBytes para renderizar previsualización');
        return;
      }
      
      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Pintar textos con fuente Arial
        const arial = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
        for (const field of editableFields) {
          if (field.value.trim()) {
            firstPage.drawText(field.value, {
              x: field.x,
              y: field.y,
              size: field.fontSize,
              color: rgb(0, 0, 0),
              font: arial
            });
          }
        }

        // Mostrar/ocultar imágenes en la vista previa según preferencia del usuario
        if (showImagesInPreview) {
          for (const imageField of imageFields) {
            if (!imageField.imageData) continue;
            try {
              // Recortar por los costados (cover) igual que en el PDF final
              const cropped = await cropDataUrlToCover(
                imageField.imageData, 
                Math.round(imageField.width), 
                Math.round(imageField.height)
              );
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
              console.warn(`Error processing image ${imageField.name}:`, e);
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
        console.error('Error rendering preview:', e);
      }
    };

    // Debounce ligero para no renderizar en cada tecla
    timeoutId = window.setTimeout(renderPreview, 100);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [pdfBytes, editableFields, imageFields, showImagesInPreview]);

  // Ajustar zoom para encajar al ancho del contenedor
  useEffect(() => {
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
  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setEditableFields(prev => {
      const next = prev.map(field => field.id === fieldId ? { ...field, value } : field);
      // Persistir
      const asMap: Record<string, string> = {};
      next.forEach(f => { asMap[f.id] = f.value; });
      writeJSON(storageKey('fields'), asMap);
      return next;
    });
  }, [writeJSON]);

  // Actualizar imagen
  const updateImageField = useCallback((fieldId: string, imageData: string) => {
    setImageFields(prev => {
      const next = prev.map(field => field.id === fieldId ? { ...field, imageData } : field);
      const asMap: Record<string, string> = {};
      next.forEach(f => { if (f.imageData) asMap[f.id] = f.imageData; });
      writeJSON(storageKey('images'), asMap);
      return next;
    });
  }, [writeJSON]);

  // Utilidades para campos de fecha
  const isDateField = (field: EditableField): boolean => {
    const id = field.id.toLowerCase();
    const name = field.name.toLowerCase();
    return id.includes('fecha') || name.includes('fecha');
  };

  const isNumericField = (field: EditableField): boolean => {
    const id = field.id.toLowerCase();
    const name = field.name.toLowerCase();
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
    const m = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return '';
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  };

  const isoToDdmmyyyy = (iso: string): string => {
    const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const yyyy = m[1];
    const mm = m[2];
    const dd = m[3];
    return `${dd}/${mm}/${yyyy}`;
  };

  // Limpiar todos los campos de texto
  const clearAllTextFields = () => {
    setEditableFields(prev => {
      const next = prev.map(f => ({ ...f, value: '' }));
      writeJSON(storageKey('fields'), {});
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

      // Agregar campos de texto con fuente Arial
      const arial = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      for (const field of editableFields) {
        if (field.value.trim()) {
          firstPage.drawText(field.value, {
            x: field.x,
            y: field.y,
            size: field.fontSize,
            color: rgb(0, 0, 0),
            font: arial
          });
        }
      }

      // Agregar imágenes
      for (const imageField of imageFields) {
        if (!imageField.imageData) continue;
        try {
          const cropped = await cropDataUrlToCover(
            imageField.imageData, 
            Math.round(imageField.width), 
            Math.round(imageField.height)
          );
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
      
      // Extraer datos del formulario para el nombre del archivo
      const apellidosNombresField = editableFields.find((f: EditableField) => f.id === 'apellidos_nombres');
      
      // Separar apellidos y nombres del campo combinado
      const fullName = apellidosNombresField?.value || '';
      const nameParts = fullName.trim().split(/\s+/);
      const apellidos = nameParts.length > 1 ? nameParts[0] : '';
      const nombres = nameParts.length > 1 ? nameParts.slice(1).join(' ') : fullName;
      
      const formData = {
        apellidos: apellidos,
        nombres: nombres
      };
      
      onComplete(pdfBytesFinal, formData);
    } catch (error) {
      console.error('Error generating final PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    }
  };

  // Limpiar URLs al desmontar el componente
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Editor de Plantilla PDF</h1>
          </div>
          <p className="text-gray-600 text-lg">Rellena los campos y personaliza tu documento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
        {/* Panel de Control */}
        <div className="space-y-4 lg:order-2 lg:px-4">
          {/* Botón Volver */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Selector
          </button>

          {/* Campos de Texto */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Campos de Texto
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {editableFields.filter(isFieldComplete).length} / {editableFields.length}
                  </span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ 
                        width: `${editableFields.length > 0 ? (editableFields.filter(isFieldComplete).length / editableFields.length) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTextFieldsCollapsed(!textFieldsCollapsed)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={textFieldsCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
                {textFieldsCollapsed ? 'Mostrar' : 'Ocultar'}
              </button>
            </div>
            
            {!textFieldsCollapsed && (
              <div className="space-y-4">
                {editableFields.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No hay campos de texto disponibles</p>
                  </div>
                ) : (
                  <>
                    {editableFields.map((field) => (
                      <div key={field.id} className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <label className="text-base font-semibold text-gray-800 block">
                          {field.name || field.id}
                        </label>
                        <div className="flex items-center gap-2">
                          {isDateField(field) ? (
                            <input
                              type="date"
                              value={ddmmyyyyToIso(field.value) || ''}
                              onChange={(e) => updateFieldValue(field.id, isoToDdmmyyyy(e.target.value))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                          ) : isNumericField(field) ? (
                            <input
                              type="number"
                              value={field.value}
                              onChange={(e) => {
                                const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                                updateFieldValue(field.id, onlyDigits);
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder={field.name}
                            />
                          ) : (
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateFieldValue(field.id, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder={field.name}
                            />
                          )}
                          {isFieldComplete(field) ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">Completo</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-500">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">Pendiente</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={clearAllTextFields}
                      className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                    >
                      Limpiar Todos los Campos
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Campos de Imagen */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Imágenes
              </h3>
              <button
                onClick={() => setImagesCollapsed(!imagesCollapsed)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={imagesCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
                {imagesCollapsed ? 'Mostrar' : 'Ocultar'}
              </button>
            </div>
            
            {propCapturedImage && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Foto capturada automáticamente integrada
              </div>
            )}
            
            {!imagesCollapsed && (
              <div className="space-y-4">
                {imageFields.map((field) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-700 mb-3 text-base">{field.name}</h4>
                    {field.imageData ? (
                      <div className="mb-3">
                        <img 
                          src={field.imageData} 
                          alt={field.name}
                          className="w-full max-h-32 object-cover border border-gray-200 rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-3">
                        Sin imagen
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openImageSourceModal(field.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Agregar Imagen
                      </button>
                      {field.imageData && (
                        <button
                          onClick={() => updateImageField(field.id, '')}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón Generar PDF */}
          <button
            onClick={generateFinalPDF}
            disabled={!pdfBytes}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
          >
            Generar PDF Final
          </button>
        </div>

        {/* Preview del PDF */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:order-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {templateTitle || 'Vista Previa'}
            </h3>
          </div>
          
          {pdfUrl && pageSize ? (
            <div ref={previewContainerRef} className="relative overflow-auto bg-gray-100 rounded-lg border border-gray-300">
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
                className="block w-full h-[70vh]"
                title="PDF Preview"
                onLoad={() => console.log('Iframe PDF cargado exitosamente')}
                onError={() => console.log('Error cargando PDF en iframe')}
              />
            </div>
          ) : (
            <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
              <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-sm">Selecciona una plantilla PDF para ver la vista previa</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para selección de fuente de imagen */}
      {imageSourceModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Agregar imagen</h3>
              <button 
                onClick={closeImageSourceModal} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {!localCapturedImage ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Seleccione una opción:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setImageSourceType('camera')}
                      className={`p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors ${
                        imageSourceType === 'camera' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Camera className="w-8 h-8 text-blue-600" />
                      <span>Tomar foto</span>
                    </button>
                    <label
                      className={`p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors ${
                        imageSourceType === 'upload' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Upload className="w-8 h-8 text-blue-600" />
                      <span>Subir imagen</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                </div>
                
                {imageSourceType === 'camera' && (
                  <div className="mt-4">
                    <WebcamCapture 
                      onImageCapture={handleImageCaptured}
                      isProcessing={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={localCapturedImage} 
                    alt="Capturada" 
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setLocalCapturedImage(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Volver a tomar
                  </button>
                  <button
                    onClick={confirmImage}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Usar esta imagen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFTemplateEditor;