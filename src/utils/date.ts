export function formatRegistrationDuration(fromDate: string | Date, toDate: string | Date = new Date()): string {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'N/A';

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    // borrow days from previous month
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (years === 0 || (years > 0 && months === 0 && days > 0)) {
    // Include days if under one year, or if exactly whole years and days remain
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }

  if (parts.length === 0) return '0 days registered';
  return `${parts.join(' ')} registered`;
}

export function formatDateTimeSafe(value?: string | Date): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString();
}

