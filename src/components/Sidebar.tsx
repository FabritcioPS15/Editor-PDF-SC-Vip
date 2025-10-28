import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  HelpCircle,
  Menu,
  X,
  RotateCcw,
  Check,
  History
} from 'lucide-react';
import { 
  HomeLine,
  Rows01,
  PieChart03,
  Settings01,
  MessageChatCircle,
  LayoutAlt01,
  Folder
} from '@untitledui/icons';
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
  constanciaLoaded?: boolean;
  sede: string;
  onSedeChange: (s: string) => void;
  progressPercent?: number;
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
  onImageCapture,
  constanciaLoaded,
  sede,
  onSedeChange,
  progressPercent
}) => {
  // Webcam states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alignedStreakRef = useRef<number>(0);
  const misalignedStreakRef = useRef<number>(0);
  
  const [isStreaming, setIsStreaming] = useState(false);

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'pdf-template-select':
        return 'Inicio';
      case 'pdf-template':
        return 'Editor PDF';
      case 'preview':
        return 'Descargar PDF';
      case 'constancia-upload':
        return 'Subir constancia';
      case 'constancia-loaded':
        return 'Descargar constancia';
      default:
        return 'Proceso';
    }
  };
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
  const [helpOpen, setHelpOpen] = useState(false);

  // Sync external captured image into the sidebar preview so it's shown first
  useEffect(() => {
    if (capturedImage) {
      setSidebarCapturedImage(capturedImage);
    }
  }, [capturedImage]);

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

  type NavLeaf = { label: string; step: string; icon?: React.ComponentType<any>; disabled?: boolean };
  const navItems: NavLeaf[] = [
    { label: 'Inicio', step: 'pdf-template-select', icon: HomeLine },
    { label: 'Editor PDF', step: 'pdf-template', icon: Rows01 },
    { label: 'Descargar PDF', step: 'preview', icon: PieChart03, disabled: !hasProcessedPDF },
    { label: 'Subir constancia', step: 'constancia-upload', icon: Folder },
    { label: 'Descargar constancia', step: 'constancia-loaded', icon: LayoutAlt01, disabled: !constanciaLoaded }
  ];

  const quickActions = [
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
      icon: Rows01,
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
      // reset detection state
      setError(null);
      setAutoCaptureCountdown(null);
      setIsAutoCapturing(false);
      alignedStreakRef.current = 0;
      misalignedStreakRef.current = 0;
      setFaceDetection({ isFaceDetected: false, isFaceAligned: false });
      // Only start camera if there is no captured image to show first
      if (!sidebarCapturedImage) {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWebcam, sidebarCapturedImage]);

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
        fixed top-0 left-0 h-screen bg-orange-600 shadow-lg z-50 overflow-y-auto flex flex-col transition-all duration-300 ease-out
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        ${isCollapsed ? 'w-20' : 'w-72'}
        lg:opacity-100 lg:pointer-events-auto lg:sticky lg:top-0 lg:z-auto
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isCollapsed ? 'p-2' : 'p-4'} border-b border-orange-500`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <LayoutAlt01 className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">PDF Editor</h2>
                <p className="text-sm text-orange-100">Con Webcam</p>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-2 ${isCollapsed ? 'w-full justify-center' : ''}`}>
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'p-1.5'} hover:bg-orange-500 rounded-lg transition-colors`}
              title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
              aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
            >
              <Menu className={`w-6 h-6 text-white`} />
            </button>
            {!isCollapsed && (
              <button
                onClick={onToggle}
                className="lg:hidden p-1.5 hover:bg-orange-500 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'}`}>
          {!isCollapsed && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-white mb-1">Sede</label>
              <select
                value={sede}
                onChange={(e) => onSedeChange(e.target.value)}
                className="w-full bg-white/10 text-white placeholder-white/70 border border-orange-400/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-white/60"
              >
                <option className="text-gray-900" value="Sede Central">Sede Central</option>
                <option className="text-gray-900" value="Sede Norte">Sede Norte</option>
                <option className="text-gray-900" value="Sede Sur">Sede Sur</option>
              </select>
            </div>
          )}
          {!isCollapsed && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-orange-100">Progreso</span>
                <span className="text-xs text-orange-100">{Math.max(0, Math.min(100, progressPercent ?? 0))}%</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent ?? 0))}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-orange-100">Paso actual: {getStepTitle(currentStep)}</div>
            </div>
          )}
          {!isCollapsed && <h3 className="text-sm font-medium text-white mb-3">Navegación</h3>}
          <nav className={`${isCollapsed ? 'space-y-2' : 'space-y-1'}`}>
            {navItems.map((item) => {
              const isActive = currentStep === item.step;
              const isDisabled = !!item.disabled;
              const Icon = item.icon;
              return (
                <div key={`leaf-${item.label}`} className="relative group">
                  <button
                    onClick={() => { if (!isDisabled) onNavigate(item.step); }}
                    disabled={isDisabled}
                    aria-label={isCollapsed ? item.label : undefined}
                    className={`
                      relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} 
                      ${isCollapsed ? 'p-3' : 'px-3 py-2.5'} rounded-lg text-left transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-orange-700' 
                        : isDisabled
                          ? 'text-orange-300 cursor-not-allowed'
                          : 'text-white hover:bg-orange-500'
                      }
                    `}
                    title={isCollapsed ? item.label : undefined}
                    data-tooltip-id="sidebar-tooltip"
                  >
                    {isActive && isCollapsed && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-white rounded-r pointer-events-none" />
                    )}
                    {Icon && <Icon className={`w-6 h-6 ${isActive ? 'text-orange-600' : isDisabled ? 'text-orange-300' : 'text-white'}`} />}
                    {!isCollapsed && (
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {item.label}
                        </div>
                      </div>
                    )}
                    {isActive && !isCollapsed && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </button>
                  {isCollapsed && (
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg">
                      {item.label}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Quick Actions */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-orange-500`}>
          {!isCollapsed && <h3 className="text-sm font-medium text-white mb-3">Acciones Rápidas</h3>}
          <div className={`${isCollapsed ? 'space-y-2' : 'space-y-2'}`}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isDisabled = action.disabled;
              const colorClass = !isDisabled ? 'text-white' : 'text-orange-300';
              
              return (
                <div key={action.id} className="relative group">
                  <button
                    onClick={action.action}
                    disabled={isDisabled}
                    aria-label={isCollapsed ? action.label : undefined}
                    className={`
                      relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} 
                      ${isCollapsed ? 'p-3' : 'px-3 py-2'} rounded-lg text-left transition-all duration-200
                      ${isCollapsed ? 'hover:bg-orange-500' : ''}
                      ${isDisabled
                        ? 'text-orange-300 cursor-not-allowed'
                        : 'text-white hover:bg-orange-500'
                      }
                    `}
                    title={isCollapsed ? action.label : undefined}
                  >
                    <Icon className={`w-6 h-6 ${colorClass}`} />
                    {!isCollapsed && <span className="text-sm font-medium">{action.label}</span>}
                  </button>
                  {isCollapsed && (
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg">
                      {action.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status */}
        {!isCollapsed && (
          <div className="p-4 border-t border-orange-500">
            <h3 className="text-sm font-medium text-white mb-3">Estado</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasCapturedImage ? 'bg-green-300' : 'bg-white/50'}`}></div>
                <span className="text-white">
                  {hasCapturedImage ? 'Foto capturada' : 'Sin foto'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasProcessedPDF ? 'bg-green-300' : 'bg-white/50'}`}></div>
                <span className="text-white">
                  {hasProcessedPDF ? 'PDF procesado' : 'Sin procesar'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${constanciaLoaded ? 'bg-green-300' : 'bg-white/50'}`}></div>
                <span className="text-white">
                  {constanciaLoaded ? 'Constancia procesada' : 'Sin constancia'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Support & Settings (below Status and Proceso), visible but disabled */}
        {!isCollapsed && (
          <div className="p-4 border-t border-orange-500">
            <div className="space-y-2">
              
            </div>
          </div>
        )}

        {/* Help (pinned at bottom) */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-orange-500 mt-auto`}>
          <div className="relative group">
            <button 
              onClick={() => !isCollapsed && setHelpOpen(v => !v)}
              className={`relative flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2'} w-full rounded-lg text-white hover:text-white hover:bg-orange-500 transition-colors`}
              title={isCollapsed ? 'Ayuda' : undefined}
              data-tooltip-id="sidebar-tooltip"
              aria-label={isCollapsed ? 'Ayuda' : undefined}
            >
              <span className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                <HelpCircle className={`w-6 h-6`} />
                {!isCollapsed && <span className="text-sm">Ayuda</span>}
              </span>
              {!isCollapsed && (
                <span className="text-xs text-orange-100">{helpOpen ? 'Ocultar' : 'Mostrar'}</span>
              )}
            </button>
            {!isCollapsed && helpOpen && (
              <div className="mt-2 text-xs text-white bg-white/10 border border-orange-400/40 rounded p-3 leading-relaxed">
                <div className="font-medium text-white mb-1">¿Cómo funciona?</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>En Inicio, elige una plantilla de PDF.</li>
                  <li>En Editor, completa los campos requeridos.</li>
                  <li>Captura tu foto desde Inicio cuando se solicite.</li>
                  <li>En Vista Previa, revisa el resultado final.</li>
                  <li>En Completado, descarga tu PDF final.</li>
                </ol>
                <div className="mt-2 text-white/90">
                  Consejos: asegúrate de una buena iluminación y rostro centrado para una mejor captura.
                </div>
              </div>
            )}
            {isCollapsed && (
              <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg">
                Ayuda
              </span>
            )}
          </div>
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
