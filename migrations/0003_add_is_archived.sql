-- Migration: Add is_archived column and remove ARCHIVED from status enum
-- Date: 2025-11-18
-- Description: Refactor archive functionality from status-based to boolean flag

-- Step 0: Fix any invalid data (custom_deadline > computed_deadline)
-- This can happen if data was inserted incorrectly or if triggers were disabled
UPDATE delivery_items
  SET custom_deadline = computed_deadline
  WHERE custom_deadline > computed_deadline;

-- Step 1: Add is_archived column (non-nullable with default)
ALTER TABLE delivery_items
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Step 2: Migrate existing archived items
-- Set is_archived = true for items with status = 'ARCHIVED'
-- Keep their current status (will be 'ARCHIVED', but we'll fix that in Step 4)
UPDATE delivery_items
  SET is_archived = true
  WHERE status = 'ARCHIVED';

-- Step 3: Add index for performance (queries will filter by is_archived)
CREATE INDEX idx_items_user_archived_status_deadline
  ON delivery_items(user_id, is_archived, status, computed_deadline);

-- Drop old index (replaced by new composite index)
DROP INDEX IF EXISTS idx_items_user_status_deadline;

-- Step 4: Remove 'ARCHIVED' from enum (requires column recreation)
-- This is the tricky part - PostgreSQL doesn't support removing enum values directly

-- 4a. Create new enum without 'ARCHIVED'
CREATE TYPE status_new AS ENUM ('TO_DO', 'EDITING', 'DELIVERED');

-- 4b. Update all ARCHIVED items to DELIVERED (they're now marked by is_archived flag)
UPDATE delivery_items
  SET status = 'DELIVERED'
  WHERE status = 'ARCHIVED';

-- 4c. Alter column to use new enum type
-- Drop default first (can't cast default automatically)
ALTER TABLE delivery_items
  ALTER COLUMN status DROP DEFAULT;

-- Change the column type
ALTER TABLE delivery_items
  ALTER COLUMN status TYPE status_new
  USING status::text::status_new;

-- Re-add default with new enum type
ALTER TABLE delivery_items
  ALTER COLUMN status SET DEFAULT 'TO_DO'::status_new;

-- 4d. Drop old enum
DROP TYPE status;

-- 4e. Rename new enum to original name
ALTER TYPE status_new RENAME TO status;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN delivery_items.is_archived IS
  'Visibility flag: true = item appears on Archive page, false = item appears on Items page. Independent of workflow status.';
