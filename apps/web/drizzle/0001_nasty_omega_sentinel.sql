CREATE TABLE `credit_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`credits_spent` integer NOT NULL,
	`created_at` text NOT NULL
);
