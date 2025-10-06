import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, Check, ArrowLeft } from 'lucide-react';

interface WordTemplateUploaderProps {
  onTemplateUpload: (file: File) => void;
  onBack: () => void;
}

const WordTemplateUploader: React.FC<WordTemplateUploaderProps> = ({
  onTemplateUpload,
  onBack
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    
    const validExtensions = ['.docx', '.doc'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Por favor selecciona un archivo de Word válido (.doc o .docx)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. El tamaño máximo permitido es 10MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onTemplateUpload(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              Subir Plantilla de Word
            </h2>
            <p className="text-gray-600">
              Sube tu propia plantilla de Word para personalizar y editar
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        {!selectedFile ? (
          <div
            className={`${isDragOver ? 'border-blue-400 bg-blue-50' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Arrastra tu archivo aquí
            </h3>
            <p className="text-gray-600 mb-4">
              o haz clic para seleccionar un archivo
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Seleccionar Archivo
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Formatos soportados: .doc, .docx (máximo 10MB)
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Archivo seleccionado
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleUpload}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Usar Esta Plantilla
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cambiar Archivo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Help text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Consejos para tu plantilla:</p>
            <ul className="text-blue-800 space-y-1 text-xs">
              <li>• Asegúrate de que tu plantilla tenga espacios para la información personal</li>
              <li>• Puedes usar marcadores como [NOMBRE], [FECHA], [DOCUMENTO] para campos dinámicos</li>
              <li>• La foto se insertará automáticamente en el documento final</li>
              <li>• El formato se mantendrá al convertir a PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordTemplateUploader;
