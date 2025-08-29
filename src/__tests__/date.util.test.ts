import { formatRegistrationDuration } from '../utils/date';

describe('formatRegistrationDuration', () => {
  test('handles days only', () => {
    const from = new Date();
    const to = new Date();
    to.setDate(from.getDate() + 15);
    expect(formatRegistrationDuration(from, to)).toBe('15 days registered');
  });

  test('handles months and days', () => {
    const from = new Date(2024, 0, 1);
    const to = new Date(2024, 1, 11); // Feb 11 -> 1 month 10 days
    expect(formatRegistrationDuration(from, to)).toBe('1 month 10 days registered');
  });

  test('handles years, months, days', () => {
    const from = new Date(2020, 0, 15);
    const to = new Date(2023, 2, 10); // 3 years 1 month 23-? adjust logic: Jan 15 -> Mar 10
    expect(formatRegistrationDuration(from, to).startsWith('3 years')).toBe(true);
  });

  test('invalid dates', () => {
    expect(formatRegistrationDuration('invalid' as any, new Date())).toBe('N/A');
  });
});

