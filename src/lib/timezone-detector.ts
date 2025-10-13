'use client';

/**
 * Detect the user's timezone using the browser's Intl API.
 * Falls back to 'UTC' if detection fails.
 */
export function detectUserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Validate that we got a non-empty string
    if (!timezone || timezone.trim() === '') {
      console.warn('Empty timezone detected, falling back to UTC');
      return 'UTC';
    }

    return timezone;
  } catch (error) {
    console.error('Failed to detect user timezone:', error);
    return 'UTC';
  }
}

/**
 * Get a friendly display name for a timezone.
 * Example: 'America/New_York' → 'Eastern Time (US & Canada)'
 */
export function getTimezoneDisplayName(timezone: string): string {
  const displayNames: Record<string, string> = {
    'America/New_York': 'Eastern Time (US & Canada)',
    'America/Chicago': 'Central Time (US & Canada)',
    'America/Denver': 'Mountain Time (US & Canada)',
    'America/Los_Angeles': 'Pacific Time (US & Canada)',
    'Europe/London': 'London (GMT/BST)',
    'Europe/Paris': 'Paris (CET/CEST)',
    'Europe/Rome': 'Rome (CET/CEST)',
    'Europe/Berlin': 'Berlin (CET/CEST)',
    'Asia/Tokyo': 'Tokyo (JST)',
    'Asia/Shanghai': 'Shanghai (CST)',
    'Australia/Sydney': 'Sydney (AEST/AEDT)',
    UTC: 'Coordinated Universal Time (UTC)',
  };

  return displayNames[timezone] || timezone;
}

/**
 * Validate if a timezone is a valid IANA timezone name.
 * This is a simple check - for production, consider using a library.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
