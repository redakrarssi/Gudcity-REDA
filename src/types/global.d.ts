// Global type declarations for the application
interface Window {
  awardPointsDirectly?: (
    customerId: string, 
    programId: string, 
    points: number, 
    description?: string
  ) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
    status?: number;
  }>;
} 