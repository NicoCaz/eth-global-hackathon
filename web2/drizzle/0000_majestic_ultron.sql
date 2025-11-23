CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_address" varchar(42) NOT NULL,
	"creator_user_id" text NOT NULL,
	"creator_wallet_address" varchar(42) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"logo" text,
	"logo_mime_type" varchar(50),
	"raffle_percentage" integer NOT NULL,
	"goal_amount" numeric(20, 8),
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"total_raised" numeric(20, 8) DEFAULT '0' NOT NULL,
	"raffle_pot" numeric(20, 8) DEFAULT '0' NOT NULL,
	"donation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_contract_address_unique" UNIQUE("contract_address")
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"donor_user_id" text,
	"donor_wallet_address" varchar(42) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"block_number" integer,
	"donated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donations_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "raffle_winners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"winner_user_id" text,
	"winner_wallet_address" varchar(42) NOT NULL,
	"prize_amount" numeric(20, 8) NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"block_number" integer,
	"random_seed" text,
	"selected_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "raffle_winners_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_winners" ADD CONSTRAINT "raffle_winners_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;