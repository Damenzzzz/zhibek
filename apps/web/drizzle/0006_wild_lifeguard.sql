CREATE TABLE `looks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`cover_path` text,
	`sort_index` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'admin' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `source` text DEFAULT 'pipeline' NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `sort_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `figure_type` text;