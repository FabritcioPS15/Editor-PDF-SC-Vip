import { useState, useCallback } from 'react';
import { Download, Printer, FileText, CheckCircle, AlertCircle, Menu } from 'lucide-react';
import PDFPreview from './components/PDFPreview';
import PDFTemplateEditor from './components/PDFTemplateEditor';
import PDFTemplateSelector from './components/PDFTemplateSelector';
import ConstanciaUploader from './components/ConstanciaUploader';
import Sidebar from './components/Sidebar';

interface AppState {
  step: 'upload' | 'capture' | 'preview' | 'complete' | 'pdf-template' | 'pdf-template-select' | 'constancia-upload';
  pdfFile: File | null;
  pdfArrayBuffer: ArrayBuffer | null;
  capturedImage: string | null;
  processedPDF: Uint8Array | null;
  templatePdfBytes: Uint8Array | null;
  selectedPDFTemplate: any | null;
  formData: { apellidos?: string; nombres?: string } | null;
  uploadedConstanciaPDF: File | null;
  showDownloadConfirmation: boolean;
  showPrintConfirmation: boolean;
  isProcessing: boolean;
  constanciaLoaded: boolean;
  error: string | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

function App() {
  const [state, setState] = useState<AppState>({
    step: 'pdf-template-select',
    pdfFile: null,
    pdfArrayBuffer: null,
    capturedImage: null,
    processedPDF: null,
    templatePdfBytes: null,
    selectedPDFTemplate: null,
    formData: null,
    uploadedConstanciaPDF: null,
    showDownloadConfirmation: false,
    showPrintConfirmation: false,
    isProcessing: false,
    constanciaLoaded: false,
    error: null,
    sidebarOpen: false,
    sidebarCollapsed: false,
  });


  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const handleNavigate = useCallback((step: string) => {
    setState(prev => ({ ...prev, step: step as any, sidebarOpen: false }));
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  // Allow changing the captured image before any processing begins
  const updateCapturedImageIfAllowed = useCallback((imageDataUrl: string) => {
    setState(prev => {
      const processingStarted = !!prev.processedPDF || prev.isProcessing || prev.constanciaLoaded;
      if (processingStarted) {
        return {
          ...prev,
          error: 'No se puede cambiar la foto después de iniciar el proceso. Reinicia para reemplazarla.'
        };
      }
      // Siempre reemplazar la foto anterior con la nueva
      return { ...prev, capturedImage: imageDataUrl, error: null };
    });
  }, []);

  const downloadPdfBytes = useCallback((bytes: Uint8Array, withPhoto: boolean) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let fileName = 'Documento';
    if (state.formData?.apellidos && state.formData?.nombres) {
      fileName = `${state.formData.apellidos} ${state.formData.nombres}${withPhoto ? '(Con foto)' : ''}`;
    } else if (state.formData?.apellidos) {
      fileName = `${state.formData.apellidos}${withPhoto ? '(Con foto)' : ''}`;
    } else if (state.formData?.nombres) {
      fileName = `${state.formData.nombres}${withPhoto ? '(Con foto)' : ''}`;
    } else {
      fileName = withPhoto ? 'Documento(Con foto)' : 'Documento';
    }
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state.formData]);

  const openPdfInNewTab = useCallback((bytes: Uint8Array) => {
    try {
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        // Fallback: if popup blocked, trigger a download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'VistaPrevia.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      // No revocar inmediatamente para no romper la pestaña abierta
      // El navegador liberará el objeto al cerrar la pestaña.
    } catch (_) {}
  }, []);


  const handleDownload = useCallback(() => {
    if (!state.processedPDF) return;

    const copy = new Uint8Array(state.processedPDF);
    const blob = new Blob([copy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generar nombre del archivo basado en los datos del formulario
    let fileName = 'Documento';
    if (state.formData?.apellidos && state.formData?.nombres) {
      fileName = `${state.formData.apellidos} ${state.formData.nombres}(Con foto)`;
    } else if (state.formData?.apellidos) {
      fileName = `${state.formData.apellidos}(Con foto)`;
    } else if (state.formData?.nombres) {
      fileName = `${state.formData.nombres}(Con foto)`;
    } else {
      fileName = 'Documento(Con foto)';
    }
    
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state.processedPDF, state.formData]);

  const handleDownloadWithConfirmation = useCallback(() => {
    setState(prev => ({ ...prev, showDownloadConfirmation: true }));
  }, []);

  const confirmDownload = useCallback(() => {
    handleDownload();
    setState(prev => ({ ...prev, showDownloadConfirmation: false }));
  }, [handleDownload]);

  const handlePrintWithConfirmation = useCallback(() => {
    setState(prev => ({ ...prev, showPrintConfirmation: true }));
  }, []);

  const confirmPrint = useCallback(() => {
    if (state.processedPDF) {
      const copy = new Uint8Array(state.processedPDF);
      const blob = new Blob([copy], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Abrir en nueva ventana para imprimir
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          // No cerrar automáticamente - dejar que el usuario decida
        };
      } else {
        // Si no se puede abrir ventana nueva, usar iframe como fallback
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.print();
          // No cerrar automáticamente - dejar que el usuario decida
        };
      }
    }
    setState(prev => ({ ...prev, showPrintConfirmation: false }));
  }, [state.processedPDF]);


  const handleConstanciaPDFUpload = useCallback(async (file: File) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      
      // Verificar que sea un PDF
      if (file.type !== 'application/pdf') {
        throw new Error('El archivo no es un PDF válido');
      }
      
      // Leer el archivo PDF
      const arrayBuffer = await file.arrayBuffer();
      
      // Primero intentar cargar el PDF sin modificar para verificar que es válido
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Procesar el PDF con la foto insertada
      if (state.capturedImage) {
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        try {
          // Convertir la imagen capturada a formato compatible
          
          const imageResponse = await fetch(state.capturedImage);
          if (!imageResponse.ok) {
            throw new Error('Error al cargar la imagen capturada');
          }
          const imageBytes = await imageResponse.arrayBuffer();
          
          // Verificar que la imagen no esté vacía
          if (imageBytes.byteLength === 0) {
            throw new Error('La imagen capturada está vacía');
          }
          
          // Intentar embed como PNG primero, luego como JPEG si falla
          let image;
          try {
            // Verificar si es PNG o JPEG basado en los primeros bytes
            const uint8Array = new Uint8Array(imageBytes);
            const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47;
            const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;
            
            
            if (isPNG) {
              image = await pdfDoc.embedPng(imageBytes);
            } else if (isJPEG) {
              image = await pdfDoc.embedJpg(imageBytes);
            } else {
              // Si no se puede determinar, intentar PNG primero
              try {
                image = await pdfDoc.embedPng(imageBytes);
              } catch (pngError) {
                image = await pdfDoc.embedJpg(imageBytes);
              }
            }
          } catch (embedError) {
            console.error('Error embebiendo imagen:', embedError);
            throw new Error('No se pudo procesar la imagen capturada');
          }
          
          // Obtener las dimensiones de la página para posicionar correctamente
          const pageWidth = firstPage.getWidth();
          const pageHeight = firstPage.getHeight();
          
          // Insertar la imagen en el PDF manteniendo la proporción original
          // Obtener las dimensiones originales de la imagen
          const originalWidth = image.width;
          const originalHeight = image.height;
          
          // Calcular el factor de escala para que la imagen sea más grande pero mantenga proporción
          const maxWidth = 120;  // Ancho máximo deseado
          const maxHeight = 120; // Alto máximo deseado
          
          const scaleX = maxWidth / originalWidth;
          const scaleY = maxHeight / originalHeight;
          const scale = Math.min(scaleX, scaleY); // Usar el menor para mantener proporción
          
          const imageWidth = originalWidth * scale;
          const imageHeight = originalHeight * scale;
          
          // Posicionar más a la derecha (esquina superior derecha)
          const x = pageWidth - imageWidth - 80; // 50 puntos desde el borde derecho
          const y = pageHeight - imageHeight - 114; // 100 puntos desde la parte superior
          
          
          firstPage.drawImage(image, {
            x: x,
            y: y,
            width: imageWidth,
            height: imageHeight,
          });
          
          // Guardar el PDF modificado
          const modifiedPdfBytes = await pdfDoc.save();
          
          setState(prev => ({
            ...prev,
            uploadedConstanciaPDF: file,
            pdfArrayBuffer: modifiedPdfBytes.buffer as ArrayBuffer,
            isProcessing: false,
            constanciaLoaded: true,
            error: null,
          }));
          // Abrir automáticamente una nueva ventana con la vista previa
          try {
            openPdfInNewTab(new Uint8Array(modifiedPdfBytes));
          } catch (_) {}
        } catch (imageError) {
          // Si hay error con la imagen, guardar el PDF original
          setState(prev => ({
            ...prev,
            uploadedConstanciaPDF: file,
            pdfArrayBuffer: arrayBuffer,
            isProcessing: false,
            constanciaLoaded: true,
            error: null,
          }));
          // Abrir automáticamente el PDF original (sin foto) como fallback
          try {
            openPdfInNewTab(new Uint8Array(arrayBuffer));
          } catch (_) {}
        }
      } else {
        // Si no hay imagen capturada, guardar el PDF original
        setState(prev => ({
          ...prev,
          uploadedConstanciaPDF: file,
          pdfArrayBuffer: arrayBuffer,
          isProcessing: false,
          constanciaLoaded: true,
          error: null,
        }));
        // Abrir automáticamente el PDF original
        try {
          openPdfInNewTab(new Uint8Array(arrayBuffer));
        } catch (_) {}
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Error al procesar el PDF de constancia: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      }));
    }
  }, [state.capturedImage]);


  // Reset completo - para procesar otro alumno o nueva constancia
  const resetAllData = useCallback(() => {
    // Limpiar localStorage si es necesario
    try {
      localStorage.removeItem('pdfEditor:default:textCollapsed');
      localStorage.removeItem('pdfEditor:default:imagesCollapsed');
      localStorage.removeItem('pdfEditor:default:textFields');
      localStorage.removeItem('pdfEditor:default:imageFields');
      localStorage.removeItem('pdfEditor:default:editableFields');
      localStorage.removeItem('pdfEditor:default:imageFields');
      
      // Limpiar todos los datos del editor de plantillas
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('pdfEditor:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Error silencioso al limpiar localStorage
    }
    
    setState({
      step: 'pdf-template-select',
      pdfFile: null,
      pdfArrayBuffer: null,
      capturedImage: null,
      processedPDF: null,
      templatePdfBytes: null,
      selectedPDFTemplate: null,
      formData: null,
      uploadedConstanciaPDF: null,
      showDownloadConfirmation: false,
      showPrintConfirmation: false,
      isProcessing: false,
      constanciaLoaded: false,
      error: null,
      sidebarOpen: false,
      sidebarCollapsed: false,
    });
  }, []);

  // Reset parcial - solo volver al inicio sin limpiar datos del formulario
  const resetProcess = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'pdf-template-select',
      error: null,
    }));
  }, []);



  const handlePDFTemplateSelect = useCallback(async (template: any, capturedImage?: string) => {
    try {
      // Cargar la plantilla PDF (rutas públicas desde /public se sirven desde /)
      const url = encodeURI(template.template);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al cargar plantilla: ${url}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('pdf')) {
        // Aun si el header no es correcto, intentamos leer bytes pero validamos el header %PDF-
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Validar header %PDF-
      const header = String.fromCharCode(...bytes.slice(0, 5));
      if (header !== '%PDF-') {
        throw new Error('Archivo cargado no parece ser un PDF válido (faltante %PDF-)');
      }
      
      setState(prev => ({
        ...prev,
        selectedPDFTemplate: template,
        templatePdfBytes: bytes,
        capturedImage: capturedImage || null,
        step: 'pdf-template',
        error: null,
      }));
    } catch (error) {
      console.error('Error loading PDF template:', error);
      setState(prev => ({
        ...prev,
        error: 'Error al cargar la plantilla PDF. Verifica el nombre del archivo y la ruta en /public/pdf-templates/index.json.',
      }));
    }
  }, []);


  const handlePDFTemplateComplete = useCallback((editedPdfBytes: Uint8Array, formData?: { apellidos?: string; nombres?: string }) => {
    setState(prev => ({
      ...prev,
      processedPDF: editedPdfBytes,
      formData: formData || null,
      step: 'preview',
      error: null,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      const current = prev.step;
      if (current === 'pdf-template-select') return prev;
      if (current === 'pdf-template') return { ...prev, step: 'pdf-template-select', capturedImage: prev.capturedImage };
      if (current === 'preview') {
        if (prev.selectedPDFTemplate) return { ...prev, step: 'pdf-template', capturedImage: prev.capturedImage };
        return { ...prev, step: 'pdf-template', capturedImage: prev.capturedImage };
      }
      if (current === 'complete') {
        if (prev.processedPDF) return { ...prev, step: 'preview' };
        return { ...prev, step: 'pdf-template-select' };
      }
      if (current === 'constancia-upload') return { ...prev, step: 'complete' };
      return prev;
    });
  }, []);

  const getStepperConfig = () => {
    // Flujo principal: Seleccionar PDF (con captura de foto) -> Previsualizar -> Completado -> Cargar Constancia
    const baseLabels = ['Seleccionar Plantilla PDF', 'Previsualizar', 'Completado', 'Cargar Constancia'];
    const baseMap = { 
      'pdf-template-select': 1, 
      'pdf-template': 1,
      'preview': 2, 
      'complete': 3,
      'constancia-upload': 4
    } as Record<string, number>;

    // Si se ha cargado la constancia, agregar un paso adicional
    if (state.constanciaLoaded) {
      return {
        labels: ['Seleccionar Plantilla PDF', 'Previsualizar', 'Completado', 'Cargar Constancia', 'Constancia cargada'],
        map: { 
          'pdf-template-select': 1, 
          'pdf-template': 1,
          'preview': 2, 
          'complete': 3,
          'constancia-upload': 4,
          'constancia-loaded': 5
        } as Record<string, number>
      };
    }

    return {
      labels: baseLabels,
      map: baseMap
    };
  };

  const getCurrentSectionTitle = () => {
    switch (state.step) {
      case 'pdf-template-select':
        return 'Seleccionar Plantilla PDF';
      case 'pdf-template':
        return 'Editor de Plantilla PDF';
      case 'preview':
        return 'Previsualización del Resultado';
      case 'complete':
        return 'Proceso Completado';
      case 'constancia-upload':
        return 'Cargar Constancia';
      default:
        return 'Editor PDF con Webcam';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={state.sidebarOpen}
        onToggle={toggleSidebar}
        currentStep={state.step}
        onNavigate={handleNavigate}
        onReset={resetAllData}
        onDownload={handleDownload}
        hasProcessedPDF={!!state.processedPDF}
        hasCapturedImage={!!state.capturedImage}
        isCollapsed={state.sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        capturedImage={state.capturedImage}
        onImageCapture={(imageDataUrl) => {
          updateCapturedImageIfAllowed(imageDataUrl);
          // Navegar a la pantalla principal de "Tomar Fotografía" para mostrar la previsualización
          setState(prev => ({ ...prev, step: 'pdf-template-select' }));
        }}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${state.sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className={`max-w-screen-2xl mx-auto ${state.sidebarCollapsed ? 'px-2 sm:px-4 lg:px-4' : 'px-4 sm:px-4 lg:px-8'} py-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {getCurrentSectionTitle()}
                  </h1>
                  <p className="text-sm text-gray-600 hidden sm:block">
                    Editor PDF con Webcam
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Paso {getStepperConfig().map[state.step] || 1} de {getStepperConfig().labels.length}</span>
              </div>
            </div>
          </div>
        </header>

      {/* Progress Indicator */}
  <div className={`w-full ${state.sidebarCollapsed ? 'px-2 sm:px-4 lg:px-6' : 'px-4 sm:px-6 lg:px-8'} py-6 xl:py-8`}>
        {/* Botón Volver y Línea de Tiempo */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 xl:mb-8 gap-4">
          {/* Botón Volver a la izquierda */}
          <div className="flex-shrink-0 order-2 sm:order-1">
            {state.step !== 'pdf-template-select' && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Volver</span>
            </button>
            )}
          </div>
          
          {/* Línea de tiempo centrada */}
          <div className="flex-1 flex justify-center order-1 sm:order-2 w-full sm:w-auto">
          {(() => {
            const { labels, map } = getStepperConfig();
            const current = map[state.step] || 1;
            const lastIndex = labels.length - 1;
            return labels.map((label, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === current;
              // Si estamos en 'complete' y se ha cargado la constancia, marcar el último paso como completado
              const isCompleted = stepNum < current || (state.step === 'complete' && state.constanciaLoaded && stepNum === labels.length);

              return (
                <div key={label} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center min-w-0">
                    <div className={`
                      w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold
                      ${isCompleted ? 'bg-yellow-500 text-black' : 
                        isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}
                      transition-all duration-300
                    `}>
                      {isCompleted ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : stepNum}
                    </div>
                    <span className={`
                      mt-1 sm:mt-2 text-xs font-medium text-center px-1
                      ${isActive ? 'text-orange-600' : isCompleted ? 'text-yellow-600' : 'text-gray-500'}
                      hidden sm:block
                    `}>
                      {label}
                    </span>
                    <span className={`
                      mt-1 text-xs font-medium text-center px-1
                      ${isActive ? 'text-orange-600' : isCompleted ? 'text-yellow-600' : 'text-gray-500'}
                      block sm:hidden
                    `}>
                      {label.split(' ')[0]}
                    </span>
                  </div>
                  {index < lastIndex && (
                    <div className={`
                      flex-1 h-0.5 mx-2 sm:mx-4
                      ${isCompleted ? 'bg-yellow-500' : 'bg-gray-200'}
                      transition-all duration-300
                    `} />
                  )}
                </div>
              );
            });
          })()}
          </div>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{state.error}</p>
            <button
              onClick={() => setState(prev => ({ ...prev, error: null }))}
              className="ml-auto text-red-500 hover:text-red-700 transition-colors"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {state.step === 'pdf-template-select' && (
            <div className="p-6 xl:p-8 w-full">
              <PDFTemplateSelector
                onTemplateSelect={handlePDFTemplateSelect}
                initialCapturedImage={state.capturedImage || undefined}
                onImageCapture={updateCapturedImageIfAllowed}
              />
            </div>
          )}


          {state.step === 'preview' && state.processedPDF && (
            <div className="p-6 xl:p-8 w-full">
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Previsualización del Resultado</h2>
                <p className="text-gray-600 text-sm">Revisa el documento con la foto insertada antes de descargar</p>
              </div>
              <div className="mb-6">
                <PDFPreview pdfData={state.processedPDF} />
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Acciones Disponibles
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleDownloadWithConfirmation}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Descargar PDF
                    </button>
                    <button
                      onClick={handlePrintWithConfirmation}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      <Printer className="w-5 h-5" />
                      Imprimir PDF
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Estado del Proceso
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>PDF procesado exitosamente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Foto insertada correctamente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Listo para descargar</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetAllData}
                  className="w-full text-gray-600 hover:text-gray-800 transition-colors text-sm border border-gray-300 rounded-lg py-2 hover:bg-gray-50"
                >
                  ¿Procesar otro Alumno?
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, step: 'complete' }))}
                  className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finalizar Edición
                </button>
              </div>
            </div>
          )}

          {/* Modales de Confirmación */}
          {state.showDownloadConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Descargar PDF</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  ¿Estás seguro de que quieres descargar el PDF? El documento se guardará con la foto insertada.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={confirmDownload}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, showDownloadConfirmation: false }))}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {state.showPrintConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Printer className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Imprimir PDF</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  ¿Estás seguro de que quieres imprimir el PDF? Se abrirá la ventana de impresión del navegador.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={confirmPrint}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Imprimir PDF
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, showPrintConfirmation: false }))}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Constancia Uploader */}
          {state.step === 'constancia-upload' && (
            <div className="p-6 xl:p-8 w-full">
              <ConstanciaUploader
                onConstanciaUpload={handleConstanciaPDFUpload}
                onBack={() => setState(prev => ({ ...prev, step: 'complete' }))}
                capturedImage={state.capturedImage}
                processedPDF={state.pdfArrayBuffer}
                isProcessing={state.isProcessing}
                onImageUpdate={(newImage) => setState(prev => ({ ...prev, capturedImage: newImage }))}
              />
            </div>
          )}



          {state.step === 'pdf-template' && (
            <div className="p-6 xl:p-8 w-full">
              <PDFTemplateEditor
                onBack={() => setState(prev => ({ ...prev, step: 'pdf-template-select' }))}
                onComplete={handlePDFTemplateComplete}
                templatePdfBytes={state.templatePdfBytes || undefined}
                capturedImage={state.capturedImage || undefined}
                templateId={state.selectedPDFTemplate?.id}
                templateTitle={state.selectedPDFTemplate?.name}
              />
            </div>
          )}

          {state.step === 'complete' && (
            <div className="p-6 xl:p-8 text-center w-full">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                ¡Proceso completado!
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
                El PDF ha sido procesado exitosamente con la fotografía insertada del alumno.
              </p>

              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">
                  ¿Qué deseas hacer ahora?
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={resetAllData}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Procesar Nueva Constancia
                  </button>
                  
                  <button
                    onClick={() => setState(prev => ({ ...prev, step: 'constancia-upload' }))}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Cargar Constancia
                  </button>
                </div>
              </div>


              <div className="text-center">
                <button
                  onClick={resetProcess}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  title="Volver al inicio"
                >
                  Volver al inicio
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Los datos rellenados hasta ahora se quedarán guardados
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;