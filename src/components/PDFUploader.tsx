import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface PDFUploaderProps {
  onPDFUpload: (file: File, arrayBuffer: ArrayBuffer) => void;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onPDFUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF válido.');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('El archivo es muy grande. Por favor selecciona un PDF menor a 10MB.');
      return false;
    }
    
    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      onPDFUpload(file, arrayBuffer);
    } catch (error) {
      console.error('Error reading file:', error);
      setError('Error al leer el archivo. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <div className={`
              p-3 rounded-full
              ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}
              transition-colors duration-200
            `}>
              <Upload className={`
                w-8 h-8
                ${isDragging ? 'text-blue-600' : 'text-slate-600'}
              `} />
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {isLoading ? 'Procesando archivo...' : 'Seleccionar archivo PDF'}
            </h3>
            <p className="text-slate-600 text-sm mb-2">
              Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
            </p>
            <p className="text-xs text-slate-500">
              Formatos aceptados: PDF • Tamaño máximo: 10MB
            </p>
          </div>
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-50 rounded-xl flex items-center justify-center">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
              Suelta el archivo aquí
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Requisitos del PDF:</p>
            <ul className="text-blue-800 space-y-1 text-xs">
              <li>• El PDF debe contener un espacio designado para la fotografía</li>
              <li>• Se recomienda que el área de la foto esté claramente marcada</li>
              <li>• La imagen se insertará en la primera página del documento</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFUploader;