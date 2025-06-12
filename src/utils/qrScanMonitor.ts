/**
 * QR Code Scanning Monitor Utility
 * 
 * This utility helps diagnose QR code scanning issues by providing
 * real-time monitoring and diagnostics.
 */

// Track scanning success rate
let totalScans = 0;
let successfulScans = 0;
let failedScans = 0;
let lastErrors: Array<{
  time: Date;
  error: string;
  data?: any;
}> = [];

// Store the last 10 successful and failed scans
const MAX_HISTORY = 10;
const successfulScanHistory: Array<{
  time: Date;
  qrType: string;
  data: any;
}> = [];
const failedScanHistory: Array<{
  time: Date;
  error: string;
  rawData?: string;
  parsedData?: any;
}> = [];

/**
 * Record a successful QR code scan
 */
export function recordSuccessfulScan(qrType: string, data: any): void {
  totalScans++;
  successfulScans++;
  
  successfulScanHistory.unshift({
    time: new Date(),
    qrType,
    data
  });
  
  if (successfulScanHistory.length > MAX_HISTORY) {
    successfulScanHistory.pop();
  }
  
  // Log to console if in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ QR scan success: ${qrType}`, data);
  }
}

/**
 * Record a failed QR code scan
 */
export function recordFailedScan(error: string, rawData?: string, parsedData?: any): void {
  totalScans++;
  failedScans++;
  
  const errorEntry = {
    time: new Date(),
    error,
    rawData: rawData ? (rawData.length > 100 ? rawData.substring(0, 100) + '...' : rawData) : undefined,
    parsedData
  };
  
  failedScanHistory.unshift(errorEntry);
  if (failedScanHistory.length > MAX_HISTORY) {
    failedScanHistory.pop();
  }
  
  // Always track last 3 errors for immediate reference
  lastErrors.unshift({ time: new Date(), error, data: parsedData });
  if (lastErrors.length > 3) {
    lastErrors.pop();
  }
  
  // Log to console
  console.error(`❌ QR scan failed: ${error}`, { rawData: errorEntry.rawData, parsedData });
}

/**
 * Get scan statistics for monitoring
 */
export function getScanStatistics() {
  const successRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;
  
  return {
    totalScans,
    successfulScans,
    failedScans,
    successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    lastErrors,
    recentSuccessfulScans: successfulScanHistory,
    recentFailedScans: failedScanHistory
  };
}

/**
 * Reset statistics (for testing or clearing history)
 */
export function resetScanStatistics(): void {
  totalScans = 0;
  successfulScans = 0;
  failedScans = 0;
  lastErrors = [];
  successfulScanHistory.length = 0;
  failedScanHistory.length = 0;
}

/**
 * Diagnose potential issues with QR code format
 */
export function diagnoseQrCodeFormat(rawData: string): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;
  
  // Check if it's a valid JSON
  try {
    const parsed = JSON.parse(rawData);
    
    // Check for required fields based on type
    if (parsed.type === 'CUSTOMER_CARD' || parsed.type === 'customer_card') {
      if (!parsed.customerId) {
        issues.push('Missing customerId field in customer card QR code');
        isValid = false;
        recommendations.push('Ensure customer card QR codes include the customerId field');
      }
    } else if (parsed.type === 'LOYALTY_CARD' || parsed.type === 'loyalty_card') {
      if (!parsed.cardId || !parsed.programId) {
        issues.push('Missing cardId or programId field in loyalty card QR code');
        isValid = false;
        recommendations.push('Ensure loyalty card QR codes include both cardId and programId fields');
      }
    } else if (parsed.type === 'PROMO_CODE' || parsed.type === 'promo_code') {
      if (!parsed.promoCode) {
        issues.push('Missing promoCode field in promo code QR code');
        isValid = false;
        recommendations.push('Ensure promo code QR codes include the promoCode field');
      }
    } else {
      issues.push(`Unknown or missing QR code type: ${parsed.type}`);
      isValid = false;
      recommendations.push('Set the "type" field to one of: "CUSTOMER_CARD", "LOYALTY_CARD", or "PROMO_CODE"');
    }
  } catch (error) {
    issues.push('QR code content is not valid JSON');
    isValid = false;
    recommendations.push('Ensure QR code content is valid JSON');
  }
  
  return {
    isValid,
    issues,
    recommendations
  };
}

export default {
  recordSuccessfulScan,
  recordFailedScan,
  getScanStatistics,
  resetScanStatistics,
  diagnoseQrCodeFormat
}; 