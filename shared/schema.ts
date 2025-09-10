import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roomStatusEnum = pgEnum('room_status', ['dirty', 'cleaning', 'inspection', 'clean', 'occupied']);
export const roomTypeEnum = pgEnum('room_type', ['standard', 'deluxe', 'suite']);
export const userRoleEnum = pgEnum('user_role', ['manager', 'housekeeper', 'supervisor']);
export const priorityEnum = pgEnum('priority', ['baixa', 'media', 'alta', 'urgente']);
export const problemTypeEnum = pgEnum('problem_type', ['eletrico', 'hidraulico', 'ar_condicionado', 'moveis', 'eletronicos', 'limpeza_especial', 'outros']);

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (updated for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"), // Made nullable for compatibility
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('housekeeper'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: varchar("number").notNull().unique(),
  floor: integer("floor").notNull(),
  type: roomTypeEnum("type").notNull().default('standard'),
  status: roomStatusEnum("status").notNull().default('dirty'),
  assignedTo: varchar("assigned_to").references(() => users.id),
  lastCleaned: timestamp("last_cleaned"),
  priority: priorityEnum("priority").default('media'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cleaning sessions table
export const cleaningSessions = pgTable("cleaning_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  housekeeperId: varchar("housekeeper_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  pausedTime: integer("paused_time").default(0), // in seconds
  totalTime: integer("total_time"), // in seconds
  status: varchar("status").notNull().default('active'), // active, paused, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Checklist templates table
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  items: jsonb("items").notNull(), // Array of checklist items with categories
  createdAt: timestamp("created_at").defaultNow(),
});

// Checklist completions table
export const checklistCompletions = pgTable("checklist_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  templateId: varchar("template_id").notNull().references(() => checklistTemplates.id),
  housekeeperId: varchar("housekeeper_id").notNull().references(() => users.id),
  supervisorId: varchar("supervisor_id").references(() => users.id),
  completedItems: jsonb("completed_items").notNull().default('{}'), // Object with item IDs as keys, boolean as values
  supervisorSignature: text("supervisor_signature"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Problem reports table
export const problemReports = pgTable("problem_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  reportedBy: varchar("reported_by").notNull().references(() => users.id),
  type: problemTypeEnum("type").notNull(),
  priority: priorityEnum("priority").notNull().default('media'),
  description: text("description").notNull(),
  location: text("location"),
  photos: jsonb("photos").default('[]'), // Array of photo URLs
  status: varchar("status").notNull().default('reported'), // reported, in_progress, resolved
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedRooms: many(rooms),
  cleaningSessions: many(cleaningSessions),
  checklistCompletions: many(checklistCompletions),
  problemReports: many(problemReports),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [rooms.assignedTo],
    references: [users.id],
  }),
  cleaningSessions: many(cleaningSessions),
  checklistCompletions: many(checklistCompletions),
  problemReports: many(problemReports),
}));

export const cleaningSessionsRelations = relations(cleaningSessions, ({ one }) => ({
  room: one(rooms, {
    fields: [cleaningSessions.roomId],
    references: [rooms.id],
  }),
  housekeeper: one(users, {
    fields: [cleaningSessions.housekeeperId],
    references: [users.id],
  }),
}));

export const checklistCompletionsRelations = relations(checklistCompletions, ({ one }) => ({
  room: one(rooms, {
    fields: [checklistCompletions.roomId],
    references: [rooms.id],
  }),
  template: one(checklistTemplates, {
    fields: [checklistCompletions.templateId],
    references: [checklistTemplates.id],
  }),
  housekeeper: one(users, {
    fields: [checklistCompletions.housekeeperId],
    references: [users.id],
  }),
  supervisor: one(users, {
    fields: [checklistCompletions.supervisorId],
    references: [users.id],
  }),
}));

export const problemReportsRelations = relations(problemReports, ({ one }) => ({
  room: one(rooms, {
    fields: [problemReports.roomId],
    references: [rooms.id],
  }),
  reporter: one(users, {
    fields: [problemReports.reportedBy],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [problemReports.resolvedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningSessionSchema = createInsertSchema(cleaningSessions).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.string().datetime().transform((val) => new Date(val)),
  endTime: z.string().datetime().transform((val) => new Date(val)).optional(),
});

export const insertChecklistCompletionSchema = createInsertSchema(checklistCompletions).omit({
  id: true,
  createdAt: true,
});

export const insertProblemReportSchema = createInsertSchema(problemReports).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type CleaningSession = typeof cleaningSessions.$inferSelect;
export type InsertCleaningSession = z.infer<typeof insertCleaningSessionSchema>;
export type ChecklistCompletion = typeof checklistCompletions.$inferSelect;
export type InsertChecklistCompletion = z.infer<typeof insertChecklistCompletionSchema>;
export type ProblemReport = typeof problemReports.$inferSelect;
export type InsertProblemReport = z.infer<typeof insertProblemReportSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

// WebSocket message types
export type WSMessage = {
  type: 'room_status_update' | 'timer_update' | 'checklist_update' | 'problem_report';
  data: any;
};
