declare module 'html5-qrcode' {
  export interface CameraDevice {
    id: string;
    label: string;
  }

  export interface QrDimensions {
    width: number;
    height: number;
  }

  export interface QrScannerConfig {
    fps?: number;
    qrbox?: number | QrDimensions;
    aspectRatio?: number;
    disableFlip?: boolean;
    formatsToSupport?: string[];
  }

  export class Html5Qrcode {
    constructor(elementId: string);
    
    start(
      cameraId: string,
      configuration: QrScannerConfig,
      qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error: any) => void
    ): Promise<void>;
    
    stop(): Promise<void>;
    
    clear(): void;
    
    static getCameras(): Promise<CameraDevice[]>;
  }
} 