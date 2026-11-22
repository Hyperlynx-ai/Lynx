import { authUsers } from "drizzle-orm/supabase"

/** Supabase's auth.users table: not pulled, defined by drizzle-orm. */
export const usersInAuth = authUsers
const users = authUsers

import { pgTable, foreignKey, pgPolicy, check, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const appRole = pgEnum("app_role", ['candidate', 'recruiter', 'admin'])


export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	role: appRole().default('candidate').notNull(),
	fullName: text("full_name"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "profiles_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("profiles: update own", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(( SELECT auth.uid() AS uid) = id)`, withCheck: sql`(( SELECT auth.uid() AS uid) = id)`  }),
	pgPolicy("profiles: read own", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("profiles_full_name_check", sql`char_length(full_name) <= 200`),
]);
