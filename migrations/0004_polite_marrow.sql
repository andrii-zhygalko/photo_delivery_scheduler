ALTER TABLE "user_settings" ADD COLUMN "theme_mode" text DEFAULT 'system' NOT NULL;

-- Add CHECK constraint for data integrity
ALTER TABLE "user_settings"
ADD CONSTRAINT check_theme_mode
CHECK (theme_mode IN ('light', 'dark', 'system'));