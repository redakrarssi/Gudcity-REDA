/**
 * Helper utility for defining environment variables with proper typing
 * 
 * @param envVars Object containing environment variables
 * @returns The typed environment variables object
 */
export function defineEnv<T extends Record<string, any>>(envVars: T): T {
  return envVars;
} 