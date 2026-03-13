import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
	id: serial("id").primaryKey(),
	username: text("username").notNull(),
	usernameKey: text("username_key").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analysisHistoryTable = pgTable("analysis_history", {
	id: serial("id").primaryKey(),
	ownerUsername: text("owner_username").notNull(),
	name: text("name").notNull(),
	passPercentage: integer("pass_percentage").notNull().default(40),
	subjectPassPercentages: jsonb("subject_pass_percentages").notNull().default({}),
	analysisData: jsonb("analysis_data").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type AnalysisHistory = typeof analysisHistoryTable.$inferSelect;