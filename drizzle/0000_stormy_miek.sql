CREATE TABLE `favorite_sentiments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`item_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_favorite_sentiments_user_item` ON `favorite_sentiments` (`user_id`,`item_key`);--> statement-breakpoint
CREATE INDEX `idx_favorite_sentiments_user_created` ON `favorite_sentiments` (`user_id`,`created_at`);