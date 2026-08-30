// ============================================================
// StreakForge — Utility Functions
// ============================================================

/**
 * Merge CSS class names, filtering out falsy values.
 * Lightweight alternative to clsx/classnames.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a date string (YYYY-MM-DD) to a human-readable format.
 */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format date to short form like "Aug 30"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get today's date as YYYY-MM-DD in the given timezone.
 */
export function getTodayString(timezone: string = 'UTC'): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Parse a YYYY-MM-DD string to a Date object (at midnight UTC).
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date string.
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

/**
 * Get the number of days between two date strings.
 */
export function daysBetween(startStr: string, endStr: string): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date string represents today in the given timezone.
 */
export function isToday(dateStr: string, timezone: string = 'UTC'): boolean {
  return dateStr === getTodayString(timezone);
}

/**
 * Check if a date string is in the future.
 */
export function isFutureDate(dateStr: string, timezone: string = 'UTC'): boolean {
  return dateStr > getTodayString(timezone);
}

/**
 * Get a greeting based on time of day.
 */
export function getGreeting(timezone: string = 'UTC'): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: timezone, hour12: false });
  const hour = parseInt(timeStr.split(':')[0], 10);

  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Get a random item from an array.
 */
export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/**
 * Pluralize a word based on count.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural ?? singular + 's';
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get the start of a week (Sunday) for a given date string.
 */
export function getWeekStart(dateStr: string): string {
  const date = parseDate(dateStr);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  return toDateString(date);
}

/**
 * Generate an array of dates between start and end (inclusive).
 */
export function getDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let current = startStr;
  while (current <= endStr) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Sanitize user input text to prevent XSS.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate an email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate a percentage string.
 */
export function toPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
