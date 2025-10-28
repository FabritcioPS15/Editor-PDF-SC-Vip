import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  isFaceDetected: boolean;
  isFaceAligned: boolean;
  faceBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
}

class FaceDetectionService {
  private isInitialized = false;
  private isInitializing = false;
  private lastDetectionTime = 0;
  private detectionThrottle = 500; // ms

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      // Load the models from CDN
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      this.isInitialized = true;
      console.log('Face API models loaded successfully');
    } catch (error) {
      console.error('Error loading Face API models:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async detectFace(
    videoElement: HTMLVideoElement,
    frameBox: { x: number; y: number; width: number; height: number }
  ): Promise<FaceDetectionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Throttle detection calls
    const now = Date.now();
    if (now - this.lastDetectionTime < this.detectionThrottle) {
      return {
        isFaceDetected: false,
        isFaceAligned: false
      };
    }
    this.lastDetectionTime = now;

    try {
      // Detect faces in the video
      const detections = await faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
        )
        .withFaceLandmarks();

      if (detections.length === 0) {
        return {
          isFaceDetected: false,
          isFaceAligned: false
        };
      }

      // Get the largest face (most likely the main subject)
      const mainFace = detections.reduce((largest, current) => {
        const currentArea = current.detection.box.width * current.detection.box.height;
        const largestArea = largest.detection.box.width * largest.detection.box.height;
        return currentArea > largestArea ? current : largest;
      });

      const faceBox = mainFace.detection.box;
      const confidence = mainFace.detection.score;

      // Check if face is within the frame boundaries
      const isFaceInFrame = this.isFaceWithinFrame(faceBox, frameBox);
      
      // Check if face is properly aligned (centered and good size)
      const isFaceAligned = this.isFaceAligned(faceBox, frameBox);

      console.log('Face detection details:', {
        faceBox,
        frameBox,
        isFaceInFrame,
        isFaceAligned,
        confidence
      });

      return {
        isFaceDetected: true,
        isFaceAligned: isFaceInFrame && isFaceAligned,
        faceBox: {
          x: faceBox.x,
          y: faceBox.y,
          width: faceBox.width,
          height: faceBox.height
        },
        confidence
      };
    } catch (error) {
      console.error('Error detecting face:', error);
      return {
        isFaceDetected: false,
        isFaceAligned: false
      };
    }
  }

  private isFaceWithinFrame(faceBox: any, frameBox: { x: number; y: number; width: number; height: number }): boolean {
    const faceCenterX = faceBox.x + faceBox.width / 2;
    const faceCenterY = faceBox.y + faceBox.height / 2;
    
    return (
      faceCenterX >= frameBox.x &&
      faceCenterX <= frameBox.x + frameBox.width &&
      faceCenterY >= frameBox.y &&
      faceCenterY <= frameBox.y + frameBox.height
    );
  }

  private isFaceAligned(faceBox: any, frameBox: { x: number; y: number; width: number; height: number }): boolean {
    const faceCenterX = faceBox.x + faceBox.width / 2;
    const faceCenterY = faceBox.y + faceBox.height / 2;
    const frameCenterX = frameBox.x + frameBox.width / 2;
    const frameCenterY = frameBox.y + frameBox.height / 2;

    // Check if face is centered within the frame (with some tolerance)
    const centerTolerance = Math.max(60, Math.min(140, Math.round(Math.min(frameBox.width, frameBox.height) * 0.15)));
    const isCentered = 
      Math.abs(faceCenterX - frameCenterX) < centerTolerance &&
      Math.abs(faceCenterY - frameCenterY) < centerTolerance;

    // Check if face size is appropriate (not too small or too large)
    const faceArea = faceBox.width * faceBox.height;
    const frameArea = frameBox.width * frameBox.height;
    const faceRatio = faceArea / frameArea;
    
    // Face should be between 8% and 75% of the frame area
    const isGoodSize = faceRatio >= 0.08 && faceRatio <= 0.75;

    // Debug logging
    console.log('Face alignment check:', {
      faceCenter: { x: faceCenterX, y: faceCenterY },
      frameCenter: { x: frameCenterX, y: frameCenterY },
      centerDistance: { x: Math.abs(faceCenterX - frameCenterX), y: Math.abs(faceCenterY - frameCenterY) },
      centerTolerance,
      isCentered,
      faceRatio,
      isGoodSize,
      result: isCentered && isGoodSize
    });

    return isCentered && isGoodSize;
  }

  // Convert video coordinates to display coordinates
  convertToDisplayCoordinates(
    faceBox: { x: number; y: number; width: number; height: number },
    videoElement: HTMLVideoElement
  ): { x: number; y: number; width: number; height: number } {
    const videoRect = videoElement.getBoundingClientRect();
    const scaleX = videoRect.width / videoElement.videoWidth;
    const scaleY = videoRect.height / videoElement.videoHeight;

    return {
      x: faceBox.x * scaleX,
      y: faceBox.y * scaleY,
      width: faceBox.width * scaleX,
      height: faceBox.height * scaleY
    };
  }

  // Adjust detection sensitivity
  setDetectionThrottle(throttleMs: number): void {
    this.detectionThrottle = Math.max(100, throttleMs); // Minimum 100ms
  }

  // Get current detection status
  isReady(): boolean {
    return this.isInitialized && !this.isInitializing;
  }
}

export const faceDetectionService = new FaceDetectionService();
