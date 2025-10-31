/**
 * Tests for date utility functions (src/lib/date-utils.ts)
 * Tests timezone-safe date operations using Luxon
 */

import { describe, test, expect } from 'vitest';
import {
  formatDeadline,
  formatShortDate,
  daysRemaining,
  isOverdue,
  computeDeadline,
} from '@/lib/date-utils';

describe('Date Utilities', () => {
  describe('formatDeadline', () => {
    test('formats UTC timestamp to localized date in America/New_York', () => {
      const utcTimestamp = '2025-11-15T23:59:00.000Z'; // UTC
      const result = formatDeadline(utcTimestamp, 'America/New_York');
      // Nov 15, 2025 23:59 UTC = Nov 15, 2025 18:59 EST
      expect(result).toBe('Nov 15, 2025');
    });

    test('formats UTC timestamp to localized date in Europe/Rome', () => {
      const utcTimestamp = '2025-11-15T22:59:00.000Z'; // UTC
      const result = formatDeadline(utcTimestamp, 'Europe/Rome');
      // Nov 15, 2025 22:59 UTC = Nov 15, 2025 23:59 CET
      expect(result).toBe('Nov 15, 2025');
    });

    test('formats UTC timestamp to localized date in Asia/Tokyo', () => {
      const utcTimestamp = '2025-11-15T14:59:00.000Z'; // UTC
      const result = formatDeadline(utcTimestamp, 'Asia/Tokyo');
      // Nov 15, 2025 14:59 UTC = Nov 15, 2025 23:59 JST
      expect(result).toBe('Nov 15, 2025');
    });

    test('works with Date objects', () => {
      const date = new Date('2025-11-15T23:59:00.000Z');
      const result = formatDeadline(date, 'America/New_York');
      expect(result).toBe('Nov 15, 2025');
    });

    test('formats date crossing midnight boundary', () => {
      const utcTimestamp = '2025-11-15T04:00:00.000Z'; // UTC
      const result = formatDeadline(utcTimestamp, 'America/New_York');
      // Nov 15, 2025 04:00 UTC = Nov 14, 2025 23:00 EST (previous day!)
      expect(result).toBe('Nov 14, 2025');
    });
  });

  describe('formatShortDate', () => {
    test('formats to short date in America/New_York', () => {
      const utcDate = '2025-11-15';
      const result = formatShortDate(utcDate, 'America/New_York');
      // With en-US locale, DATE_SHORT format is MM/DD/YYYY (with full year)
      // Date string '2025-11-15' is treated as midnight UTC, which is Nov 14 in NY
      expect(result).toBe('11/14/2025');
    });

    test('formats to short date in Europe/Rome', () => {
      const utcDate = '2025-11-15';
      const result = formatShortDate(utcDate, 'Europe/Rome');
      // With en-US locale, still uses MM/DD/YYYY format (locale-consistent)
      expect(result).toBe('11/15/2025');
    });

    test('works with Date objects', () => {
      const date = new Date('2025-11-15T00:00:00.000Z');
      const result = formatShortDate(date, 'America/New_York');
      // Nov 15 00:00 UTC = Nov 14 19:00 EST (previous day due to timezone)
      expect(result).toBe('11/14/2025');
    });

    test('handles timestamp strings', () => {
      const utcTimestamp = '2025-11-15T23:59:00.000Z';
      const result = formatShortDate(utcTimestamp, 'Asia/Tokyo');
      // Nov 15 23:59 UTC = Nov 16 08:59 JST (next day)
      expect(result).toBe('11/16/2025');
    });
  });

  describe('daysRemaining', () => {
    // Use fixed "now" by creating deadline relative to a known date
    // For testing, we'll use dates far in future/past to avoid flakiness

    test('returns positive days for future deadline', () => {
      // Deadline 30 days from now
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const result = daysRemaining(future.toISOString(), 'America/New_York');
      expect(result).toBeGreaterThan(25); // Should be around 30, allow some variance
      expect(result).toBeLessThan(35);
    });

    test('returns negative days for past deadline (overdue)', () => {
      // Deadline 30 days ago
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const result = daysRemaining(past.toISOString(), 'America/New_York');
      expect(result).toBeLessThan(-25); // Should be around -30
      expect(result).toBeGreaterThan(-35);
    });

    test('returns 0 for deadline today', () => {
      const now = new Date();
      const result = daysRemaining(now.toISOString(), 'America/New_York');
      expect(result).toBe(0);
    });

    test('calculates correctly across timezone boundaries', () => {
      // Fixed date in future
      const deadline = '2026-12-31T23:59:00.000Z'; // Far future
      const resultNY = daysRemaining(deadline, 'America/New_York');
      const resultRome = daysRemaining(deadline, 'Europe/Rome');

      // Should be close but might differ by 1 day due to timezone offset
      expect(Math.abs(resultNY - resultRome)).toBeLessThanOrEqual(1);
    });

    test('works with Date objects', () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const result = daysRemaining(future, 'America/New_York');
      expect(result).toBeGreaterThan(8);
      expect(result).toBeLessThan(12);
    });
  });

  describe('isOverdue', () => {
    test('returns true for past deadline', () => {
      const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const result = isOverdue(past.toISOString(), 'America/New_York');
      expect(result).toBe(true);
    });

    test('returns false for future deadline', () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const result = isOverdue(future.toISOString(), 'America/New_York');
      expect(result).toBe(false);
    });

    test('returns false for deadline today', () => {
      const today = new Date();
      const result = isOverdue(today.toISOString(), 'America/New_York');
      expect(result).toBe(false); // Today is not overdue
    });

    test('works across different timezones', () => {
      const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      expect(isOverdue(future.toISOString(), 'America/New_York')).toBe(false);
      expect(isOverdue(future.toISOString(), 'Europe/Rome')).toBe(false);
      expect(isOverdue(future.toISOString(), 'Asia/Tokyo')).toBe(false);
    });
  });

  describe('computeDeadline', () => {
    test('computes deadline with turnaround days in America/New_York', () => {
      const shootDate = '2025-11-12'; // Wed, Nov 12, 2025
      const turnaroundDays = 7;
      const result = computeDeadline(shootDate, turnaroundDays, 'America/New_York');

      // Should be Nov 19, 2025 23:59 EST (Nov 20, 2025 04:59 UTC)
      const deadline = new Date(result);
      expect(deadline.getUTCDate()).toBe(20); // UTC date is next day
      expect(deadline.getUTCHours()).toBe(4); // 23:59 EST = 04:59 UTC (EST is UTC-5)
      expect(deadline.getUTCMinutes()).toBe(59);
    });

    test('computes deadline with turnaround days in Europe/Rome', () => {
      const shootDate = '2025-11-12'; // Wed, Nov 12, 2025
      const turnaroundDays = 7;
      const result = computeDeadline(shootDate, turnaroundDays, 'Europe/Rome');

      // Should be Nov 19, 2025 23:59 CET (Nov 19, 2025 22:59 UTC)
      const deadline = new Date(result);
      expect(deadline.getUTCDate()).toBe(19); // Same day in UTC
      expect(deadline.getUTCHours()).toBe(22); // 23:59 CET = 22:59 UTC (CET is UTC+1)
      expect(deadline.getUTCMinutes()).toBe(59);
    });

    test('computes deadline with turnaround days in Asia/Tokyo', () => {
      const shootDate = '2025-11-12'; // Wed, Nov 12, 2025
      const turnaroundDays = 7;
      const result = computeDeadline(shootDate, turnaroundDays, 'Asia/Tokyo');

      // Should be Nov 19, 2025 23:59 JST (Nov 19, 2025 14:59 UTC)
      const deadline = new Date(result);
      expect(deadline.getUTCDate()).toBe(19); // Same day in UTC
      expect(deadline.getUTCHours()).toBe(14); // 23:59 JST = 14:59 UTC (JST is UTC+9)
      expect(deadline.getUTCMinutes()).toBe(59);
    });

    test('handles zero turnaround days (deadline same day as shoot)', () => {
      const shootDate = '2025-11-12';
      const turnaroundDays = 0;
      const result = computeDeadline(shootDate, turnaroundDays, 'America/New_York');

      const deadline = new Date(result);
      // Nov 12, 2025 23:59 EST (Nov 13, 2025 04:59 UTC)
      expect(deadline.getUTCDate()).toBe(13);
      expect(deadline.getUTCHours()).toBe(4);
    });

    test('handles large turnaround days', () => {
      const shootDate = '2025-11-12';
      const turnaroundDays = 365; // 1 year
      const result = computeDeadline(shootDate, turnaroundDays, 'America/New_York');

      const deadline = new Date(result);
      // Nov 12, 2026 23:59 EST
      expect(deadline.getUTCFullYear()).toBe(2026);
      expect(deadline.getUTCHours()).toBeGreaterThanOrEqual(4); // EST or EDT
      expect(deadline.getUTCMinutes()).toBe(59);
    });

    test('returns ISO string format', () => {
      const shootDate = '2025-11-12';
      const result = computeDeadline(shootDate, 7, 'America/New_York');

      // Should be valid ISO 8601 string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('handles DST transition (spring forward)', () => {
      // March 9, 2025 - DST starts (spring forward) in America/New_York
      const shootDate = '2025-03-08';
      const turnaroundDays = 7;
      const result = computeDeadline(shootDate, turnaroundDays, 'America/New_York');

      // March 15, 2025 23:59 EDT (March 16, 2025 03:59 UTC)
      const deadline = new Date(result);
      expect(deadline.getUTCDate()).toBe(16); // Next day in UTC
      expect(deadline.getUTCHours()).toBe(3); // 23:59 EDT = 03:59 UTC (EDT is UTC-4)
      expect(deadline.getUTCMinutes()).toBe(59);
    });

    test('handles DST transition (fall back)', () => {
      // November 2, 2025 - DST ends (fall back) in America/New_York
      const shootDate = '2025-11-01';
      const turnaroundDays = 7;
      const result = computeDeadline(shootDate, turnaroundDays, 'America/New_York');

      // November 8, 2025 23:59 EST (November 9, 2025 04:59 UTC)
      const deadline = new Date(result);
      expect(deadline.getUTCDate()).toBe(9); // Next day in UTC
      expect(deadline.getUTCHours()).toBe(4); // 23:59 EST = 04:59 UTC (EST is UTC-5)
      expect(deadline.getUTCMinutes()).toBe(59);
    });
  });
});
