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

// Create HMAC using Web Crypto API
export async function createHmac(algorithm: string, key: string): Promise<HmacInterface> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(key);
  
  // Import the key for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: algorithm.replace('sha', 'SHA-') },
    false,
    ['sign']
  );
  
  return {
    update: (data: string) => {
      return {
        digest: async (encoding: string) => {
          const dataBuffer = encoder.encode(data);
          const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
          
          if (encoding === 'hex') {
            return bufferToHex(signature);
          }
          return signature;
        }
      };
    }
  };
}

// Interface for HMAC compatibility
interface HmacInterface {
  update: (data: string) => {
    digest: (encoding: string) => Promise<string | ArrayBuffer>;
  };
}

// Timing-safe comparison using Web Crypto API
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

// Convert hex string to Uint8Array
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export default {
  createSha256Hash,
  bufferToHex,
  generateRandomBytes,
  createHmac,
  timingSafeEqual,
  hexToUint8Array
}; 