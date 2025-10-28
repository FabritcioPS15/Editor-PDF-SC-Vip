import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { faceDetectionService, FaceDetectionResult } from '../utils/faceDetection';

interface WebcamCaptureProps {
  onImageCapture?: (imageDataUrl: string) => void;
  onCapture?: (imageDataUrl: string) => void;
  isProcessing?: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onImageCapture, onCapture, isProcessing = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alignedStreakRef = useRef<number>(0);
  const misalignedStreakRef = useRef<number>(0);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetection, setFaceDetection] = useState<FaceDetectionResult>({
    isFaceDetected: false,
    isFaceAligned: false
  });
  const [isFaceApiLoading, setIsFaceApiLoading] = useState(true);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Initialize Face API
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
        video: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        // Wait for dimensions to be available and start playback
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
      setError('No se pudo acceder a la cámara. Por favor verifica los permisos.');
    }
  }, [isFaceApiLoading]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const cancelAutoCapture = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoCaptureCountdown(null);
    setIsAutoCapturing(false);
    alignedStreakRef.current = 0;
    misalignedStreakRef.current = 0;
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isStreaming || isFaceApiLoading) return;

    try {
      const videoElement = videoRef.current;
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      if (!vw || !vh) {
        return;
      }
      const videoRect = videoElement.getBoundingClientRect();
      
      // Calculate frame box coordinates (the white dashed frame)
      const frameDisplayWidth = Math.min(500, Math.max(400, videoRect.width * 0.30));
      const frameDisplayHeight = Math.min(450, videoRect.height * 1.20);
      
      // Frame in DISPLAY coordinates
      const frameDisplayBox = {
        x: (videoRect.width - frameDisplayWidth) / 2,
        y: (videoRect.height - frameDisplayHeight) / 2,
        width: frameDisplayWidth,
        height: frameDisplayHeight
      };

      // Map display frame to VIDEO coordinate space
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
      
      // Debug logging
      console.log('Face detection result:', result);
      
      // Stability logic to avoid flicker resets
      if (result.isFaceAligned) {
        alignedStreakRef.current = Math.min(alignedStreakRef.current + 1, 10);
        misalignedStreakRef.current = 0;
      } else {
        misalignedStreakRef.current = Math.min(misalignedStreakRef.current + 1, 10);
        alignedStreakRef.current = 0;
      }

      const alignedStable = alignedStreakRef.current >= 3; // ~0.9s with 300ms interval
      const misalignedStable = misalignedStreakRef.current >= 3;

      // Start countdown only after stability
      if (alignedStable && !isAutoCapturing && !capturedImage) {
        if (autoCaptureCountdown === null) {
          setAutoCaptureCountdown(2);
          setIsAutoCapturing(true);

          countdownTimerRef.current = setInterval(() => {
            setAutoCaptureCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownTimerRef.current!);
                if (capturePhotoRef.current) {
                  capturePhotoRef.current();
                }
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }

      // Only cancel countdown if misalignment is stable for a short period
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
  }, [isStreaming, isFaceApiLoading, isAutoCapturing, capturedImage, autoCaptureCountdown]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Cancel any ongoing auto-capture
    cancelAutoCapture();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const tryCapture = async (attempt: number): Promise<boolean> => {
      // Pequeña espera a frame real
      await new Promise<void>(r => requestAnimationFrame(() => r()))
      
      // Obtener las dimensiones del video
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      if (!videoWidth || !videoHeight) {
        return false;
      }
      
      // Obtener las dimensiones del elemento video en pantalla
      const videoElement = videoRef.current!;
      const videoRect = videoElement.getBoundingClientRect();
      const videoDisplayWidth = videoRect.width;
      const videoDisplayHeight = videoRect.height;
      
      // Marco visible en pantalla
      const frameDisplayWidth = Math.min(500, Math.max(400, videoDisplayWidth * 0.30));
      const frameDisplayHeight = Math.min(450, videoDisplayHeight * 1.20);
      
      // Mapeo a coordenadas de video
      const scaleX = videoWidth / videoDisplayWidth;
      const scaleY = videoHeight / videoDisplayHeight;
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

      // Verificar si quedó negro
      const pixel = context.getImageData(Math.floor(safeCropWidth/2), Math.floor(safeCropHeight/2), 1, 1).data;
      const avg = (pixel[0] + pixel[1] + pixel[2]) / 3;
      const looksBlack = avg < 2; // casi negro
      if (looksBlack && attempt < 3) {
        await new Promise(res => setTimeout(res, 80));
        return tryCapture(attempt + 1);
      }
      return !looksBlack;
    };

    (async () => {
      const ok = await tryCapture(1);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      if (ok) {
        stopCamera();
      } else {
        console.warn('La captura parece negra tras reintentos');
      }
    })();
  }, [stopCamera, cancelAutoCapture]);

  const capturePhotoRef = useRef<() => void>();
  capturePhotoRef.current = capturePhoto;

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    cancelAutoCapture();
    startCamera();
  }, [startCamera, cancelAutoCapture]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      if (onImageCapture) {
        onImageCapture(capturedImage);
      }
      if (onCapture) {
        onCapture(capturedImage);
      }
    }
  }, [capturedImage, onImageCapture, onCapture]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Face detection effect
  useEffect(() => {
    if (!isStreaming || isFaceApiLoading) return;

    // Set optimal detection interval
    faceDetectionService.setDetectionThrottle(300); // 300ms for better responsiveness
    
    const interval = setInterval(detectFace, 300); // Detect every 300ms
    return () => clearInterval(interval);
  }, [isStreaming, isFaceApiLoading, detectFace]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 max-w-md">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm flex-1">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Contenedor principal de la cámara */}
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden relative shadow-2xl border-4 border-gray-700">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Overlay de carga */}
              {(!isStreaming || isFaceApiLoading) && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95">
                  <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium">
                      {isFaceApiLoading ? 'Cargando detección facial...' : 'Iniciando cámara...'}
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      {isFaceApiLoading ? 'Preparando modelos de IA' : 'Por favor, permite el acceso a la cámara'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Overlay de error */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95">
                  <div className="text-center text-white p-6">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <h3 className="text-xl font-semibold mb-2">Error de Cámara</h3>
                    <p className="text-gray-300 mb-6">No se pudo acceder a la cámara</p>
                    <button
                      onClick={startCamera}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg"
                    >
                      Intentar nuevamente
                    </button>
                  </div>
                </div>
              )}
              
              {/* Overlay de guía cuando está transmitiendo */}
              {isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Área de recorte mejorada */}
                      <div 
                        className="border-4 border-white border-dashed shadow-2xl relative bg-transparent"
                        style={{
                          width: '30%',
                          height: '120%',
                          minWidth: '400px',
                          minHeight: '450px',
                          maxWidth: '500px',
                          maxHeight: '450px',
                          borderRadius: '12px',
                          borderStyle: 'dashed',
                          borderWidth: '4px'
                        }}
                      >
                     {/* Guía de posicionamiento mejorada */}
<div className="absolute inset-0 flex items-center justify-center">
  <div className="w-80 h-120 opacity-35"> {/* Aumentamos el tamaño */}
    <svg viewBox="0 0 96 128" fill="white" className="w-full h-full drop-shadow-2xl">
      {/* Silueta anatómicamente más parecida a un rostro humano */}
     {/* Silueta anatómicamente más parecida a un rostro humano */} 
     <path d=" M48,8 C66,8 80,30 80,54 C80,76 66,98 56,106 C52,110 44,110 40,106 C30,98 16,76 16,54 C16,30 30,8 48,8 Z " 
     stroke={faceDetection.isFaceAligned ? "#00FF88" : faceDetection.isFaceDetected ? "#FFD700" : "rgba(255,255,255,0.9)"} 
     strokeWidth="2" fill="none" /> </svg>
  </div>
</div>

                    {/* Indicador de estado de detección facial */}
                    {isStreaming && !isFaceApiLoading && (
                      <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm">
                        {isAutoCapturing && autoCaptureCountdown !== null ? (
                          <div className="flex items-center gap-2 text-orange-400">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                            Capturando en {autoCaptureCountdown}s
                          </div>
                        ) : faceDetection.isFaceAligned ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Rostro alineado
                          </div>
                        ) : faceDetection.isFaceDetected ? (
                          <div className="flex items-center gap-2 text-yellow-400">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            Rostro detectado
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Buscando rostro...
                          </div>
                        )}
                      </div>
                    )}

                    </div>
                  </div>
                </div>
              )}

              {/* Contador de captura automática */}
              {isAutoCapturing && autoCaptureCountdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <div className="bg-black bg-opacity-80 text-white rounded-full w-24 h-24 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-400 animate-pulse">
                        {autoCaptureCountdown}
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        segundos
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botón de captura mejorado */}
              {isStreaming && (
                <div className="absolute bottom-6 right-6 z-20">
                  <button
                    onClick={isAutoCapturing ? cancelAutoCapture : capturePhoto}
                    disabled={!faceDetection.isFaceAligned && !isAutoCapturing}
                    className={`group relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                      faceDetection.isFaceAligned || isAutoCapturing
                        ? isAutoCapturing 
                          ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                          : 'bg-gradient-to-br from-orange-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    }`}
                    title={
                      isAutoCapturing 
                        ? 'Cancelar captura automática' 
                        : faceDetection.isFaceAligned 
                          ? 'Capturar foto manualmente' 
                          : 'Alinea tu rostro dentro del marco para capturar'
                    }
                  >
                    <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    {isAutoCapturing ? (
                      <div className="w-8 h-8 relative z-10 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white rounded-full"></div>
                        <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      <Camera className="w-8 h-8 relative z-10" />
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Vista previa de la foto capturada */
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Foto capturada" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Foto capturada
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      {/* Botones de acción mejorados */}
      {capturedImage && (
        <div className="w-full max-w-md mt-8">
          <div className="flex gap-4">
            <button
              onClick={retakePhoto}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-3 bg-gray-600 hover:bg-gray-700 text-white px-6 py-4 rounded-xl text-lg font-medium disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <RotateCcw className="w-6 h-6" />
              Tomar otra
            </button>
            <button
              onClick={confirmPhoto}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl text-lg font-medium disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Usar foto
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;