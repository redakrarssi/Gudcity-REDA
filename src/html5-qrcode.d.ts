declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    
    start(
      cameraId: string,
      configuration: {
        fps?: number;
        qrbox?: number | { width: number; height: number };
        aspectRatio?: number;
        disableFlip?: boolean;
        formatsToSupport?: string[];
      },
      qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error: any) => void
    ): Promise<void>;
    
    stop(): Promise<void>;
    
    clear(): void;
    
    static getCameras(): Promise<Array<{id: string; label: string}>>;
  }
} 