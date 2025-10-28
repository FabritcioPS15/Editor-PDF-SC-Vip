import React, { useEffect, useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

interface PDFPreviewProps {
  pdfData: Uint8Array | ArrayBuffer;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ pdfData }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = pdfData instanceof Uint8Array ? pdfData.buffer.slice() : pdfData;
      const blob = new Blob([data as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setError(null);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Error creating PDF preview:', error);
      setError('Error al generar la previsualización del PDF');
    }
  }, [pdfData]);

  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="w-full h-96 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Generando previsualización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Vista Previa del PDF
            </span>
          </div>
        </div>
        
        <div>
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
            className="w-full h-[80vh]"
            title="Vista previa del PDF"
          />
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-800 text-sm">
            PDF procesado exitosamente
          </span>
        </div>
      </div>
    </div>
  );
};

export default PDFPreview;