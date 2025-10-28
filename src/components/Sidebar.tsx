import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Home, 
  Camera, 
  FileText, 
  Download, 
  Settings, 
  History, 
  HelpCircle,
  Menu,
  X,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import { faceDetectionService, FaceDetectionResult } from '../utils/faceDetection';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentStep: string;
  onNavigate: (step: string) => void;
  onReset: () => void;
  onDownload: () => void;
  hasProcessedPDF: boolean;
  hasCapturedImage: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  capturedImage?: string | null;
  onImageCapture?: (imageDataUrl: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentStep,
  onNavigate,
  onReset,
  onDownload,
  hasProcessedPDF,
  hasCapturedImage,
  isCollapsed,
  onToggleCollapse,
  capturedImage,
  onImageCapture
}) => {
  // Webcam states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alignedStreakRef = useRef<number>(0);
  const misalignedStreakRef = useRef<number>(0);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarCapturedImage, setSidebarCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetection, setFaceDetection] = useState<FaceDetectionResult>({
    isFaceDetected: false,
    isFaceAligned: false
  });
  const [isFaceApiLoading, setIsFaceApiLoading] = useState(true);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [sidebarUsed, setSidebarUsed] = useState(false);

  // Webcam functions
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      if (isFaceApiLoading) {
        try {
          await faceDetectionService.initialize();
          setIsFaceApiLoading(false);
        } catch (faceError) {
          console.warn('Face API initialization failed:', faceError);
          setIsFaceApiLoading(false);
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await new Promise<void>((resolve) => {
          const el = videoRef.current!;
          if (el.readyState >= 2 && el.videoWidth > 0 && el.videoHeight > 0) {
            resolve();
            return;
          }
          const onMeta = () => {
            el.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          el.addEventListener('loadedmetadata', onMeta, { once: true });
        });
        try { await videoRef.current.play(); } catch (_) {}
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('No se pudo acceder a la cámara');
    }
  }, [isFaceApiLoading]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isStreaming || isFaceApiLoading) return;

    try {
      const videoElement = videoRef.current;
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      if (!vw || !vh) return;

      const videoRect = videoElement.getBoundingClientRect();
      const frameDisplayWidth = Math.min(200, Math.max(150, videoRect.width * 0.6));
      const frameDisplayHeight = Math.min(240, videoRect.height * 0.8);
      
      const frameDisplayBox = {
        x: (videoRect.width - frameDisplayWidth) / 2,
        y: (videoRect.height - frameDisplayHeight) / 2,
        width: frameDisplayWidth,
        height: frameDisplayHeight
      };

      const scaleX = vw / videoRect.width;
      const scaleY = vh / videoRect.height;
      const frameBox = {
        x: Math.max(0, Math.round(frameDisplayBox.x * scaleX)),
        y: Math.max(0, Math.round(frameDisplayBox.y * scaleY)),
        width: Math.min(vw, Math.round(frameDisplayBox.width * scaleX)),
        height: Math.min(vh, Math.round(frameDisplayBox.height * scaleY))
      };

      const result = await faceDetectionService.detectFace(videoElement, frameBox);
      setFaceDetection(result);
      
      if (result.isFaceAligned) {
        alignedStreakRef.current = Math.min(alignedStreakRef.current + 1, 10);
        misalignedStreakRef.current = 0;
      } else {
        misalignedStreakRef.current = Math.min(misalignedStreakRef.current + 1, 10);
        alignedStreakRef.current = 0;
      }

      const alignedStable = alignedStreakRef.current >= 2;
      const misalignedStable = misalignedStreakRef.current >= 2;

      if (alignedStable && !isAutoCapturing && !sidebarCapturedImage) {
        if (autoCaptureCountdown === null) {
          setAutoCaptureCountdown(2);
          setIsAutoCapturing(true);
          
          countdownTimerRef.current = setInterval(() => {
            setAutoCaptureCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownTimerRef.current!);
                capturePhoto();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }

      if (isAutoCapturing && misalignedStable) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setAutoCaptureCountdown(null);
        setIsAutoCapturing(false);
      }
    } catch (error) {
      console.error('Error detecting face:', error);
    }
  }, [isStreaming, isFaceApiLoading, isAutoCapturing, sidebarCapturedImage, autoCaptureCountdown]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const tryCapture = async (attempt: number): Promise<boolean> => {
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      if (!videoWidth || !videoHeight) return false;
      
      const videoRect = video.getBoundingClientRect();
      const frameDisplayWidth = Math.min(200, Math.max(150, videoRect.width * 0.6));
      const frameDisplayHeight = Math.min(240, videoRect.height * 0.8);
      
      const scaleX = videoWidth / videoRect.width;
      const scaleY = videoHeight / videoRect.height;
      const cropWidth = Math.round(frameDisplayWidth * scaleX);
      const cropHeight = Math.round(frameDisplayHeight * scaleY);
      const cropX = Math.round((videoWidth - cropWidth) / 2);
      const cropY = Math.round((videoHeight - cropHeight) / 2);

      const safeCropX = Math.max(0, Math.min(cropX, videoWidth - cropWidth));
      const safeCropY = Math.max(0, Math.min(cropY, videoHeight - cropHeight));
      const safeCropWidth = Math.max(1, Math.min(cropWidth, videoWidth));
      const safeCropHeight = Math.max(1, Math.min(cropHeight, videoHeight));

      canvas.width = safeCropWidth | 0;
      canvas.height = safeCropHeight | 0;

      context.drawImage(
        video, 
        safeCropX, safeCropY, safeCropWidth, safeCropHeight,
        0, 0, safeCropWidth, safeCropHeight
      );

      const pixel = context.getImageData(Math.floor(safeCropWidth/2), Math.floor(safeCropHeight/2), 1, 1).data;
      const avg = (pixel[0] + pixel[1] + pixel[2]) / 3;
      const looksBlack = avg < 2;
      if (looksBlack && attempt < 3) {
        await new Promise(res => setTimeout(res, 80));
        return tryCapture(attempt + 1);
      }
      return !looksBlack;
    };

    (async () => {
      const ok = await tryCapture(1);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setSidebarCapturedImage(imageDataUrl);
      if (onImageCapture) {
        onImageCapture(imageDataUrl);
      }
      if (ok) {
        stopCamera();
        setShowWebcam(false);
      }
    })();
  }, [stopCamera, onImageCapture]);

  const retakePhoto = useCallback(() => {
    setSidebarCapturedImage(null);
    setShowWebcam(true);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (sidebarCapturedImage && onImageCapture) {
      // Si ya hay una foto capturada, mostrar confirmación de reemplazo
      if (hasCapturedImage) {
        const confirmed = window.confirm('¿Reemplazar la foto anterior con esta nueva foto?');
        if (!confirmed) {
          setShowWebcam(false);
          return;
        }
      }
      onImageCapture(sidebarCapturedImage);
      setSidebarUsed(true); // Marcar que el sidebar ya fue usado
    }
    // Apply immediately and reset detection/loading state
    setAutoCaptureCountdown(null);
    setIsAutoCapturing(false);
    alignedStreakRef.current = 0;
    misalignedStreakRef.current = 0;
    setFaceDetection({ isFaceDetected: false, isFaceAligned: false });
    setShowWebcam(false);
  }, [sidebarCapturedImage, onImageCapture, hasCapturedImage]);

  const menuItems = [
    {
      id: 'tomar-foto',
      label: 'Tomar Foto',
      icon: Camera,
      description: 'Abrir cámara',
      disabled: false
    },
    {
      id: 'pdf-template-select',
      label: 'Inicio',
      icon: Home,
      description: 'Seleccionar plantilla'
    },
    {
      id: 'pdf-template',
      label: 'Editor',
      icon: FileText,
      description: 'Editar plantilla',
      disabled: currentStep === 'pdf-template-select'
    },
    {
      id: 'preview',
      label: 'Vista Previa',
      icon: Camera,
      description: 'Ver resultado',
      disabled: !hasProcessedPDF
    },
    {
      id: 'complete',
      label: 'Completado',
      icon: Download,
      description: 'Descargar PDF',
      disabled: !hasProcessedPDF
    },
    {
      id: 'constancia-upload',
      label: 'Constancia',
      icon: FileText,
      description: 'Cargar constancia',
      disabled: false
    }
  ];

  const quickActions = [
    {
      id: 'camera',
      label: hasCapturedImage ? 'Cambiar Foto' : 'Tomar Foto',
      icon: Camera,
      action: () => setShowWebcam(true),
      disabled: false
    },
    {
      id: 'download',
      label: 'Descargar',
      icon: Download,
      action: onDownload,
      disabled: !hasProcessedPDF
    },
    {
      id: 'reset',
      label: 'Nuevo',
      icon: History,
      action: onReset,
      disabled: false
    },
    {
      id: 'constancia',
      label: 'Cargar Constancia',
      icon: FileText,
      action: () => onNavigate('constancia-upload'),
      disabled: false
    }
  ];

  // Face detection effect
  useEffect(() => {
    if (!isStreaming || isFaceApiLoading || !showWebcam) return;

    faceDetectionService.setDetectionThrottle(300);
    const interval = setInterval(detectFace, 300);
    return () => clearInterval(interval);
  }, [isStreaming, isFaceApiLoading, detectFace, showWebcam]);

  // Auto start/stop camera when toggling webcam section
  useEffect(() => {
    if (showWebcam) {
      // reset state
      setError(null);
      setAutoCaptureCountdown(null);
      setIsAutoCapturing(false);
      alignedStreakRef.current = 0;
      misalignedStreakRef.current = 0;
      setFaceDetection({ isFaceDetected: false, isFaceAligned: false });
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWebcam]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white shadow-lg z-50 transform transition-all duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-12' : 'w-64'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isCollapsed ? 'p-2' : 'p-4'} border-b border-gray-200`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">PDF Editor</h2>
                <p className="text-xs text-gray-500">Con Webcam</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto" title="PDF Editor">
              <FileText className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:block p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
            >
              <Menu className={`${isCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-600`} />
            </button>
            <button
              onClick={onToggle}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} text-gray-600`} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'}`}>
          {!isCollapsed && <h3 className="text-sm font-medium text-gray-700 mb-3">Navegación</h3>}
          <nav className={`${isCollapsed ? 'space-y-2' : 'space-y-1'}`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentStep === item.id;
              const isDisabled = item.disabled;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isDisabled) return;
                    if (item.id === 'tomar-foto') {
                      setShowWebcam(true);
                      return;
                    }
                    onNavigate(item.id);
                  }}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} 
                    ${isCollapsed ? 'p-2' : 'px-3 py-2.5'} rounded-lg text-left transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  title={isCollapsed ? `${item.label}${item.description ? ` - ${item.description}` : ''}` : undefined}
                  data-tooltip-id="sidebar-tooltip"
                >
                  <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-5 h-5'} ${isActive ? 'text-blue-600' : ''}`} />
                  {!isCollapsed && (
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Actions */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200`}>
          {!isCollapsed && <h3 className="text-sm font-medium text-gray-700 mb-3">Acciones Rápidas</h3>}
          <div className={`${isCollapsed ? 'space-y-2' : 'space-y-2'}`}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isDisabled = action.disabled;
              
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} 
                    ${isCollapsed ? 'p-3' : 'px-3 py-2'} rounded-lg text-left transition-all duration-200
                    ${isCollapsed ? 'hover:bg-gray-100' : ''}
                    ${isDisabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  title={isCollapsed ? action.label : undefined}
                >
                  <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  {!isCollapsed && <span className="text-sm font-medium">{action.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Estado</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasCapturedImage ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-gray-600">
                  {hasCapturedImage ? 'Foto capturada' : 'Sin foto'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasProcessedPDF ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-gray-600">
                  {hasProcessedPDF ? 'PDF procesado' : 'Sin procesar'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Help */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200`}>
          <button 
            className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} w-full rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors`}
            title={isCollapsed ? 'Ayuda' : undefined}
            data-tooltip-id="sidebar-tooltip"
          >
            <HelpCircle className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
            {!isCollapsed && <span className="text-sm">Ayuda</span>}
          </button>
        </div>

        {/* Webcam Section */}
        {showWebcam && !isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Captura de Foto</h3>
              
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {error}
                </div>
              )}

              {!sidebarCapturedImage ? (
                <div className="relative">
                  <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    
                    {(!isStreaming || isFaceApiLoading) && !error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95">
                        <div className="text-center text-white">
                          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-xs">
                            {isFaceApiLoading ? 'Cargando...' : 'Iniciando cámara...'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {isStreaming && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-2 border-white border-dashed rounded-lg"
                             style={{ width: '60%', height: '80%' }}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-16 opacity-50">
                              <svg viewBox="0 0 24 32" fill="white" className="w-full h-full">
                                <path d="M12,2 C16,2 20,6 20,10 C20,14 16,18 12,18 C8,18 4,14 4,10 C4,6 8,2 12,2 Z" 
                                      stroke={faceDetection.isFaceAligned ? "#00FF88" : faceDetection.isFaceDetected ? "#FFD700" : "rgba(255,255,255,0.9)"} 
                                      strokeWidth="1" fill="none" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isAutoCapturing && autoCaptureCountdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black bg-opacity-80 text-white rounded-full w-12 h-12 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-400 animate-pulse">
                              {autoCaptureCountdown}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isStreaming && (
                    <div className="mt-2 text-center">
                      <div className="text-xs text-gray-600 mb-2">
                        {isAutoCapturing && autoCaptureCountdown !== null ? (
                          <span className="text-orange-500">Capturando en {autoCaptureCountdown}s</span>
                        ) : faceDetection.isFaceAligned ? (
                          <span className="text-green-500">Rostro alineado</span>
                        ) : faceDetection.isFaceDetected ? (
                          <span className="text-yellow-500">Rostro detectado</span>
                        ) : (
                          <span className="text-gray-500">Buscando rostro...</span>
                        )}
                      </div>
                      <button
                        onClick={capturePhoto}
                        disabled={!faceDetection.isFaceAligned && !isAutoCapturing}
                        className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs font-medium disabled:bg-gray-400"
                      >
                        {isAutoCapturing ? 'Cancelar' : 'Capturar'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <img 
                    src={sidebarCapturedImage} 
                    alt="Foto capturada" 
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={retakePhoto}
                      className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-xs font-medium"
                    >
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      Otra
                    </button>
                    <button
                      onClick={confirmPhoto}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs font-medium"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Usar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  );
};

export default Sidebar;
