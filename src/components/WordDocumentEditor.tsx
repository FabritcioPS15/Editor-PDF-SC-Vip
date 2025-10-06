import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { readWordDocumentContent, getWordDocumentFields } from '../utils/wordDocumentReader';
import '../styles/word-editor.css';

interface WordDocumentEditorProps {
  document: {
    id: string;
    name: string;
    description: string;
    category: string;
    template: string;
  };
  onSave: (content: string) => void;
  onBack: () => void;
  onGeneratePDF: (content: string) => void;
}

const WordDocumentEditor: React.FC<WordDocumentEditorProps> = ({
  document,
  onSave,
  onBack,
  onGeneratePDF
}) => {
  const getDocumentTemplate = async (docName: string, templatePath?: string) => {
    // If it's the real document, read its content using mammoth
    if (templatePath && templatePath.includes('HOJA DE CARGO')) {
      try {
        return await readWordDocumentContent(templatePath);
      } catch (error) {
        console.error('Error reading document:', error);
        return getDefaultTemplate(docName);
      }
    }
    
    // If it's an uploaded template, we'll use a generic template for now
    if (templatePath && typeof templatePath === 'object') {
      return `<div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 10px;">${docName}</h1>
        <p style="font-size: 10pt; color: #666;">Documento personalizado</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Archivo original:</strong> ${templatePath.name}</p>
        <p><strong>Fecha de creación:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Información Personal</h2>
        <p><strong>Nombre completo:</strong> [NOMBRE]</p>
        <p><strong>Número de documento:</strong> [DOCUMENTO]</p>
        <p><strong>Dirección:</strong> [DIRECCION]</p>
        <p><strong>Teléfono:</strong> [TELEFONO]</p>
        <p><strong>Fecha:</strong> [FECHA]</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Contenido Principal</h2>
        <p>Edita aquí el contenido principal de tu documento...</p>
      </div>
      
      <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #666;">
        <p>Documento generado el ${new Date().toLocaleDateString()}</p>
      </div>`;
    }
    
    return getDefaultTemplate(docName);
  };

  const getDefaultTemplate = (docName: string) => {
    return `<div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 10px;">${docName}</h1>
      <p style="font-size: 10pt; color: #666;">Documento personalizado</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Información Personal</h2>
      <p><strong>Nombre:</strong> [NOMBRE]</p>
      <p><strong>Documento:</strong> [DOCUMENTO]</p>
      <p><strong>Fecha:</strong> [FECHA]</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Contenido Principal</h2>
      <p>Edita aquí el contenido de tu documento...</p>
    </div>
    
    <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #666;">
      <p>Documento generado el ${new Date().toLocaleDateString()}</p>
    </div>`;
  };

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load document content on component mount
  useEffect(() => {
    const loadDocumentContent = async () => {
      try {
        setIsLoading(true);
        console.log('Loading document:', document.name, document.template);
        const documentContent = await getDocumentTemplate(document.name, document.template);
        console.log('Document content loaded:', documentContent);
        setContent(documentContent);
      } catch (error) {
        console.error('Error loading document:', error);
        setContent(getDefaultTemplate(document.name));
      } finally {
        setIsLoading(false);
      }
    };

    loadDocumentContent();
  }, [document.name, document.template]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(content);
    setIsEditing(false);
  };

  const handleGeneratePDF = () => {
    onGeneratePDF(content);
  };

  const formatText = (command: string, value?: string) => {
    window.document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertText = (text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(window.document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    editorRef.current?.focus();
  };

  // Add keyboard shortcuts like Word
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            formatText('bold');
            break;
          case 'i':
            e.preventDefault();
            formatText('italic');
            break;
          case 'u':
            e.preventDefault();
            formatText('underline');
            break;
        }
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="w-full max-w-none mx-auto">
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
              Editando: {document.name}
            </h2>
            <p className="text-gray-600">{document.description}</p>
          </div>
        </div>

        {/* Word-like Toolbar */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          {/* Main toolbar */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => formatText('bold')}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Negrita (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('italic')}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Cursiva (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('underline')}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Subrayado (Ctrl+U)"
              >
                <Underline className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2"></div>
              <button
                onClick={() => formatText('justifyLeft')}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Alinear izquierda"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('justifyCenter')}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Centrar"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('justifyRight')}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Alinear derecha"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Quick insert toolbar */}
          <div className="px-4 py-2 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600 font-medium">Insertar:</span>
              <button
                onClick={() => insertText('[NOMBRE]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                👤 Nombre
              </button>
              <button
                onClick={() => insertText('[DOCUMENTO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                🆔 Documento
              </button>
              <button
                onClick={() => insertText('[CARGO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                💼 Cargo
              </button>
              <button
                onClick={() => insertText('[DEPARTAMENTO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                🏢 Departamento
              </button>
              <button
                onClick={() => insertText('[FECHA]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                📅 Fecha
              </button>
              <button
                onClick={() => insertText('[SALARIO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                💰 Salario
              </button>
              <button
                onClick={() => insertText('[DIRECCION]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                📍 Dirección
              </button>
              <button
                onClick={() => insertText('[TELEFONO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                📞 Teléfono
              </button>
              <button
                onClick={() => insertText('[EMAIL]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                📧 Email
              </button>
              <button
                onClick={() => insertText('[JEFE]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                👨‍💼 Jefe
              </button>
              <button
                onClick={() => insertText('[HORARIO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                🕐 Horario
              </button>
              <button
                onClick={() => insertText('[TIPO_CONTRATO]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                📋 Contrato
              </button>
              <button
                onClick={() => insertText('[ESTADO_CIVIL]')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                💒 Estado Civil
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isEditing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Guardar Cambios' : 'Guardado'}
          </button>
          <button
            onClick={handleGeneratePDF}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Generar PDF
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
        {/* Word-like header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {document.name} - Microsoft Word
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">100%</span>
            <div className="w-16 h-1 bg-gray-300 rounded"></div>
          </div>
        </div>
        
        {/* Word-like document area - Full width and larger */}
        <div className="bg-gray-100 p-2 relative w-full overflow-x-auto">
          {isLoading ? (
            <div className="bg-white shadow-lg mx-auto flex items-center justify-center" style={{ width: '297mm', minHeight: '420mm' }}>
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando documento...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Rulers - Larger scale */}
              <div className="absolute top-2 left-2 right-2 h-6 bg-white border border-gray-300 flex items-center text-xs text-gray-500">
                <div className="ml-4">0</div>
                <div className="ml-12">1"</div>
                <div className="ml-12">2"</div>
                <div className="ml-12">3"</div>
                <div className="ml-12">4"</div>
                <div className="ml-12">5"</div>
                <div className="ml-12">6"</div>
                <div className="ml-12">7"</div>
                <div className="ml-12">8"</div>
                <div className="ml-12">9"</div>
                <div className="ml-12">10"</div>
                <div className="ml-12">11"</div>
              </div>
              
              <div className="mt-8 bg-white shadow-lg mx-auto relative" style={{ width: '297mm', minHeight: '420mm' }}>
                {/* Document margins and content - Larger and full view */}
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[1200px] p-8 focus:outline-none relative word-editor-content"
                  style={{
                    backgroundColor: '#ffffff',
                    width: '100%',
                    minHeight: '420mm',
                    boxSizing: 'border-box',
                    border: '1px solid #e5e7eb'
                  }}
                  onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: content || '<p>Documento cargando...</p>' }}
                />
                
                {/* Margin indicators - Adjusted for larger size */}
                <div className="absolute top-8 left-8 w-1 h-full bg-blue-200 opacity-30"></div>
                <div className="absolute top-8 right-8 w-1 h-full bg-blue-200 opacity-30"></div>
                <div className="absolute top-8 left-8 w-full h-1 bg-blue-200 opacity-30"></div>
                <div className="absolute bottom-8 left-8 w-full h-1 bg-blue-200 opacity-30"></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <Type className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 mb-1">Consejos de edición:</p>
            <ul className="text-amber-800 space-y-1 text-xs">
              <li>• Usa los botones de formato para dar estilo al texto</li>
              <li>• Los campos entre corchetes [ ] se pueden reemplazar con información real</li>
              <li>• Haz clic en "Generar PDF" cuando termines de editar</li>
              <li>• El documento se guardará automáticamente al generar el PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordDocumentEditor;
