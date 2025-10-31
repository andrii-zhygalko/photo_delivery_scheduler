/**
 * Date utility functions using Luxon for timezone-safe date operations
 * All functions accept a userTimezone parameter (IANA timezone name)
 */

import { DateTime } from 'luxon';

/**
 * Helper to convert Date or string to DateTime
 */
function toDateTime(date: Date | string): DateTime {
  if (date instanceof Date) {
    return DateTime.fromJSDate(date);
  }
  return DateTime.fromISO(date);
}

/**
 * Formats a UTC deadline timestamp to a localized string
 * @param utcDeadline - ISO 8601 UTC timestamp string or Date object
 * @param userTimezone - IANA timezone name (e.g., 'America/New_York')
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDeadline(utcDeadline: Date | string, userTimezone: string): string {
  return toDateTime(utcDeadline)
    .setZone(userTimezone)
    .toLocaleString(DateTime.DATE_MED, { locale: 'en-US' });
}

/**
 * Formats a UTC date to a short localized string
 * @param utcDate - ISO 8601 UTC date/timestamp string or Date object
 * @param userTimezone - IANA timezone name
 * @returns Formatted short date string (e.g., "1/15/25")
 */
export function formatShortDate(utcDate: Date | string, userTimezone: string): string {
  return toDateTime(utcDate)
    .setZone(userTimezone)
    .toLocaleString(DateTime.DATE_SHORT, { locale: 'en-US' });
}

/**
 * Calculates days remaining until deadline (or days overdue if past)
 * @param utcDeadline - ISO 8601 UTC timestamp string or Date object
 * @param userTimezone - IANA timezone name
 * @returns Number of days (positive = future, negative = overdue)
 */
export function daysRemaining(utcDeadline: Date | string, userTimezone: string): number {
  const now = DateTime.now().setZone(userTimezone).startOf('day');
  const deadline = toDateTime(utcDeadline)
    .setZone(userTimezone)
    .startOf('day');

  return Math.ceil(deadline.diff(now, 'days').days);
}

/**
 * Checks if a deadline is overdue (past today in user's timezone)
 * @param utcDeadline - ISO 8601 UTC timestamp string or Date object
 * @param userTimezone - IANA timezone name
 * @returns true if deadline is in the past
 */
export function isOverdue(utcDeadline: Date | string, userTimezone: string): boolean {
  return daysRemaining(utcDeadline, userTimezone) < 0;
}

/**
 * Computes a deadline by adding turnaround days to a shoot date
 * Sets time to 23:59 in user's timezone, returns UTC timestamp
 * @param shootDate - ISO 8601 date string (YYYY-MM-DD)
 * @param turnaroundDays - Number of days to add
 * @param userTimezone - IANA timezone name
 * @returns ISO 8601 UTC timestamp string
 */
export function computeDeadline(
  shootDate: string,
  turnaroundDays: number,
  userTimezone: string
): string {
  // Parse shoot date in user's timezone (start of day)
  const shoot = DateTime.fromISO(shootDate, { zone: userTimezone });

  // Add turnaround days and set to 23:59 in user's timezone
  const deadline = shoot
    .plus({ days: turnaroundDays })
    .set({ hour: 23, minute: 59, second: 0, millisecond: 0 });

  // Convert to UTC and return ISO string
  return deadline.toUTC().toISO() || '';
}
