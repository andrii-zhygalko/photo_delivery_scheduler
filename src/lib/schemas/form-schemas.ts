import { z } from 'zod';

/**
 * Form schema for creating/editing delivery items
 * Used for client-side validation in React Hook Form
 *
 * Note: Separate from API schemas because forms include UI-only fields
 * like use_custom_deadline toggle
 */
export const itemFormSchema = z
  .object({
    client_name: z
      .string()
      .min(1, 'Client name is required')
      .max(200, 'Client name must be less than 200 characters'),

    shoot_date: z.string().refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Please enter a valid date' }
    ),

    notes: z
      .string()
      .max(1000, 'Notes must be less than 1000 characters')
      .optional()
      .or(z.literal('')),

    status: z.enum(['TO_DO', 'EDITING', 'DELIVERED', 'ARCHIVED']),

    // UI-only field for toggle state
    use_custom_deadline: z.boolean(),

    custom_deadline: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // Only validate custom_deadline if toggle is enabled
    if (data.use_custom_deadline && data.custom_deadline) {
      const shootDate = new Date(data.shoot_date);
      const customDeadline = new Date(data.custom_deadline);

      // Must be >= shoot_date
      if (customDeadline < shootDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['custom_deadline'],
          message: 'Custom deadline must be on or after shoot date',
        });
      }

      // Note: computed_deadline validation happens server-side
      // (we don't have default_deadline_days in the form to compute it)
    }
  });

export type ItemFormData = z.infer<typeof itemFormSchema>;
