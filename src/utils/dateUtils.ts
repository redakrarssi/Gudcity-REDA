/**
 * Date utility functions for consistent date formatting across the app
 */

/**
 * Format a date in a user-friendly format
 */
export function formatDate(date: Date | string): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date with time in a user-friendly format
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date with time:', error);
    return 'Invalid date';
  }
}

/**
 * Calculate time elapsed since a date in a human-readable format
 * Example: "2 years 3 months", "5 days", etc.
 */
export function calculateTimeElapsed(date: Date | string): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  try {
    // Calculate the difference in milliseconds
    const diffMs = now.getTime() - dateObj.getTime();
    
    // Convert to days for easier calculation
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Calculate years, months and days
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = Math.floor(diffDays % 30);
    
    // Build the string
    const parts = [];
    
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    }
    
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    }
    
    // Only include days if less than a month or as the final unit
    if (days > 0 && (years === 0 || (years === 0 && months === 0))) {
      parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    }
    
    // Handle edge cases
    if (parts.length === 0) {
      if (diffDays === 0) {
        // Less than a day, calculate hours
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          // Less than an hour, calculate minutes
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          return diffMinutes <= 0 ? 'Just now' : `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`;
        }
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
      }
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }
    
    return parts.join(' ');
  } catch (error) {
    console.error('Error calculating time elapsed:', error);
    return 'Invalid date';
  }
}

/**
 * Returns a formatted string for registration duration
 * Example: "15 days registered", "1 month 10 days registered"
 */
export function formatRegistrationDuration(date: Date | string): string {
  const elapsed = calculateTimeElapsed(date);
  return `${elapsed} registered`;
}

/**
 * Calculate the number of months since registration
 * Returns a number representing months
 */
export function calculateMonthsRegistered(date: Date | string): number {
  if (!date) return 0;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  try {
    // Calculate the difference in months
    const yearDiff = now.getFullYear() - dateObj.getFullYear();
    const monthDiff = now.getMonth() - dateObj.getMonth();
    const dayDiff = now.getDate() - dateObj.getDate();
    
    // Calculate total months
    let months = yearDiff * 12 + monthDiff;
    
    // Adjust for day of month
    if (dayDiff < 0) {
      months -= 1;
    }
    
    return Math.max(0, months);
  } catch (error) {
    console.error('Error calculating months registered:', error);
    return 0;
  }
}

/**
 * Format a date as relative to now (e.g. "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  try {
    // Calculate the difference in milliseconds
    const diffMs = now.getTime() - dateObj.getTime();
    
    // Convert to appropriate units
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) {
      return rtf.format(-years, 'year');
    }
    if (months > 0) {
      return rtf.format(-months, 'month');
    }
    if (days > 0) {
      return rtf.format(-days, 'day');
    }
    if (hours > 0) {
      return rtf.format(-hours, 'hour');
    }
    if (minutes > 0) {
      return rtf.format(-minutes, 'minute');
    }
    return rtf.format(-seconds, 'second');
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
}
