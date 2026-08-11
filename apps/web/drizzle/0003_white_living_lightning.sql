ALTER TABLE `tryon_history` ADD `shoes_item_id` text REFERENCES catalog_items(id);--> statement-breakpoint
ALTER TABLE `tryon_history` ADD `bag_item_id` text REFERENCES catalog_items(id);