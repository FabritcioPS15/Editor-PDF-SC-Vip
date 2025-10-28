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
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
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
        
        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <Upload className="w-8 h-8 text-gray-400" />
          )}
          
          <div>
            <p className="text-gray-700 font-medium mb-1">
              {isLoading ? 'Procesando archivo...' : 'Selecciona un archivo PDF'}
            </p>
            <p className="text-gray-500 text-sm">
              Arrastra y suelta o haz clic para seleccionar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFUploader;