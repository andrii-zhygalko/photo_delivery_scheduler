import { NextRequest, NextResponse } from 'next/server';
import { deliveryItems } from '@/lib/db/schema';
import { withAuth, updateItemSchema } from '@/lib/api';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Fetch item with RLS enforcement
    const item = await withAuth(async (session, tx) => {
      const [item] = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, id))
        .limit(1);

      return item;
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error(`GET /api/items/[id] error:`, error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Parse and validate request body
    const body = await request.json();
    const validated = updateItemSchema.parse(body);

    // Update item with RLS enforcement
    const updatedItem = await withAuth(async (session, tx) => {
      // Build update object (only include provided fields)
      const updateData: Record<string, unknown> = {};

      if (validated.client_name !== undefined) {
        updateData.client_name = validated.client_name;
      }
      if (validated.shoot_date !== undefined) {
        updateData.shoot_date = validated.shoot_date;
        // Note: In Phase 3, trigger will recompute deadline
        // For now, we'll leave deadline as-is
      }
      if (validated.notes !== undefined) {
        updateData.notes = validated.notes;
      }
      if (validated.custom_deadline !== undefined) {
        updateData.custom_deadline = validated.custom_deadline
          ? new Date(validated.custom_deadline)
          : null;
      }
      if (validated.status !== undefined) {
        updateData.status = validated.status;

        // If status is DELIVERED, set delivered_at
        if (validated.status === 'DELIVERED') {
          updateData.delivered_at = new Date();
        }
      }

      // Always update updated_at timestamp
      updateData.updated_at = new Date();

      // Perform update
      const [item] = await tx
        .update(deliveryItems)
        .set(updateData)
        .where(eq(deliveryItems.id, id))
        .returning();

      return item;
    });

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: updatedItem }, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/items/[id] error:`, error);

    if (error instanceof Error) {
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

      // Database constraint errors
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Delete item with RLS enforcement
    const deletedItem = await withAuth(async (session, tx) => {
      const [item] = await tx
        .delete(deliveryItems)
        .where(eq(deliveryItems.id, id))
        .returning();

      return item;
    });

    if (!deletedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Item deleted successfully',
        item: deletedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`DELETE /api/items/[id] error:`, error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
