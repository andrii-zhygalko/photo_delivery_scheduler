-- Migration: Add deadline computation trigger with dynamic timezone support
-- Phase 3: Deadline Logic & Database Triggers
-- Created: 2025-10-27

-- =========================================================================
-- Step 1: Drop existing constraints (will be replaced with timezone-agnostic versions)
-- =========================================================================

ALTER TABLE delivery_items
  DROP CONSTRAINT IF EXISTS check_custom_deadline_lower_bound;

ALTER TABLE delivery_items
  DROP CONSTRAINT IF EXISTS check_custom_deadline_upper_bound;

-- =========================================================================
-- Step 2: Helper function to get user's timezone with fallback to UTC
-- =========================================================================

CREATE OR REPLACE FUNCTION get_user_timezone(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(timezone, 'UTC')
  FROM user_settings
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- =========================================================================
-- Step 3: Trigger function for deadline computation
-- =========================================================================

CREATE OR REPLACE FUNCTION compute_deadline()
RETURNS TRIGGER AS $$
DECLARE
  deadline_days INTEGER;
  user_tz TEXT;
BEGIN
  -- Get user's settings (including timezone)
  SELECT default_deadline_days, COALESCE(timezone, 'UTC')
  INTO deadline_days, user_tz
  FROM user_settings
  WHERE user_id = NEW.user_id;

  -- If no settings found (shouldn't happen with FK constraint), use defaults
  IF deadline_days IS NULL THEN
    deadline_days := 30;
    user_tz := 'UTC';
  END IF;

  -- Compute deadline: shoot_date + N days at 23:59 in user's timezone → UTC
  -- Example: shoot_date = 2025-03-30, deadline_days = 7, timezone = Europe/Rome
  --   (2025-03-30 AT TIME ZONE Europe/Rome) = 2025-03-30 00:00:00 CET
  --   + 7 days = 2025-04-06 00:00:00 CEST (DST transition happened)
  --   + 23:59 = 2025-04-06 23:59:00 CEST
  --   AT TIME ZONE Europe/Rome converts to UTC = 2025-04-06 21:59:00 UTC
  NEW.computed_deadline := (
    (NEW.shoot_date::timestamptz AT TIME ZONE user_tz) +
    (deadline_days || ' days')::INTERVAL +
    INTERVAL '23 hours 59 minutes'
  ) AT TIME ZONE user_tz;

  -- Initialize custom_deadline on INSERT
  -- Reset custom_deadline when shoot_date changes (user needs to re-customize)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.shoot_date IS DISTINCT FROM NEW.shoot_date) THEN
    NEW.custom_deadline := NEW.computed_deadline;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- Step 4: Create trigger on delivery_items table
-- =========================================================================

DROP TRIGGER IF EXISTS set_computed_deadline ON delivery_items;

CREATE TRIGGER set_computed_deadline
  BEFORE INSERT OR UPDATE ON delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION compute_deadline();

-- =========================================================================
-- Step 5: Add timezone-agnostic constraints
-- =========================================================================

-- Constraint 1: custom_deadline must be >= shoot_date (at 00:00 in user's timezone)
ALTER TABLE delivery_items
  ADD CONSTRAINT check_custom_deadline_lower_bound
    CHECK (
      custom_deadline IS NULL OR
      custom_deadline >= (shoot_date AT TIME ZONE get_user_timezone(user_id))::timestamptz
    );

-- Constraint 2: custom_deadline must be <= computed_deadline
ALTER TABLE delivery_items
  ADD CONSTRAINT check_custom_deadline_upper_bound
    CHECK (
      custom_deadline IS NULL OR
      custom_deadline <= computed_deadline
    );

-- =========================================================================
-- Migration complete
-- =========================================================================

-- Notes:
-- 1. Trigger automatically computes computed_deadline using user's timezone
-- 2. Constraints now respect user's timezone (not hardcoded Europe/Rome)
-- 3. DST transitions are handled automatically by PostgreSQL
-- 4. To test: Create items with different timezones and verify deadlines
