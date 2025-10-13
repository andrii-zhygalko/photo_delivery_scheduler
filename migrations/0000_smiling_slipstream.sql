CREATE TYPE "public"."status" AS ENUM('TO_DO', 'EDITING', 'DELIVERED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "delivery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"shoot_date" date NOT NULL,
	"computed_deadline" timestamp with time zone NOT NULL,
	"custom_deadline" timestamp with time zone,
	"notes" text,
	"status" "status" DEFAULT 'TO_DO' NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_deadline_days" integer DEFAULT 30 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Enable Row-Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- RLS Policy: Users can only see their own record
CREATE POLICY user_isolation_users ON users
  FOR ALL
  USING (id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (id = current_setting('app.user_id', true)::uuid);--> statement-breakpoint

-- RLS Policy: Users can only see their own settings
CREATE POLICY user_isolation_settings ON user_settings
  FOR ALL
  USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);--> statement-breakpoint

-- RLS Policy: Users can only see their own delivery items
CREATE POLICY user_isolation_items ON delivery_items
  FOR ALL
  USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);--> statement-breakpoint

-- Indexes for performance
CREATE INDEX idx_items_user_status_deadline
  ON delivery_items(user_id, status, computed_deadline);--> statement-breakpoint

CREATE INDEX idx_items_user_created
  ON delivery_items(user_id, created_at);--> statement-breakpoint

-- Constraints for custom_deadline
ALTER TABLE delivery_items
  ADD CONSTRAINT check_custom_deadline_lower_bound
    CHECK (
      custom_deadline IS NULL OR
      custom_deadline >= (shoot_date AT TIME ZONE 'Europe/Rome')::date
    );--> statement-breakpoint

ALTER TABLE delivery_items
  ADD CONSTRAINT check_custom_deadline_upper_bound
    CHECK (
      custom_deadline IS NULL OR
      custom_deadline <= computed_deadline
    );