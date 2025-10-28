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

/**
 * Returns a list of common timezones for UI picker.
 * Used in Settings page to allow users to select their timezone.
 */
export function getCommonTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    {
      value: 'America/Los_Angeles',
      label: 'Pacific Time (US & Canada)',
    },
    { value: 'America/Phoenix', label: 'Arizona (MST - no DST)' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (no DST)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris, Berlin, Rome (CET/CEST)' },
    { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
    { value: 'Europe/Athens', label: 'Athens (EET/EEST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST - no DST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST - no DST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST - no DST)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT - no DST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT - no DST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Australia/Perth', label: 'Perth (AWST - no DST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  ];
}
