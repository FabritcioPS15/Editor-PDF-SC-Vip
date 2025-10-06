import { useState, useCallback } from 'react';
import { Upload, Camera, Download, Printer, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import WebcamCapture from './components/WebcamCapture';
import PDFPreview from './components/PDFPreview';
import WordDocumentSelector from './components/WordDocumentSelector';
import WordDocumentEditor from './components/WordDocumentEditor';
import WordTemplateUploader from './components/WordTemplateUploader';
import PDFTemplateEditor from './components/PDFTemplateEditor';
import PDFTemplateSelector from './components/PDFTemplateSelector';
import { insertImageInPDF } from './utils/pdfUtils';
import { convertWordContentToPDF, parseWordContent } from './utils/wordToPdfUtils';

interface AppState {
  step: 'upload' | 'capture' | 'preview' | 'complete' | 'word-select' | 'word-edit' | 'word-upload' | 'pdf-template' | 'pdf-template-select';
  pdfFile: File | null;
  pdfArrayBuffer: ArrayBuffer | null;
  capturedImage: string | null;
  processedPDF: Uint8Array | null;
  selectedWordDocument: any | null;
  editedWordContent: string | null;
  uploadedWordTemplate: File | null;
  templatePdfBytes: Uint8Array | null;
  selectedPDFTemplate: any | null;
  isProcessing: boolean;
  error: string | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    step: 'upload',
    pdfFile: null,
    pdfArrayBuffer: null,
    capturedImage: null,
    processedPDF: null,
    selectedWordDocument: null,
    editedWordContent: null,
    uploadedWordTemplate: null,
    templatePdfBytes: null,
    selectedPDFTemplate: null,
    isProcessing: false,
    error: null,
  });

  const handlePDFUpload = useCallback(async (file: File, arrayBuffer: ArrayBuffer) => {
    setState(prev => ({
      ...prev,
      pdfFile: file,
      pdfArrayBuffer: arrayBuffer,
      step: 'capture',
      error: null,
    }));
  }, []);

  const handleImageCapture = useCallback(async (imageDataUrl: string) => {
    setState(prev => ({
      ...prev,
      capturedImage: imageDataUrl,
      isProcessing: true,
      error: null,
    }));

    try {
      if (state.pdfArrayBuffer) {
        // Process with existing PDF
        const processedPDF = await insertImageInPDF(state.pdfArrayBuffer, imageDataUrl);
        
        setState(prev => ({
          ...prev,
          processedPDF,
          step: 'preview',
          isProcessing: false,
        }));
      } else {
        // No PDF loaded, show message to upload PDF first
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Por favor, carga un PDF primero o usa los documentos precargados.',
        }));
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Error al procesar el PDF. Por favor, intenta nuevamente.',
      }));
    }
  }, [state.pdfArrayBuffer]);

  const handleWordDocumentSelect = useCallback((document: any) => {
    setState(prev => ({
      ...prev,
      selectedWordDocument: document,
      step: 'word-edit',
      error: null,
    }));
  }, []);

  const handleWordDocumentEdit = useCallback((document: any) => {
    setState(prev => ({
      ...prev,
      selectedWordDocument: document,
      step: 'word-edit',
      error: null,
    }));
  }, []);

  const handleWordContentSave = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      editedWordContent: content,
    }));
  }, []);

  const handleWordToPDF = useCallback(async (content: string) => {
    if (!state.selectedWordDocument) return;

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
    }));

    try {
      const wordContent = parseWordContent(content, state.selectedWordDocument.name);
      const pdfBytes = await convertWordContentToPDF(wordContent, state.capturedImage || undefined);
      
      setState(prev => ({
        ...prev,
        processedPDF: pdfBytes,
        step: 'preview',
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Error converting Word to PDF:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Error al convertir el documento a PDF. Por favor, intenta nuevamente.',
      }));
    }
  }, [state.selectedWordDocument, state.capturedImage]);

  const handleDownload = useCallback(() => {
    if (!state.processedPDF || !state.pdfFile) return;

    const copy = new Uint8Array(state.processedPDF);
    const blob = new Blob([copy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.pdfFile.name.replace('.pdf', '')}_con_foto.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setState(prev => ({ ...prev, step: 'complete' }));
  }, [state.processedPDF, state.pdfFile]);

  const handlePrint = useCallback(() => {
    if (!state.processedPDF) return;

    const copy = new Uint8Array(state.processedPDF);
    const blob = new Blob([copy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        setState(prev => ({ ...prev, step: 'complete' }));
      };
    }
  }, [state.processedPDF]);

  const resetProcess = useCallback(() => {
    setState({
      step: 'upload',
      pdfFile: null,
      pdfArrayBuffer: null,
      capturedImage: null,
      processedPDF: null,
      selectedWordDocument: null,
      editedWordContent: null,
      uploadedWordTemplate: null,
      templatePdfBytes: null,
      selectedPDFTemplate: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  // Removed unused goToWordDocuments

  // goToWordUpload removido (no se usa)

  const handleWordTemplateUpload = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      uploadedWordTemplate: file,
      selectedWordDocument: {
        id: 'uploaded',
        name: file.name.replace('.docx', '').replace('.doc', ''),
        description: 'Plantilla personalizada subida por el usuario',
        category: 'personalizado',
        template: file
      },
      step: 'word-edit',
      error: null,
    }));
  }, []);

  const goToPDFTemplate = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'pdf-template-select',
      error: null,
    }));
  }, []);

  const handlePDFTemplateSelect = useCallback(async (template: any) => {
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

  const handlePDFTemplateComplete = useCallback((editedPdfBytes: Uint8Array) => {
    setState(prev => ({
      ...prev,
      processedPDF: editedPdfBytes,
      step: 'preview',
      error: null,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      const current = prev.step;
      if (current === 'upload') return prev;
      if (current === 'capture') return { ...prev, step: 'upload' };
      if (current === 'preview') {
        if (prev.selectedPDFTemplate) return { ...prev, step: 'pdf-template' };
        if (prev.selectedWordDocument) return { ...prev, step: 'word-edit' };
        return { ...prev, step: 'capture' };
      }
      if (current === 'word-edit') {
        const backStep = prev.selectedWordDocument?.id === 'uploaded' ? 'word-upload' : 'word-select';
        return { ...prev, step: backStep };
      }
      if (current === 'word-upload') return { ...prev, step: 'complete' };
      if (current === 'word-select') return { ...prev, step: 'complete' };
      if (current === 'pdf-template') return { ...prev, step: 'pdf-template-select' };
      if (current === 'pdf-template-select') return { ...prev, step: 'complete' };
      if (current === 'complete') {
        if (prev.processedPDF) return { ...prev, step: 'preview' };
        return { ...prev, step: 'upload' };
      }
      return prev;
    });
  }, []);

  const getStepperConfig = () => {
    // Flujo por defecto (subir/capturar/preview/completado)
    const defaultConfig = {
      labels: ['Cargar constancia en PDF', 'Capturar Foto', 'Previsualizar', 'Completado'],
      map: { upload: 1, capture: 2, preview: 3, complete: 4 } as Record<string, number>
    };

    // Flujo de plantillas PDF (selector/editor/preview/completado)
    if (state.step === 'pdf-template-select' || state.step === 'pdf-template') {
      return {
        labels: ['Seleccionar PDF', 'Registro de alumno', 'Previsualizar', 'Completado'],
        map: { 'pdf-template-select': 1, 'pdf-template': 2, preview: 3, complete: 4 } as Record<string, number>
      };
    }

    return defaultConfig;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-orange-600 shadow-sm border-b border-orange-700">
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Editor PDF con Webcam
              </h1>
              <p className="text-orange-100 text-sm">
                Inserta fotos capturadas desde tu cámara directamente en documentos PDF
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        {state.step !== 'upload' && (
          <div className="mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          {(() => {
            const { labels, map } = getStepperConfig();
            const current = map[state.step] || 1;
            const lastIndex = labels.length - 1;
            return labels.map((label, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === current;
              const isCompleted = stepNum < current;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                      ${isCompleted ? 'bg-yellow-500 text-black' : 
                        isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}
                      transition-all duration-300
                    `}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : stepNum}
                    </div>
                    <span className={`
                      mt-2 text-xs font-medium text-center
                      ${isActive ? 'text-orange-600' : isCompleted ? 'text-yellow-600' : 'text-gray-500'}
                    `}>
                      {label}
                    </span>
                  </div>
                  {index < lastIndex && (
                    <div className={`
                      flex-1 h-0.5 mx-4
                      ${isCompleted ? 'bg-yellow-500' : 'bg-gray-200'}
                      transition-all duration-300
                    `} />
                  )}
                </div>
              );
            });
          })()}
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
        <div className="relative bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
          {/* Decoración sutil */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-br from-yellow-200/50 to-orange-300/40 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-br from-orange-200/40 to-yellow-300/40 rounded-full blur-3xl" />
          {state.step === 'upload' && (
            <div className="p-8">
              <div className="text-center mb-6">
                <Upload className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Cargar Documento PDF
                </h2>
                <p className="text-slate-600">
                  Selecciona un archivo PDF que contenga el espacio designado para la foto
                </p>
              </div>
              <PDFUploader onPDFUpload={handlePDFUpload} />
            </div>
          )}

          {state.step === 'capture' && (
            <div className="p-8">
              <div className="text-center mb-6">
                <Camera className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Capturar Fotografía
                </h2>
                <p className="text-slate-600">
                  Usa tu cámara web para tomar la foto que se insertará en el documento
                </p>
              </div>
              <WebcamCapture 
                onImageCapture={handleImageCapture} 
                isProcessing={state.isProcessing}
              />
            </div>
          )}

          {state.step === 'preview' && state.processedPDF && (
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Previsualización del Resultado
                </h2>
                <p className="text-slate-600">
                  Revisa el documento con la foto insertada antes de descargar
                </p>
              </div>
              
              <PDFPreview pdfData={state.processedPDF} />
              
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Descargar PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir Documento
                </button>
              </div>
              
              <button
                onClick={resetProcess}
                className="w-full mt-4 text-orange-600 hover:text-orange-800 transition-colors text-sm"
              >
                ¿Procesar otro Alumno?
              </button>
            </div>
          )}

          {state.step === 'word-select' && (
            <div className="p-8">
              <WordDocumentSelector 
                onDocumentSelect={handleWordDocumentSelect}
                onEditDocument={handleWordDocumentEdit}
              />
            </div>
          )}

          {state.step === 'word-upload' && (
            <div className="p-8">
              <WordTemplateUploader
                onTemplateUpload={handleWordTemplateUpload}
                onBack={() => setState(prev => ({ ...prev, step: 'complete' }))}
              />
            </div>
          )}

          {state.step === 'word-edit' && state.selectedWordDocument && (
            <div className="p-8">
              <WordDocumentEditor
                document={state.selectedWordDocument}
                onSave={handleWordContentSave}
                onBack={() => setState(prev => ({ 
                  ...prev, 
                  step: state.selectedWordDocument?.id === 'uploaded' ? 'word-upload' : 'word-select' 
                }))}
                onGeneratePDF={handleWordToPDF}
              />
            </div>
          )}

          {state.step === 'pdf-template-select' && (
            <div className="p-8">
              <PDFTemplateSelector
                onTemplateSelect={handlePDFTemplateSelect}
                onBack={() => setState(prev => ({ ...prev, step: 'complete' }))}
              />
            </div>
          )}

          {state.step === 'pdf-template' && (
            <div className="p-8">
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
            <div className="relative p-8 text-center">
              {/* confeti sutil */}
              <div className="pointer-events-none absolute inset-0 opacity-10">
                <div className="absolute top-6 left-10 w-2 h-2 bg-orange-400 rounded-full" />
                <div className="absolute top-10 right-12 w-2 h-2 bg-yellow-500 rounded-full" />
                <div className="absolute bottom-8 left-1/3 w-2 h-2 bg-orange-300 rounded-full" />
                <div className="absolute bottom-10 right-1/4 w-2 h-2 bg-yellow-400 rounded-full" />
              </div>

              <CheckCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                ¡Proceso completado!
              </h2>
              <p className="text-slate-600 mb-6">
                El PDF ha sido procesado exitosamente con la fotografía insertada del alumno.
              </p>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Selecciona qué deseas hacer ahora
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={goToPDFTemplate}
                    className="flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Seleccionar PDF
                  </button>
                  <button
                    onClick={resetProcess}
                    className="flex items-center justify-center gap-2 bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
                  >
                    Procesar nueva constancia
                  </button>
                </div>
              </div>

              <button
                onClick={resetProcess}
                className="text-sm text-orange-600 hover:text-orange-800 underline-offset-4 hover:underline"
                title="Volver al inicio"
              >
                Volver al inicio
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Crédito sutil */}
      <div className="pointer-events-none fixed bottom-2 right-3 select-none">
        <span className="text-[10px] text-slate-400/60 tracking-wide">Creado por FabritcioPS15</span>
      </div>
    </div>
  );
}

export default App;