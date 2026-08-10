CREATE TABLE `catalog_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text,
	`category` text NOT NULL,
	`color` text,
	`description` text,
	`image_path` text NOT NULL,
	`look_id` text NOT NULL,
	`source_photo` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tryon_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`top_item_id` text,
	`bottom_item_id` text,
	`result_image_path` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`top_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bottom_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`height_cm` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`body_type` text NOT NULL,
	`gender` text NOT NULL,
	`photo_path` text
);
