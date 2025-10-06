import React from 'react';

interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  preview: string;
}

interface PDFTemplateSelectorProps {
  onTemplateSelect: (template: PDFTemplate) => void;
  onBack: () => void;
}

const PDFTemplateSelector: React.FC<PDFTemplateSelectorProps> = ({
  onTemplateSelect,
  onBack
}) => {
  const [pdfTemplates, setPdfTemplates] = React.useState<PDFTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'actualizacion' | 'recategorizacion' | 'nuevo'>('all');

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

  const categorySet = React.useMemo(() => {
    const set = new Set<string>();
    pdfTemplates.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      if (!cat) return;
      if (cat === 'general') return;
      if (cat === 'recategorizacion') return; // evitar duplicado con botón de tipo
      if (cat === 'actualizacion') return; // retirar del grupo de la izquierda
      if (cat === 'nuevo') return; // retirar del grupo de la izquierda
      set.add(cat);
    });
    return ['all', ...Array.from(set)];
  }, [pdfTemplates]);

  const categoryFiltered = selectedCategory === 'all'
    ? pdfTemplates
    : pdfTemplates.filter(template => (template.category || '').toLowerCase() === selectedCategory.toLowerCase());

  const typeFiltered = typeFilter === 'all'
    ? categoryFiltered
    : categoryFiltered.filter(template => (template.category || '').toLowerCase() === typeFilter);

  const filteredTemplates = typeFiltered.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold text-orange-900">Plantillas PDF</h1>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar plantilla por nombre o descripción..."
              className="flex-1 px-4 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
          {categorySet.map((categoryId) => (
            <button
              key={categoryId}
              onClick={() => setSelectedCategory(categoryId)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === categoryId
                  ? 'bg-orange-600 text-white'
                  : 'bg-yellow-100 text-orange-700 hover:bg-yellow-200'
              }`}
            >
              {categoryId === 'all' 
                ? 'Todos' 
                : categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}
            </button>
          ))}
            <div className="w-px h-8 bg-orange-200 mx-1" />
            {[
              { id: 'actualizacion', label: 'Actualización de la normativa' },
              { id: 'recategorizacion', label: 'Recategorización' },
              { id: 'nuevo', label: 'Nuevo' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setTypeFilter(prev => (prev === (opt.id as any) ? 'all' : (opt.id as any)))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === (opt.id as any)
                    ? 'bg-orange-600 text-white'
                    : 'bg-yellow-100 text-orange-700 hover:bg-yellow-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-orange-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onTemplateSelect(template)}
          >
            {/* Preview */}
            <div className="h-48 bg-gray-100 flex items-center justify-center">
              {template.preview ? (
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Vista previa no disponible</p>
                </div>
              )}
            </div>

            {/* Información */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </span>
                <button className="text-orange-600 hover:text-orange-800 text-sm font-medium">
                  Usar Plantilla →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje si no hay plantillas */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            No hay plantillas disponibles
          </h3>
          <p className="text-orange-600">
            No se encontraron plantillas en la categoría seleccionada.
          </p>
        </div>
      )}
    </div>
  );
};

export default PDFTemplateSelector;
