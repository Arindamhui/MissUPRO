CREATE TABLE "pricing_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_key" text NOT NULL,
  "category" text NOT NULL,
  "formula_json" jsonb NOT NULL,
  "constraints_json" jsonb,
  "status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamp NOT NULL,
  "effective_to" timestamp,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "gift_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "catalog_key" text NOT NULL,
  "display_name" text NOT NULL,
  "coin_price" integer NOT NULL,
  "diamond_credit" integer NOT NULL,
  "effect_tier" text NOT NULL,
  "animation_config_json" jsonb,
  "availability_json" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leaderboard_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_key" text NOT NULL,
  "leaderboard_type" text NOT NULL,
  "scoring_metric" text NOT NULL,
  "refresh_interval_seconds" integer NOT NULL,
  "max_entries" integer NOT NULL,
  "ranking_formula_json" jsonb,
  "status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamp NOT NULL,
  "effective_to" timestamp,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "event_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_key" text NOT NULL,
  "event_type" text NOT NULL,
  "config_json" jsonb NOT NULL,
  "status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamp NOT NULL,
  "effective_to" timestamp,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "vip_tiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tier_code" text NOT NULL,
  "display_name" text NOT NULL,
  "monthly_price_usd" numeric(10,2) NOT NULL,
  "coin_price" integer,
  "perk_json" jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "referral_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_key" text NOT NULL,
  "qualification_json" jsonb NOT NULL,
  "inviter_reward_json" jsonb NOT NULL,
  "invitee_reward_json" jsonb,
  "anti_fraud_json" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamp NOT NULL,
  "effective_to" timestamp,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "group_audio_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_key" text NOT NULL,
  "config_json" jsonb NOT NULL,
  "status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamp NOT NULL,
  "effective_to" timestamp,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "party_room_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_key" text NOT NULL,
  "config_json" jsonb NOT NULL,
  "status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamp NOT NULL,
  "effective_to" timestamp,
  "created_by_admin_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "gift_catalog" ADD CONSTRAINT "gift_catalog_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "leaderboard_configs" ADD CONSTRAINT "leaderboard_configs_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_configs" ADD CONSTRAINT "event_configs_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vip_tiers" ADD CONSTRAINT "vip_tiers_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "referral_rules" ADD CONSTRAINT "referral_rules_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "group_audio_configs" ADD CONSTRAINT "group_audio_configs_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "party_room_configs" ADD CONSTRAINT "party_room_configs_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "pricing_rules_key_idx" ON "pricing_rules" USING btree ("rule_key");
CREATE INDEX "pricing_rules_active_effective_idx" ON "pricing_rules" USING btree ("is_active","effective_from","effective_to");
CREATE INDEX "pricing_rules_category_idx" ON "pricing_rules" USING btree ("category");

CREATE UNIQUE INDEX "gift_catalog_key_idx" ON "gift_catalog" USING btree ("catalog_key");
CREATE INDEX "gift_catalog_active_order_idx" ON "gift_catalog" USING btree ("is_active","display_order");

CREATE UNIQUE INDEX "leaderboard_configs_key_idx" ON "leaderboard_configs" USING btree ("config_key");
CREATE INDEX "leaderboard_configs_type_active_idx" ON "leaderboard_configs" USING btree ("leaderboard_type","is_active");

CREATE UNIQUE INDEX "event_configs_key_idx" ON "event_configs" USING btree ("config_key");
CREATE INDEX "event_configs_type_active_idx" ON "event_configs" USING btree ("event_type","is_active");

CREATE UNIQUE INDEX "vip_tiers_code_idx" ON "vip_tiers" USING btree ("tier_code");
CREATE INDEX "vip_tiers_active_order_idx" ON "vip_tiers" USING btree ("is_active","display_order");

CREATE UNIQUE INDEX "referral_rules_key_idx" ON "referral_rules" USING btree ("rule_key");
CREATE INDEX "referral_rules_active_effective_idx" ON "referral_rules" USING btree ("is_active","effective_from","effective_to");

CREATE UNIQUE INDEX "group_audio_configs_key_idx" ON "group_audio_configs" USING btree ("config_key");
CREATE INDEX "group_audio_configs_active_effective_idx" ON "group_audio_configs" USING btree ("is_active","effective_from","effective_to");

CREATE UNIQUE INDEX "party_room_configs_key_idx" ON "party_room_configs" USING btree ("config_key");
CREATE INDEX "party_room_configs_active_effective_idx" ON "party_room_configs" USING btree ("is_active","effective_from","effective_to");
