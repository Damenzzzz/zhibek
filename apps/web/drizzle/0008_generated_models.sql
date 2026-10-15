CREATE TABLE `generated_models` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`image_path` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `generated_models_created_idx` ON `generated_models` (`created_at`);