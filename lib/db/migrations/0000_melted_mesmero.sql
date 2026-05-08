CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`points` text NOT NULL,
	`distance` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
