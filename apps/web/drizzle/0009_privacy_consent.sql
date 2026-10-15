CREATE TABLE `privacy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`consent_version` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`ip_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `privacy_requests_created_idx` ON `privacy_requests` (`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `data_consent_version` text;--> statement-breakpoint
ALTER TABLE `users` ADD `data_consent_at` text;