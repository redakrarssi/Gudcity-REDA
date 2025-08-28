/**
 * Secure File Upload Utility
 * Prevents file upload vulnerabilities and ensures proper validation
 */

import { v4 as uuidv4 } from 'uuid';

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  DOCUMENT: {
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  QR_CODE: {
    extensions: ['.png', '.jpg', '.jpeg'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    maxSize: 2 * 1024 * 1024 // 2MB
  }
};

// Dangerous file extensions to block
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.pl', '.rb', '.sh', '.cgi',
  '.htaccess', '.htpasswd', '.ini', '.log', '.sql', '.bak', '.tmp',
  '.dll', '.so', '.dylib', '.app', '.deb', '.rpm', '.msi', '.pkg'
];

// Dangerous MIME types to block
const DANGEROUS_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msi',
  'application/x-msdos-program',
  'application/x-msdos-windows',
  'application/x-msi',
  'application/x-msdos-program',
  'application/x-msdos-windows',
  'application/x-msi',
  'application/x-msdos-program',
  'application/x-msdos-windows',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'text/ecmascript',
  'application/x-httpd-php',
  'application/x-httpd-php-source',
  'text/x-php',
  'application/x-python',
  'text/x-python',
  'application/x-ruby',
  'text/x-ruby',
  'application/x-perl',
  'text/x-perl',
  'application/x-shellscript',
  'text/x-shellscript'
];

/**
 * File upload validation error
 */
export class FileUploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * Validate file extension
 */
function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  if (!filename) return false;
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

/**
 * Validate MIME type
 */
function validateMimeType(mimeType: string, allowedMimeTypes: string[]): boolean {
  if (!mimeType) return false;
  
  return allowedMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Check if file is dangerous
 */
function isDangerousFile(filename: string, mimeType: string): boolean {
  if (!filename || !mimeType) return true;
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const mimeTypeLower = mimeType.toLowerCase();
  
  // Check dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return true;
  }
  
  // Check dangerous MIME types
  if (DANGEROUS_MIME_TYPES.includes(mimeTypeLower)) {
    return true;
  }
  
  // Check for double extensions (e.g., file.jpg.exe)
  const parts = filename.toLowerCase().split('.');
  if (parts.length > 2) {
    const lastExtension = '.' + parts[parts.length - 1];
    const secondLastExtension = '.' + parts[parts.length - 2];
    
    if (DANGEROUS_EXTENSIONS.includes(lastExtension) || 
        DANGEROUS_EXTENSIONS.includes(secondLastExtension)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate file size
 */
function validateFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Generate secure filename
 */
function generateSecureFilename(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomId = uuidv4().substring(0, 8);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  
  // Sanitize filename
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 50);
  
  return `${userId}_${timestamp}_${randomId}_${sanitizedName}${extension}`;
}

/**
 * Validate and process file upload
 */
export function validateFileUpload(
  file: File,
  fileType: keyof typeof ALLOWED_FILE_TYPES,
  userId: string
): {
  isValid: boolean;
  errors: FileUploadError[];
  secureFilename?: string;
  fileData?: {
    originalName: string;
    secureName: string;
    mimeType: string;
    size: number;
    extension: string;
    uploadPath: string;
  };
} {
  const errors: FileUploadError[] = [];
  
  if (!file) {
    errors.push(new FileUploadError('No file provided', 'NO_FILE'));
    return { isValid: false, errors };
  }
  
  const allowedType = ALLOWED_FILE_TYPES[fileType];
  if (!allowedType) {
    errors.push(new FileUploadError('Invalid file type specified', 'INVALID_FILE_TYPE'));
    return { isValid: false, errors };
  }
  
  // Validate file size
  if (!validateFileSize(file.size, allowedType.maxSize)) {
    errors.push(new FileUploadError(
      `File size must be between 1 byte and ${allowedType.maxSize / (1024 * 1024)}MB`,
      'FILE_SIZE_INVALID',
      'size',
      file.size
    ));
  }
  
  // Validate file extension
  if (!validateFileExtension(file.name, allowedType.extensions)) {
    errors.push(new FileUploadError(
      `File extension not allowed. Allowed: ${allowedType.extensions.join(', ')}`,
      'INVALID_EXTENSION',
      'filename',
      file.name
    ));
  }
  
  // Validate MIME type
  if (!validateMimeType(file.type, allowedType.mimeTypes)) {
    errors.push(new FileUploadError(
      `File type not allowed. Allowed: ${allowedType.mimeTypes.join(', ')}`,
      'INVALID_MIME_TYPE',
      'type',
      file.type
    ));
  }
  
  // Check if file is dangerous
  if (isDangerousFile(file.name, file.type)) {
    errors.push(new FileUploadError(
      'File type is not allowed for security reasons',
      'DANGEROUS_FILE',
      'filename',
      file.name
    ));
  }
  
  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push(new FileUploadError(
      'Filename contains invalid characters',
      'INVALID_FILENAME',
      'filename',
      file.name
    ));
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Generate secure filename
  const secureFilename = generateSecureFilename(file.name, userId);
  const extension = file.name.substring(file.name.lastIndexOf('.'));
  const uploadPath = `uploads/${fileType}/${secureFilename}`;
  
  const fileData = {
    originalName: file.name,
    secureName: secureFilename,
    mimeType: file.type,
    size: file.size,
    extension,
    uploadPath
  };
  
  return {
    isValid: true,
    errors: [],
    secureFilename,
    fileData
  };
}

/**
 * Process multiple file uploads
 */
export function validateMultipleFileUploads(
  files: FileList | File[],
  fileType: keyof typeof ALLOWED_FILE_TYPES,
  userId: string,
  maxFiles: number = 5
): {
  isValid: boolean;
  errors: FileUploadError[];
  validFiles: Array<{
    file: File;
    secureFilename: string;
    fileData: any;
  }>;
} {
  const errors: FileUploadError[] = [];
  const validFiles: Array<{
    file: File;
    secureFilename: string;
    fileData: any;
  }> = [];
  
  const fileArray = Array.from(files);
  
  // Check number of files
  if (fileArray.length > maxFiles) {
    errors.push(new FileUploadError(
      `Maximum ${maxFiles} files allowed`,
      'TOO_MANY_FILES',
      'count',
      fileArray.length
    ));
  }
  
  // Validate each file
  for (const file of fileArray) {
    const validation = validateFileUpload(file, fileType, userId);
    
    if (!validation.isValid) {
      errors.push(...validation.errors);
    } else if (validation.fileData) {
      validFiles.push({
        file,
        secureFilename: validation.secureFilename!,
        fileData: validation.fileData
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    validFiles
  };
}

/**
 * Create file upload middleware for Express
 */
export function createFileUploadMiddleware(
  fileType: keyof typeof ALLOWED_FILE_TYPES,
  fieldName: string = 'file',
  maxFiles: number = 1
) {
  return (req: any, res: any, next: any) => {
    try {
      if (!req.files || !req.files[fieldName]) {
        return res.status(400).json({
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }
      
      const files = req.files[fieldName];
      const userId = req.user?.id || 'anonymous';
      
      const validation = maxFiles === 1 
        ? validateFileUpload(files, fileType, userId)
        : validateMultipleFileUploads(files, fileType, userId, maxFiles);
      
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'File validation failed',
          code: 'VALIDATION_FAILED',
          details: validation.errors.map(err => ({
            message: err.message,
            code: err.code,
            field: err.field
          }))
        });
      }
      
      // Add validated file data to request
      req.validatedFiles = validation.validFiles || [{
        file: files,
        secureFilename: validation.secureFilename,
        fileData: validation.fileData
      }];
      
      next();
    } catch (error) {
      console.error('File upload middleware error:', error);
      return res.status(500).json({
        error: 'File upload processing failed',
        code: 'UPLOAD_ERROR'
      });
    }
  };
}

/**
 * Get file type configuration
 */
export function getFileTypeConfig(fileType: keyof typeof ALLOWED_FILE_TYPES) {
  return ALLOWED_FILE_TYPES[fileType];
}

/**
 * Check if file type is supported
 */
export function isFileTypeSupported(fileType: keyof typeof ALLOWED_FILE_TYPES): boolean {
  return fileType in ALLOWED_FILE_TYPES;
}

/**
 * Get all supported file types
 */
export function getSupportedFileTypes(): string[] {
  return Object.keys(ALLOWED_FILE_TYPES);
}