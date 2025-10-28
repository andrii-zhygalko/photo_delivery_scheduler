import { describe, test, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  itemsQuerySchema,
} from '@/lib/api';

describe('API Validation Schemas', () => {
  describe('createItemSchema', () => {
    test('Valid data passes validation', () => {
      const validData = {
        client_name: 'Test Client',
        shoot_date: '2025-10-20',
        notes: 'Test notes',
        custom_deadline: '2025-11-19T22:59:00.000Z',
      };

      const result = createItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.client_name).toBe('Test Client');
        expect(result.data.shoot_date).toBe('2025-10-20');
      }
    });

    test('Minimal valid data passes (only required fields)', () => {
      const minimalData = {
        client_name: 'Test',
        shoot_date: '2025-10-20',
      };

      const result = createItemSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    test('Empty client_name fails validation', () => {
      const invalidData = {
        client_name: '',
        shoot_date: '2025-10-20',
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toContain('client_name');
      }
    });

    test('Invalid date format fails validation', () => {
      const invalidData = {
        client_name: 'Test',
        shoot_date: 'not-a-date',
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Missing client_name fails validation', () => {
      const invalidData = {
        shoot_date: '2025-10-20',
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Missing shoot_date fails validation', () => {
      const invalidData = {
        client_name: 'Test',
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Client name exceeding 200 characters fails', () => {
      const longName = 'a'.repeat(201);
      const invalidData = {
        client_name: longName,
        shoot_date: '2025-10-20',
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Notes exceeding 1000 characters fails', () => {
      const longNotes = 'a'.repeat(1001);
      const invalidData = {
        client_name: 'Test',
        shoot_date: '2025-10-20',
        notes: longNotes,
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Notes field is optional', () => {
      const dataWithoutNotes = {
        client_name: 'Test',
        shoot_date: '2025-10-20',
      };

      const result = createItemSchema.safeParse(dataWithoutNotes);
      expect(result.success).toBe(true);
    });

    test('custom_deadline field is optional', () => {
      const dataWithoutCustomDeadline = {
        client_name: 'Test',
        shoot_date: '2025-10-20',
      };

      const result = createItemSchema.safeParse(dataWithoutCustomDeadline);
      expect(result.success).toBe(true);
    });

    test('Valid ISO 8601 date string for custom_deadline passes', () => {
      const validData = {
        client_name: 'Test',
        shoot_date: '2025-10-20',
        custom_deadline: '2025-11-19T22:59:00.000Z',
      };

      const result = createItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('Invalid custom_deadline format fails', () => {
      const invalidData = {
        client_name: 'Test',
        shoot_date: '2025-10-20',
        custom_deadline: 'not-a-date',
      };

      const result = createItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateItemSchema', () => {
    test('All fields are optional', () => {
      const emptyUpdate = {};
      const result = updateItemSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    test('Valid status TO_DO passes', () => {
      const result = updateItemSchema.safeParse({ status: 'TO_DO' });
      expect(result.success).toBe(true);
    });

    test('Valid status EDITING passes', () => {
      const result = updateItemSchema.safeParse({ status: 'EDITING' });
      expect(result.success).toBe(true);
    });

    test('Valid status DELIVERED passes', () => {
      const result = updateItemSchema.safeParse({ status: 'DELIVERED' });
      expect(result.success).toBe(true);
    });

    test('Valid status ARCHIVED passes', () => {
      const result = updateItemSchema.safeParse({ status: 'ARCHIVED' });
      expect(result.success).toBe(true);
    });

    test('Invalid status value fails', () => {
      const result = updateItemSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    test('Empty client_name fails validation', () => {
      const invalidData = { client_name: '' };
      const result = updateItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Valid client_name update passes', () => {
      const validData = { client_name: 'Updated Name' };
      const result = updateItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('Valid shoot_date update passes', () => {
      const validData = { shoot_date: '2025-11-01' };
      const result = updateItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('Invalid shoot_date format fails', () => {
      const invalidData = { shoot_date: 'not-a-date' };
      const result = updateItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('Valid notes update passes', () => {
      const validData = { notes: 'Updated notes' };
      const result = updateItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('Null notes is valid', () => {
      const validData = { notes: null };
      const result = updateItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('Multiple valid fields pass together', () => {
      const validData = {
        client_name: 'Updated Client',
        status: 'EDITING',
        notes: 'Updated notes',
      };
      const result = updateItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('Client name exceeding 200 characters fails', () => {
      const longName = 'a'.repeat(201);
      const result = updateItemSchema.safeParse({ client_name: longName });
      expect(result.success).toBe(false);
    });

    test('Notes exceeding 1000 characters fails', () => {
      const longNotes = 'a'.repeat(1001);
      const result = updateItemSchema.safeParse({ notes: longNotes });
      expect(result.success).toBe(false);
    });
  });

  describe('itemsQuerySchema', () => {
    test('Default values are applied when no params provided', () => {
      const result = itemsQuerySchema.parse({});
      expect(result.sort).toBe('deadline');
      expect(result.order).toBe('asc');
      expect(result.status).toBeUndefined();
    });

    test('Valid query params pass', () => {
      const params = {
        status: 'TO_DO',
        sort: 'shoot_date',
        order: 'desc',
      };

      const result = itemsQuerySchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('TO_DO');
        expect(result.data.sort).toBe('shoot_date');
        expect(result.data.order).toBe('desc');
      }
    });

    test('Invalid status fails', () => {
      const result = itemsQuerySchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    test('Valid status TO_DO passes', () => {
      const result = itemsQuerySchema.safeParse({ status: 'TO_DO' });
      expect(result.success).toBe(true);
    });

    test('Valid status EDITING passes', () => {
      const result = itemsQuerySchema.safeParse({ status: 'EDITING' });
      expect(result.success).toBe(true);
    });

    test('Valid status DELIVERED passes', () => {
      const result = itemsQuerySchema.safeParse({ status: 'DELIVERED' });
      expect(result.success).toBe(true);
    });

    test('Valid status ARCHIVED passes', () => {
      const result = itemsQuerySchema.safeParse({ status: 'ARCHIVED' });
      expect(result.success).toBe(true);
    });

    test('Valid sort deadline passes', () => {
      const result = itemsQuerySchema.safeParse({ sort: 'deadline' });
      expect(result.success).toBe(true);
    });

    test('Valid sort shoot_date passes', () => {
      const result = itemsQuerySchema.safeParse({ sort: 'shoot_date' });
      expect(result.success).toBe(true);
    });

    test('Valid sort created_at passes', () => {
      const result = itemsQuerySchema.safeParse({ sort: 'created_at' });
      expect(result.success).toBe(true);
    });

    test('Invalid sort value fails', () => {
      const result = itemsQuerySchema.safeParse({ sort: 'invalid' });
      expect(result.success).toBe(false);
    });

    test('Valid order asc passes', () => {
      const result = itemsQuerySchema.safeParse({ order: 'asc' });
      expect(result.success).toBe(true);
    });

    test('Valid order desc passes', () => {
      const result = itemsQuerySchema.safeParse({ order: 'desc' });
      expect(result.success).toBe(true);
    });

    test('Invalid order value fails', () => {
      const result = itemsQuerySchema.safeParse({ order: 'invalid' });
      expect(result.success).toBe(false);
    });

    test('Omitted optional fields use defaults', () => {
      const params = { status: 'EDITING' };
      const result = itemsQuerySchema.parse(params);
      expect(result.status).toBe('EDITING');
      expect(result.sort).toBe('deadline'); // default
      expect(result.order).toBe('asc'); // default
    });

    test('Complete valid query passes', () => {
      const params = {
        status: 'DELIVERED',
        sort: 'created_at',
        order: 'desc',
      };
      const result = itemsQuerySchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });
});
