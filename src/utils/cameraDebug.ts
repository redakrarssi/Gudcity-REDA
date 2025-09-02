/**
 * Camera Debug Utility
 * 
 * Provides debugging information for camera permission issues
 */

export interface CameraDebugInfo {
  protocol: string;
  hostname: string;
  isSecure: boolean;
  isLocalhost: boolean;
  browserName: string;
  browserVersion: string;
  userAgent: string;
  mediaDevicesSupported: boolean;
  getUserMediaSupported: boolean;
  enumerateDevicesSupported: boolean;
}

/**
 * Gets comprehensive debug information about the camera environment
 */
export function getCameraDebugInfo(): CameraDebugInfo {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
  const isSecure = protocol === 'https:' || isLocalhost;
  
  // Browser detection
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (/Firefox/.test(userAgent)) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (/Edge|Edg/.test(userAgent)) {
    browserName = 'Edge';
    const match = userAgent.match(/Edge\/(\d+\.\d+)|Edg\/(\d+\.\d+)/);
    if (match) browserVersion = match[1] || match[2];
  }
  
  return {
    protocol,
    hostname,
    isSecure,
    isLocalhost,
    browserName,
    browserVersion,
    userAgent,
    mediaDevicesSupported: !!(navigator.mediaDevices),
    getUserMediaSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    enumerateDevicesSupported: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
  };
}

/**
 * Logs debug information to console for troubleshooting
 */
export function logCameraDebugInfo(): void {
  const info = getCameraDebugInfo();
  
  console.group('🔍 Camera Debug Information');
  console.log('🌐 Environment:', {
    protocol: info.protocol,
    hostname: info.hostname,
    isSecure: info.isSecure,
    isLocalhost: info.isLocalhost
  });
  console.log('🌍 Browser:', {
    name: info.browserName,
    version: info.browserVersion,
    userAgent: info.userAgent
  });
  console.log('📹 API Support:', {
    mediaDevices: info.mediaDevicesSupported,
    getUserMedia: info.getUserMediaSupported,
    enumerateDevices: info.enumerateDevicesSupported
  });
  console.groupEnd();
}

/**
 * Gets user-friendly environment description
 */
export function getEnvironmentDescription(): string {
  const info = getCameraDebugInfo();
  
  if (!info.isSecure) {
    return `⚠️ Insecure connection (${info.protocol}//${info.hostname}) - HTTPS required for camera access`;
  }
  
  if (info.isLocalhost) {
    return `🏠 Development environment (${info.hostname})`;
  }
  
  return `🌍 Production environment (${info.protocol}//${info.hostname})`;
}

export default {
  getCameraDebugInfo,
  logCameraDebugInfo,
  getEnvironmentDescription
};
