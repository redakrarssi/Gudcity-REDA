import fs from 'fs';

// Try to read the file
try {
  const content = fs.readFileSync('src/services/businessSettingsService.ts', 'utf-8');
  console.log('File exists, length:', content.length);
  
  // Check for problematic escape characters
  const hasEscapes = content.includes('\\');
  console.log('Contains escape characters:', hasEscapes);
  
  // Check for specific problematic patterns
  const hasBackslashNewline = content.includes('\\\n');
  console.log('Contains backslash at line end:', hasBackslashNewline);
  
  // Find the name update SQL section to ensure it's correct
  const nameUpdateSection = content.includes('name = COALESCE(${nameValue}, name)');
  console.log('Contains correct name update:', nameUpdateSection);
  
  // Check DB field mapping
  const dbFieldMap = content.includes("name: 'business_name'");
  console.log('Contains DB field mapping:', dbFieldMap);
  
} catch (error) {
  console.error('Error reading file:', error);
} 