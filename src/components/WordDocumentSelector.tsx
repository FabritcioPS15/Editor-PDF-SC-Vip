import React, { useState } from 'react';
import { FileText, Download, Edit3, Check } from 'lucide-react';

interface WordDocument {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string; // Base64 encoded Word document
}

interface WordDocumentSelectorProps {
  onDocumentSelect: (document: WordDocument) => void;
  onEditDocument: (document: WordDocument) => void;
}

const WordDocumentSelector: React.FC<WordDocumentSelectorProps> = ({ 
  onDocumentSelect, 
  onEditDocument 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Documento de Word real del usuario
  const wordDocuments: WordDocument[] = [
    {
      id: '1',
      name: 'Hoja de Cargo',
      description: 'Documento oficial de hoja de cargo para personal',
      category: 'laboral',
      template: '/templates/HOJA DE CARGO (Autoguardado) - Hojas de cálculo de Google.docx'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'laboral', name: 'Laboral' }
  ];

  const filteredDocuments = selectedCategory === 'all' 
    ? wordDocuments 
    : wordDocuments.filter(doc => doc.category === selectedCategory);

  const handleDownload = (document: WordDocument) => {
    const link = document.createElement('a');
    link.href = document.template;
    link.download = `${document.name}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Seleccionar Documento de Word
        </h2>
        <p className="text-gray-600">
          Elige un documento precargado para editar y personalizar
        </p>
      </div>

      {/* Filtros por categoría */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map(document => (
          <div
            key={document.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {document.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {document.description}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEditDocument(document)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => onDocumentSelect(document)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Usar
              </button>
              <button
                onClick={() => handleDownload(document)}
                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay documentos en esta categoría</p>
        </div>
      )}
    </div>
  );
};

export default WordDocumentSelector;
