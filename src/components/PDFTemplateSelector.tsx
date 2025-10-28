import React from 'react';
import WebcamCapture from './WebcamCapture';

interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  preview: string;
}

interface PDFTemplateSelectorProps {
  onTemplateSelect: (template: PDFTemplate, capturedImage?: string) => void;
  initialCapturedImage?: string;
  onImageCapture?: (imageDataUrl: string) => void;
}

const PDFTemplateSelector: React.FC<PDFTemplateSelectorProps> = ({
  onTemplateSelect,
  initialCapturedImage,
  onImageCapture
}) => {
  const [pdfTemplates, setPdfTemplates] = React.useState<PDFTemplate[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [capturedImage, setCapturedImage] = React.useState<string | null>(initialCapturedImage || null);
  const [showCamera, setShowCamera] = React.useState(false);

  // Actualizar la foto cuando cambie la prop inicial (siempre sincronizar)
  React.useEffect(() => {
    if (initialCapturedImage !== capturedImage) {
      console.log('Actualizando foto desde prop inicial:', initialCapturedImage?.substring(0, 50) + '...');
      setCapturedImage(initialCapturedImage || null);
    }
  }, [initialCapturedImage, capturedImage]);

  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const base = (import.meta as any).env?.BASE_URL || '/';
        const res = await fetch(encodeURI(`${base.replace(/\/$/, '')}/pdf-templates/index.json`));
        if (!res.ok) throw new Error('No se encontró el manifiesto de plantillas');
        const data: PDFTemplate[] = await res.json();
        // Normalizar rutas (encodeURI) por si hay espacios
        const normalized = data.map(t => ({
          ...t,
          template: encodeURI(t.template),
          preview: t.preview ? encodeURI(t.preview) : ''
        }));
        setPdfTemplates(normalized);
      } catch (err) {
        // Fallback simple si no hay manifiesto: incluir el archivo existente conocido
        setPdfTemplates([
          {
            id: 'llenar-datos',
            name: 'Llenar Datos',
            description: 'Plantilla base desde la carpeta pdf-templates',
            category: 'recategorizacion',
            template: encodeURI('/pdf-templates/Llenar-Datos.pdf'),
            preview: ''
          }
        ]);
      }
    };
    loadTemplates();
  }, []);

  const filteredTemplates = pdfTemplates.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  });

  const handleImageCapture = (imageDataUrl: string) => {
    console.log('Nueva foto capturada (reemplazando anterior):', imageDataUrl.substring(0, 50) + '...');
    setCapturedImage(imageDataUrl);
    // También actualizar el estado global si se proporciona el callback
    if (onImageCapture) {
      onImageCapture(imageDataUrl);
    }
    setShowCamera(false);
  };

  const handleTemplateSelect = (template: PDFTemplate) => {
    onTemplateSelect(template, capturedImage || undefined);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center">
          <p className="text-gray-700 text-lg">Selecciona una plantilla y toma tu foto para comenzar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
        {/* Columna Izquierda: Selección de Plantillas */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Seleccionar Plantilla
            </h2>
            
            {/* Buscador */}
            <div className="mb-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar plantilla..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            {/* Lista de Plantillas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredTemplates.map((template) => {
                const selectable = !!capturedImage && !showCamera;
                return (
                  <div
                    key={template.id}
                    className={`rounded-lg border transition-all duration-200 ${
                      selectable
                        ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                        : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                    }`}
                    onClick={selectable ? () => handleTemplateSelect(template) : undefined}
                  >
                    {template.preview && (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-100">
                        <img src={template.preview} alt={template.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className={`p-3 ${template.preview ? '' : 'rounded-lg'}`}>
                      <div className="flex items-start gap-3">
                        {!template.preview && (
                          <div className="bg-gray-100 p-2 rounded">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
                          {!capturedImage && (
                            <p className="text-[11px] text-red-500 mt-1">Primero debes tomar una foto</p>
                          )}
                          {showCamera && (
                            <p className="text-[11px] text-orange-500 mt-1">Cámara activa - completa la captura</p>
                          )}
                        </div>
                        {capturedImage && !showCamera && (
                          <span className="text-blue-600 hover:text-blue-800 text-xs font-medium flex-shrink-0">
                            Usar →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensaje si no hay plantillas */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No hay plantillas disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Captura de Foto */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tomar Fotografía
            </h2>
            
            {!showCamera && !capturedImage && (
              <div className="text-center">
                <div className="mb-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Toma una foto que se insertará en la plantilla
                  </p>
                </div>
                <button
                  onClick={() => setShowCamera(true)}
                  className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base shadow-sm"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Tomar Foto</span>
                  <span className="sm:hidden">Foto</span>
                </button>
              </div>
            )}

            {capturedImage && !showCamera && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-4 border border-gray-200 shadow-sm">
                    <img 
                      src={capturedImage} 
                      alt="Foto capturada" 
                      className="mx-auto w-full object-cover rounded-lg border border-gray-300"
                      style={{ maxHeight: '520px' }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-green-600 text-sm mb-3 font-medium">✓ Foto capturada correctamente</p>
                  <p className="text-gray-600 text-sm mb-4">Ahora puedes seleccionar una plantilla de la izquierda</p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      console.log('Iniciando nueva captura, reemplazando foto anterior');
                      const confirmed = window.confirm('¿Reemplazar la foto actual con una nueva foto?');
                      if (confirmed) {
                        setCapturedImage(null);
                        setShowCamera(true);
                      }
                    }}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base shadow-sm"
                  >
                    <span className="hidden sm:inline">Tomar Nueva Foto</span>
                    <span className="sm:hidden">Nueva Foto</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cámara en el mismo espacio */}
            {showCamera && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="mx-auto w-full">
                    <div className="relative w-full h-[520px] sm:h-[560px] rounded-md overflow-hidden">
                      <WebcamCapture
                        isProcessing={false}
                        onImageCapture={handleImageCapture}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default PDFTemplateSelector;