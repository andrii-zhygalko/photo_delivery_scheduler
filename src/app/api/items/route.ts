import { NextRequest, NextResponse } from 'next/server';
import { deliveryItems } from '@/lib/db/schema';
import { withAuth, itemsQuerySchema, createItemSchema } from '@/lib/api';
import { eq, asc, desc } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      isArchived: searchParams.get('isArchived') || undefined,
      sort: searchParams.get('sort') || 'deadline',
      order: searchParams.get('order') || 'asc',
    };

    // Validate query params with Zod
    const validated = itemsQuerySchema.parse(queryParams);

    // Fetch items with RLS enforcement
    const items = await withAuth(async (session, tx) => {
      // Start with base query
      let query = tx.select().from(deliveryItems);

      // Apply status filter if provided
      if (validated.status) {
        query = query.where(
          eq(deliveryItems.status, validated.status)
        ) as typeof query;
      }

      // Apply isArchived filter if provided
      if (validated.isArchived !== undefined) {
        query = query.where(
          eq(deliveryItems.is_archived, validated.isArchived)
        ) as typeof query;
      }

      // Determine sort column (let TypeScript infer the type)
      const sortColumn =
        validated.sort === 'deadline'
          ? deliveryItems.computed_deadline
          : validated.sort === 'shoot_date'
            ? deliveryItems.shoot_date
            : deliveryItems.created_at;

      // Apply sorting
      const sortFn = validated.order === 'desc' ? desc : asc;
      query = query.orderBy(sortFn(sortColumn)) as typeof query;

      return await query;
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('GET /api/items error:', error);

    if (error instanceof Error) {
      // Unauthorized (no session)
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Zod validation error
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error,
          },
          { status: 400 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = createItemSchema.parse(body);

    // Create item with RLS enforcement
    const newItem = await withAuth(async (session, tx) => {
      // Ensure user exists (withAuth guarantees this, but TypeScript doesn't know)
      if (!session.user?.id) {
        throw new Error('Unauthorized');
      }

      const shootDate = new Date(validated.shoot_date);
      const deadlineDays = 30;
      const computedDeadline = new Date(shootDate);
      computedDeadline.setDate(computedDeadline.getDate() + deadlineDays);
      computedDeadline.setHours(23, 59, 0, 0); // Set to 23:59:00

      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: session.user.id,
          client_name: validated.client_name,
          shoot_date: validated.shoot_date,
          computed_deadline: computedDeadline,
          custom_deadline: validated.custom_deadline ? new Date(validated.custom_deadline) : null,
          notes: validated.notes || null,
          status: 'TO_DO',
        })
        .returning();

      return item;
    });

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    console.error('POST /api/items error:', error);

    if (error instanceof Error) {
      // Unauthorized
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Zod validation error
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error,
          },
          { status: 400 }
        );
      }

      // Database constraint errors (e.g., CHECK constraints)
      if (
        error.message.includes('constraint') ||
        error.message.includes('violates')
      ) {
        return NextResponse.json(
          {
            error: 'Database constraint violation',
            message: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
