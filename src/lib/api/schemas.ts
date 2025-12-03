import { z } from 'zod';

/**
 * Schema for creating a new delivery item
 */
export const createItemSchema = z.object({
  client_name: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name too long'),
  shoot_date: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date format. Expected YYYY-MM-DD' }
  ),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  custom_deadline: z
    .string()
    .refine(
      (val) => {
        if (!val) return true; // Allow null/undefined
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid date format' }
    )
    .optional()
    .nullable(),
});

/**
 * Schema for updating an existing delivery item
 * All fields are optional (partial update)
 */
export const updateItemSchema = z.object({
  client_name: z
    .string()
    .min(1, 'Client name cannot be empty')
    .max(200)
    .optional(),
  shoot_date: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid date format' }
    )
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
  custom_deadline: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid date format' }
    )
    .optional()
    .nullable(),
  status: z.enum(['TO_DO', 'EDITING', 'DELIVERED']).optional(),
  is_archived: z.boolean().optional(),
});

/**
 * Schema for query parameters on GET /api/items
 */
export const itemsQuerySchema = z.object({
  status: z.enum(['TO_DO', 'EDITING', 'DELIVERED']).optional(),
  isArchived: z.coerce.boolean().optional(),
  sort: z
    .enum(['deadline', 'shoot_date', 'created_at'])
    .optional()
    .default('deadline'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Schema for updating user settings (POST /api/settings)
 */
export const updateSettingsSchema = z
  .object({
    default_deadline_days: z
      .number()
      .int('Must be an integer')
      .min(1, 'Must be at least 1 day')
      .max(365, 'Must be at most 365 days')
      .optional(),
    timezone: z.string().min(1, 'Timezone cannot be empty').optional(),
    theme_mode: z.enum(['light', 'dark', 'system']).optional(),
    applyToExisting: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // At least one setting field must be provided
      return (
        data.default_deadline_days !== undefined ||
        data.timezone !== undefined ||
        data.theme_mode !== undefined
      );
    },
    {
      message:
        'At least one setting must be provided (default_deadline_days, timezone, or theme_mode)',
    }
  );

// Type exports for use in API handlers
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemsQueryInput = z.infer<typeof itemsQuerySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
