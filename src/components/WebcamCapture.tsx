import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface WebcamCaptureProps {
  onImageCapture: (imageDataUrl: string) => void;
  isProcessing: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onImageCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('No se pudo acceder a la cámara. Por favor verifica los permisos.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Calculate crop area - only horizontal cropping (sides only)
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Crop area: full height, 85% width (only crop sides horizontally)
    const cropWidth = videoWidth * 0.85;  // 85% width (crop 15% from sides)
    const cropHeight = videoHeight;       // Full height (no vertical cropping)
    const cropX = (videoWidth - cropWidth) / 2;  // Center horizontally
    const cropY = 0;                      // No vertical offset

    // Set canvas dimensions to cropped size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Draw the cropped video frame to canvas
    context.drawImage(
      video, 
      cropX, cropY, cropWidth, cropHeight,  // source rectangle (cropped area)
      0, 0, cropWidth, cropHeight           // destination rectangle (full canvas)
    );

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onImageCapture(capturedImage);
    }
  }, [capturedImage, onImageCapture]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isStreaming && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center text-white">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p>Iniciando cámara...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center text-white">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                  <button
                    onClick={startCamera}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Intentar nuevamente
                  </button>
                </div>
              </div>
            )}
            {isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="relative w-full h-full flex items-center justify-center">
                  <div 
                    className="w-4/5 h-4/5 rounded-lg"
                    style={{
                      border: '2px dashed #ffffff',
                      boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'transparent',
                      minWidth: '250px',
                      minHeight: '300px',
                      maxWidth: '350px',
                      maxHeight: '450px'
                    }}
                  ></div>
                  {/* Texto de guía */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-80 px-3 py-1 rounded z-20">
                    Colocar su rostro aquí
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {!capturedImage ? (
          <button
            onClick={capturePhoto}
            disabled={!isStreaming}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Camera className="w-5 h-5" />
            Capturar Foto
          </button>
        ) : (
          <>
            <button
              onClick={retakePhoto}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Tomar Otra
            </button>
            <button
              onClick={confirmPhoto}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 disabled:bg-yellow-400 transition-colors"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Usar Esta Foto
                </>
              )}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <Camera className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-900 mb-1">Tips para una mejor foto:</p>
            <ul className="text-orange-800 space-y-1 text-xs">
              <li>• Asegúrate de tener buena iluminación</li>
              <li>• Mantén la cámara estable al capturar</li>
              <li>• Centra tu rostro dentro del área marcada</li>
              <li>• Evita fondos muy brillantes o con mucho contraste</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;