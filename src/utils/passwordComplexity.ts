/**
 * Password Complexity Encouragement System
 * 
 * This system encourages users to create complex passwords while still accepting
 * simpler ones to avoid blocking legitimate users. It provides helpful feedback
 * and suggestions without being overly restrictive.
 */

export interface PasswordComplexityResult {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  suggestions: string[];
  isAcceptable: boolean; // Always true - we accept all passwords
  encouragement: string;
}

/**
 * Analyze password complexity and provide encouragement
 */
export function analyzePasswordComplexity(password: string): PasswordComplexityResult {
  const suggestions: string[] = [];
  let score = 0;
  
  // Length scoring (0-30 points)
  if (password.length >= 12) {
    score += 30;
  } else if (password.length >= 8) {
    score += 20;
    if (password.length < 12) {
      suggestions.push('Consider using at least 12 characters for better security');
    }
  } else {
    score += 10;
    suggestions.push('Use at least 8 characters (12+ recommended)');
  }
  
  // Character variety (0-40 points)
  let varietyScore = 0;
  
  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    varietyScore += 10;
  } else {
    suggestions.push('Add uppercase letters (A-Z)');
  }
  
  // Lowercase letters
  if (/[a-z]/.test(password)) {
    varietyScore += 10;
  } else {
    suggestions.push('Add lowercase letters (a-z)');
  }
  
  // Numbers
  if (/[0-9]/.test(password)) {
    varietyScore += 10;
  } else {
    suggestions.push('Add numbers (0-9)');
  }
  
  // Special characters
  if (/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?~`]/.test(password)) {
    varietyScore += 10;
  } else {
    suggestions.push('Add special characters (!@#$%^&* etc.)');
  }
  
  score += varietyScore;
  
  // Pattern detection (0-20 points)
  let patternScore = 0;
  
  // Avoid common patterns
  if (!/123|abc|qwe|asd|zxc/i.test(password)) {
    patternScore += 5;
  } else {
    suggestions.push('Avoid common keyboard patterns (123, abc, qwe)');
  }
  
  // Avoid repeated characters
  if (!/(.)\1{2,}/.test(password)) {
    patternScore += 5;
  } else {
    suggestions.push('Avoid repeating characters (aaa, 111)');
  }
  
  // Avoid common words
  const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'hello', 'test'];
  const hasCommonWord = commonWords.some(word => 
    password.toLowerCase().includes(word.toLowerCase())
  );
  
  if (!hasCommonWord) {
    patternScore += 5;
  } else {
    suggestions.push('Avoid common words (password, admin, user)');
  }
  
  // Avoid personal info patterns
  if (!/\d{4}/.test(password) && !/\d{6}/.test(password)) {
    patternScore += 5;
  } else {
    suggestions.push('Avoid birth years or phone number patterns');
  }
  
  score += patternScore;
  
  // Bonus points (0-10 points)
  let bonusScore = 0;
  
  // Length bonus
  if (password.length >= 16) {
    bonusScore += 5;
  }
  
  // Complexity bonus
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) {
    bonusScore += 5;
  }
  
  score += bonusScore;
  
  // Determine level
  let level: PasswordComplexityResult['level'];
  let encouragement: string;
  
  if (score >= 90) {
    level = 'excellent';
    encouragement = '🎉 Excellent! Your password is very secure!';
  } else if (score >= 75) {
    level = 'strong';
    encouragement = '🛡️ Great! Your password is strong and secure!';
  } else if (score >= 60) {
    level = 'good';
    encouragement = '✅ Good! Your password is secure!';
  } else if (score >= 40) {
    level = 'fair';
    encouragement = '👍 Fair! Your password is acceptable, but could be stronger.';
  } else {
    level = 'weak';
    encouragement = '⚠️ Your password works, but consider making it stronger for better security.';
  }
  
  // Add specific encouragement based on level
  if (level === 'weak' || level === 'fair') {
    encouragement += ' We recommend using a mix of letters, numbers, and symbols for maximum security.';
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    level,
    suggestions: suggestions.slice(0, 3), // Limit to 3 suggestions
    isAcceptable: true, // Always accept passwords
    encouragement
  };
}

/**
 * Generate password suggestions based on user input
 */
export function generatePasswordSuggestions(baseInput: string = ''): string[] {
  const suggestions: string[] = [];
  
  // If user has started typing, build on it
  if (baseInput.length > 0) {
    const base = baseInput;
    
    // Add common secure patterns
    suggestions.push(`${base}123!`);
    suggestions.push(`${base}@2024`);
    suggestions.push(`${base}Secure!`);
    suggestions.push(`${base}${Math.floor(Math.random() * 1000)}!`);
  } else {
    // Generate completely new suggestions
    const adjectives = ['Strong', 'Secure', 'Safe', 'Powerful', 'Robust'];
    const nouns = ['Password', 'Key', 'Code', 'Lock', 'Guard'];
    const numbers = [2024, 2025, 123, 456, 789];
    const symbols = ['!', '@', '#', '$', '%'];
    
    for (let i = 0; i < 5; i++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = numbers[Math.floor(Math.random() * numbers.length)];
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      
      suggestions.push(`${adj}${noun}${num}${sym}`);
    }
  }
  
  return suggestions;
}

/**
 * Check if password meets minimum security requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  // Always return true - we accept all passwords
  // This function exists for future extensibility
  return true;
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(level: PasswordComplexityResult['level']): string {
  switch (level) {
    case 'excellent':
      return '#10b981'; // Green
    case 'strong':
      return '#059669'; // Green
    case 'good':
      return '#0d9488'; // Teal
    case 'fair':
      return '#f59e0b'; // Yellow
    case 'weak':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Get password strength icon for UI
 */
export function getPasswordStrengthIcon(level: PasswordComplexityResult['level']): string {
  switch (level) {
    case 'excellent':
      return '🛡️';
    case 'strong':
      return '🔒';
    case 'good':
      return '✅';
    case 'fair':
      return '⚠️';
    case 'weak':
      return '🔓';
    default:
      return '❓';
  }
}
