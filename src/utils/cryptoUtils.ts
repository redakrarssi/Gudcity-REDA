/**
 * CryptoUtils - Provides cryptographic functions that work in both Node.js and browser environments.
 * This abstraction layer allows us to avoid direct imports of the Node.js crypto module,
 * which causes issues with Vite in browser environments.
 */

// Using Web Crypto API compatible functions instead of direct Node.js crypto imports
export async function createSha256Hash(data: string): Promise<string> {
  // Convert string to ArrayBuffer
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Create a hash using the subtle crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert hash to hex string
  return bufferToHex(hashBuffer);
}

// Helper function to convert buffer to hex string
export function bufferToHex(buffer: ArrayBuffer): string {
  // Convert ArrayBuffer to hex string
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a secure random token using Web Crypto API
export function generateRandomBytes(length: number = 32): string {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default {
  createSha256Hash,
  bufferToHex,
  generateRandomBytes
}; 