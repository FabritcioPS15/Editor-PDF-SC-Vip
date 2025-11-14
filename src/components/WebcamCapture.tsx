import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Check, AlertCircle, Timer, Aperture, Upload, X, Camera } from 'lucide-react';
import { faceDetectionService, FaceDetectionResult } from '../utils/faceDetection';

interface WebcamCaptureProps {
  onImageCapture?: (imageDataUrl: string) => void;
  onCapture?: (imageDataUrl: string) => void;
  isProcessing?: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onImageCapture,
  onCapture,
  isProcessing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alignedStreakRef = useRef<number>(0);
  const misalignedStreakRef = useRef<number>(0);
  const capturePhotoRef = useRef<() => void>();

  const [isStreaming, setIsStreaming] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetection, setFaceDetection] = useState<FaceDetectionResult>({
    isFaceDetected: false,
    isFaceAligned: false,
  });
  const [isFaceApiLoading, setIsFaceApiLoading] = useState(true);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(true);
  const [selectedSource, setSelectedSource] = useState<'camera' | 'upload'>('camera');

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCapturedImage(null);
      setIsCameraStarting(true);
      setShowSourceSelector(false);
      
      // Limpiar cualquier stream anterior
      if (streamRef.current) {
        stopCamera();
      }

      // Inicializar Face API si es necesario
      if (isFaceApiLoading) {
        try {
          await faceDetectionService.initialize();
          setIsFaceApiLoading(false);
        } catch (faceError) {
          console.warn('Face API initialization failed:', faceError);
          setIsFaceApiLoading(false);
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user' 
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Esperar a que el video esté listo
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current!;
            
            const onLoaded = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              reject(new Error('Error al cargar el video'));
            };

            const cleanup = () => {
              video.removeEventListener('loadeddata', onLoaded);
              video.removeEventListener('error', onError);
            };

            if (video.readyState >= 2) {
              resolve();
              return;
            }

            video.addEventListener('loadeddata', onLoaded, { once: true });
            video.addEventListener('error', onError, { once: true });

            // Timeout de seguridad
            setTimeout(() => {
              cleanup();
              reject(new Error('Tiempo de espera agotado al cargar la cámara'));
            }, 5000);
          });

          setIsStreaming(true);
          setIsCameraStarting(false);
        }
      } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        setError('No se pudo acceder a la cámara. Por favor verifica los permisos.');
        setShowSourceSelector(true);
        setIsCameraStarting(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('No se pudo acceder a la cámara. Verifica los permisos e inténtalo de nuevo.');
      setIsCameraStarting(false);
    }
  }, [isFaceApiLoading]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsCameraStarting(false);
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

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      console.error('No se puede capturar: video o canvas no están listos');
      return;
    }

    cancelAutoCapture();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('No se pudo obtener el contexto 2D del canvas');
      return;
    }

    // Obtener dimensiones del video
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (!videoWidth || !videoHeight) {
      console.error('Dimensiones de video no disponibles');
      return;
    }

    // Obtener dimensiones del elemento video en pantalla
    const videoRect = video.getBoundingClientRect();
    
    // Marco visible en pantalla
    const frameDisplayWidth = Math.min(600, Math.max(400, videoRect.width * 0.50));
    const frameDisplayHeight = Math.min(600, videoRect.height * 0.90);
    const verticalOffsetDisplay = videoRect.height * 0.16;

    // Mapeo a coordenadas de video
    const scaleX = videoWidth / videoRect.width;
    const scaleY = videoHeight / videoRect.height;
    
    const cropWidth = Math.round(frameDisplayWidth * scaleX);
    const cropHeight = Math.round(frameDisplayHeight * scaleY);
    const cropX = Math.round((videoWidth - cropWidth) / 2);
    const cropY = Math.round((videoHeight - cropHeight) / 2 - verticalOffsetDisplay * scaleY);

    const safeCropX = Math.max(0, Math.min(cropX, videoWidth - cropWidth));
    const safeCropY = Math.max(0, Math.min(cropY, videoHeight - cropHeight));
    const safeCropWidth = Math.max(1, Math.min(cropWidth, videoWidth));
    const safeCropHeight = Math.max(1, Math.min(cropHeight, videoHeight));

    // Configurar canvas y dibujar imagen
    canvas.width = safeCropWidth;
    canvas.height = safeCropHeight;

    context.drawImage(
      video,
      safeCropX,
      safeCropY,
      safeCropWidth,
      safeCropHeight,
      0,
      0,
      safeCropWidth,
      safeCropHeight
    );

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [isStreaming, stopCamera, cancelAutoCapture]);

  // Actualizar la referencia de capturePhoto
  useEffect(() => {
    capturePhotoRef.current = capturePhoto;
  }, [capturePhoto]);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isStreaming || isFaceApiLoading) return;

    try {
      const videoElement = videoRef.current;
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      
      if (!vw || !vh) return;

      const videoRect = videoElement.getBoundingClientRect();

      // Calcular marco de visualización
      const frameDisplayWidth = Math.min(600, Math.max(400, videoRect.width * 0.50));
      const frameDisplayHeight = Math.min(600, videoRect.height * 0.90);
      const verticalOffset = videoRect.height * 0.16;
      
      const frameDisplayBox = {
        x: (videoRect.width - frameDisplayWidth) / 2,
        y: (videoRect.height - frameDisplayHeight) / 2 - verticalOffset,
        width: frameDisplayWidth,
        height: frameDisplayHeight,
      };

      // Mapear a coordenadas de video
      const scaleX = vw / videoRect.width;
      const scaleY = vh / videoRect.height;
      const frameBox = {
        x: Math.max(0, Math.round(frameDisplayBox.x * scaleX)),
        y: Math.max(0, Math.round(frameDisplayBox.y * scaleY)),
        width: Math.min(vw, Math.round(frameDisplayBox.width * scaleX)),
        height: Math.min(vh, Math.round(frameDisplayBox.height * scaleY)),
      };

      const result = await faceDetectionService.detectFace(videoElement, frameBox);
      setFaceDetection(result);

      // Lógica de estabilidad
      if (result.isFaceAligned) {
        alignedStreakRef.current = Math.min(alignedStreakRef.current + 1, 10);
        misalignedStreakRef.current = 0;
      } else {
        misalignedStreakRef.current = Math.min(misalignedStreakRef.current + 1, 10);
        alignedStreakRef.current = 0;
      }

      const alignedStable = alignedStreakRef.current >= 3;
      const misalignedStable = misalignedStreakRef.current >= 3;

      // Iniciar cuenta regresiva solo si está alineado establemente y en modo automático
      if (alignedStable && !isAutoCapturing && !capturedImage && isAutoMode) {
        if (autoCaptureCountdown === null) {
          setAutoCaptureCountdown(2);
          setIsAutoCapturing(true);

          countdownTimerRef.current = setInterval(() => {
            setAutoCaptureCountdown((prev) => {
              if (prev === null || prev <= 1) {
                if (countdownTimerRef.current) {
                  clearInterval(countdownTimerRef.current);
                  countdownTimerRef.current = null;
                }
                // Usar la referencia en lugar de la función directamente
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

      // Cancelar cuenta regresiva si hay desalineación estable
      if (isAutoCapturing && misalignedStable) {
        cancelAutoCapture();
      }
    } catch (error) {
      console.error('Error detecting face:', error);
    }
  }, [isStreaming, isFaceApiLoading, isAutoCapturing, capturedImage, autoCaptureCountdown, isAutoMode, cancelAutoCapture]);

const retakePhoto = useCallback(() => {
  // Reset all camera-related states
  setCapturedImage(null);
  setError(null);
  setShowSourceSelector(false);
  setFaceDetection({
    isFaceDetected: false,
    isFaceAligned: false
  });
  
  // Reset camera state
  stopCamera();
  
  // Small delay to ensure camera is fully stopped before restarting
  setTimeout(() => {
    startCamera().catch(err => {
      console.error('Error al reiniciar la cámara:', err);
      setError('No se pudo reiniciar la cámara');
      setShowSourceSelector(true);
    });
  }, 300);
}, [startCamera, stopCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onImageCapture?.(capturedImage);
      onCapture?.(capturedImage);
    }
  }, [capturedImage, onImageCapture, onCapture]);

  const handleSourceChange = useCallback(() => {
    stopCamera();
    setShowSourceSelector(true);
    setError(null);
    setCapturedImage(null);
  }, [stopCamera]);

  const backToSourceSelection = useCallback(() => {
    stopCamera();
    setShowSourceSelector(true);
    setCapturedImage(null);
    setError(null);
  }, [stopCamera]);

  // Efecto para iniciar cámara automáticamente
  useEffect(() => {
    if (selectedSource === 'camera' && !showSourceSelector && !isStreaming && !isCameraStarting) {
      startCamera();
    }
  }, [selectedSource, showSourceSelector, isStreaming, isCameraStarting, startCamera]);

  // Efecto para detección facial
  useEffect(() => {
    if (!isStreaming || isFaceApiLoading) return;
    
    const interval = setInterval(detectFace, 300);
    return () => clearInterval(interval);
  }, [isStreaming, isFaceApiLoading, detectFace]);

  // Efecto de limpieza
  useEffect(() => {
    return () => {
      stopCamera();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [stopCamera]);

  // Manejar subida de imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      if (imageData) {
        setCapturedImage(imageData);
        onImageCapture?.(imageData);
        onCapture?.(imageData);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo de imagen');
    };
    reader.readAsDataURL(file);
  };

  if (showSourceSelector) {
    return (
      <div className="space-y-4 w-full">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 text-center mb-4">Seleccione una opción:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setSelectedSource('camera');
                setShowSourceSelector(false);
              }}
              className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors ${
                selectedSource === 'camera'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Camera className="w-8 h-8 text-blue-600" />
              <span>Tomar foto</span>
            </button>
            <label
              className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors ${
                selectedSource === 'upload'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-8 h-8 text-blue-600" />
              <span>Subir imagen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-700 mb-4">{error}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={startCamera}
            className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Reintentar cámara
          </button>
          <button
            onClick={backToSourceSelection}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cambiar a otra opción
          </button>
        </div>
      </div>
    );
  }

  if (isCameraStarting) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <p className="text-gray-700 mb-4">Iniciando cámara...</p>
      </div>
    );
  }

  if (!isStreaming && !capturedImage && selectedSource === 'camera') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Aperture className="w-8 h-8 text-blue-500" />
        </div>
        <p className="text-gray-700 mb-4">Preparando cámara...</p>
        <button
          onClick={startCamera}
          className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          Iniciar Cámara
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden relative shadow-2xl border-4 border-gray-700">
          {!capturedImage ? (
            <>
              {isStreaming && (
                <div className="relative w-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  
                  {/* Marco de guía */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div 
                      className="border-2 border-dashed border-white rounded-lg opacity-80"
                      style={{
                        width: '50%',
                        height: '70%',
                        marginTop: '-8%'
                      }}
                    ></div>
                  </div>

                  {/* Indicador de estado */}
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

                  {/* Botón de cambiar fuente */}
                  <div className="absolute top-4 left-4">
                    <button
                      onClick={handleSourceChange}
                      className="p-2 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-100"
                      title="Cambiar fuente"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Contador de captura automática */}
                  {isAutoCapturing && autoCaptureCountdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black bg-opacity-80 text-white rounded-full w-24 h-24 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-400 animate-pulse">
                            {autoCaptureCountdown}
                          </div>
                          <div className="text-xs text-gray-300 mt-1">segundos</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botones de control */}
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
                    <button
                      onClick={() => {
                        setIsAutoMode((prev) => {
                          if (prev) cancelAutoCapture();
                          return !prev;
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-2xl transition-colors inline-flex items-center gap-2 ${
                        isAutoMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-700 hover:bg-gray-800 text-white'
                      }`}
                    >
                      <Timer className="w-4 h-4" />
                      {isAutoMode ? 'Automático: ON' : 'Automático: OFF'}
                    </button>

                    <button
                      onClick={isAutoCapturing ? cancelAutoCapture : capturePhoto}
                      disabled={!isStreaming || (isAutoMode && !faceDetection.isFaceAligned && !isAutoCapturing)}
                      className={`group relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        (!isAutoMode || faceDetection.isFaceAligned) || isAutoCapturing 
                          ? (isAutoCapturing 
                              ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white' 
                              : 'bg-gradient-to-br from-orange-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                            )
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      {isAutoCapturing ? (
                        <div className="w-8 h-8 relative z-10 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white rounded-full"></div>
                          <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      ) : (
                        <Aperture className="w-8 h-8 relative z-10" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Foto capturada" 
                className="w-full h-auto object-cover block" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none"></div>
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Foto capturada
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4 p-4 bg-white border-t border-gray-200">
                <button
                  onClick={backToSourceSelection}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cambiar fuente
                </button>
                <button
                  onClick={retakePhoto}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-base font-medium"
                >
                  <RotateCcw className="w-5 h-5" />
                  Volver a tomar
                </button>
                <button
                  onClick={confirmPhoto}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-base font-medium"
                >
                  <Check className="w-5 h-5" />
                  Usar esta foto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default WebcamCapture;