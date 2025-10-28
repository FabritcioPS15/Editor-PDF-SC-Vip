import React, { useState, useRef } from 'react';
import WebcamCapture from './WebcamCapture';

interface ConstanciaUploaderProps {
  onConstanciaUpload: (file: File) => void;
  onBack: () => void;
  capturedImage: string | null;
  processedPDF?: ArrayBuffer | null;
  isProcessing?: boolean;
  onImageUpdate?: (newImage: string) => void;
}

const ConstanciaUploader: React.FC<ConstanciaUploaderProps> = ({
  onConstanciaUpload,
  onBack,
  capturedImage,
  processedPDF,
  isProcessing = false,
  onImageUpdate
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(capturedImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar con la imagen capturada cuando cambie
  React.useEffect(() => {
    setCurrentImage(capturedImage);
  }, [capturedImage]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        handleFileSelect(file);
      } else {
        alert('Por favor selecciona un archivo PDF válido');
      }
    }
  };

  const handleFileSelect = (file: File) => {
    console.log('handleFileSelect ejecutado con archivo:', file.name, file.type, file.size);
    setUploadedFile(file);
    
    // Crear preview del PDF
    const url = URL.createObjectURL(file);
    console.log('URL de preview creada:', url);
    setPreviewUrl(url);
    
    // Procesar automáticamente con la foto
    console.log('Procesando automáticamente con la foto...');
    onConstanciaUpload(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileInputChange ejecutado, archivos:', e.target.files?.length);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('Archivo seleccionado:', file.name, file.type, file.size);
      if (file.type === 'application/pdf') {
        console.log('Archivo PDF válido, procesando...');
        handleFileSelect(file);
      } else {
        console.log('Archivo no es PDF:', file.type);
        alert('Por favor selecciona un archivo PDF válido');
      }
    } else {
      console.log('No hay archivos seleccionados');
    }
  };

  const handleUpload = () => {
    console.log('handleUpload ejecutado, uploadedFile:', uploadedFile?.name);
    if (uploadedFile) {
      console.log('Llamando onConstanciaUpload con archivo:', uploadedFile.name);
      onConstanciaUpload(uploadedFile);
    } else {
      console.log('No hay archivo cargado para procesar');
    }
  };

  const handleRemoveFile = () => {
    console.log('handleRemoveFile ejecutado');
    setUploadedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('Archivo removido, estado limpiado');
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    console.log('handleCameraCapture ejecutado');
    setCurrentImage(imageDataUrl);
    setShowCamera(false);
    
    // Actualizar la imagen en el componente padre
    if (onImageUpdate) {
      onImageUpdate(imageDataUrl);
    }
    
    // Reprocesar el PDF con la nueva imagen si hay un archivo cargado
    if (uploadedFile) {
      console.log('Reprocesando PDF con nueva imagen...');
      onConstanciaUpload(uploadedFile);
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center">
          </div> 
      </div>

      {/* Área de carga de archivo - Solo visible cuando no hay archivo cargado */}
      {!uploadedFile && !processedPDF && (
        <div className="w-full">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cargar PDF de Constancia</h2>
              <p className="text-gray-600">Arrastra tu archivo PDF aquí o selecciona uno desde tu dispositivo</p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-medium text-gray-900 mb-2">
                    Arrastra tu archivo PDF aquí
                  </p>
                  <p className="text-gray-600 mb-4">o</p>
                  <button
                    onClick={() => {
                      console.log('Botón "Seleccionar archivo" clickeado');
                      if (fileInputRef.current) {
                        console.log('Abriendo selector de archivos');
                        fileInputRef.current.click();
                      } else {
                        console.error('fileInputRef.current es null');
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Seleccionar archivo
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Solo archivos PDF (máximo 10MB)
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Panel de Preview - Solo visible cuando hay archivo cargado */}
      {(uploadedFile || processedPDF) && (
        <div className="w-full">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Controles superiores */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Vista Previa del PDF
              </h2>
              
              {/* Botones de acción */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    console.log('Botón "Cambiar Foto" clickeado');
                    setShowCamera(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Cambiar Foto
                </button>
                
                <button
                  onClick={() => {
                    console.log('Botón "Cambiar PDF" clickeado');
                    handleRemoveFile();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cambiar PDF
                </button>
              </div>
            </div>
            
            {processedPDF ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={`${URL.createObjectURL(new Blob([processedPDF], { type: 'application/pdf' }))}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
                  className="w-full h-[80vh]"
                  title="PDF Preview with Photo"
                />
                <div className="bg-green-50 border-t border-green-200 p-3">
                  <p className="text-sm text-green-700 font-medium text-center">
                    ✅ PDF procesado con la foto insertada
                  </p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
                  className="w-full h-[80vh]"
                  title="PDF Preview"
                />
                <div className="bg-blue-50 border-t border-blue-200 p-3">
                  <p className="text-sm text-blue-700 font-medium text-center">
                    🔄 Procesando PDF con la foto automáticamente...
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
      </div>

      {/* Popup de Cámara */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-10 w-[800px] mx-4">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-gray-900">Tomar Nueva Foto</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <WebcamCapture
              onCapture={handleCameraCapture}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstanciaUploader;
