import {
  users,
  rooms,
  cleaningSessions,
  checklistTemplates,
  checklistCompletions,
  problemReports,
  type User,
  type InsertUser,
  type UpsertUser,
  type Room,
  type InsertRoom,
  type CleaningSession,
  type InsertCleaningSession,
  type ChecklistTemplate,
  type ChecklistCompletion,
  type InsertChecklistCompletion,
  type ProblemReport,
  type InsertProblemReport,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Room operations
  getAllRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  getRoomsByAssignedUser(userId: string): Promise<Room[]>;
  updateRoomStatus(roomId: string, status: string): Promise<Room>;
  updateRoom(roomId: string, updates: Partial<Room>): Promise<Room>;
  createRoom(room: InsertRoom): Promise<Room>;
  
  // Cleaning session operations
  startCleaningSession(session: InsertCleaningSession): Promise<CleaningSession>;
  getActiveCleaningSession(roomId: string): Promise<CleaningSession | undefined>;
  updateCleaningSession(sessionId: string, updates: Partial<CleaningSession>): Promise<CleaningSession>;
  
  // Checklist operations
  getChecklistTemplate(name: string): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: Omit<ChecklistTemplate, 'id' | 'createdAt'>): Promise<ChecklistTemplate>;
  saveChecklistCompletion(completion: InsertChecklistCompletion): Promise<ChecklistCompletion>;
  getChecklistCompletionByRoom(roomId: string): Promise<ChecklistCompletion | undefined>;
  getChecklistCompletion(roomId: string, templateId: string): Promise<ChecklistCompletion | undefined>;
  updateChecklistCompletion(completionId: string, updates: Partial<ChecklistCompletion>): Promise<ChecklistCompletion>;
  
  // Problem report operations
  createProblemReport(report: InsertProblemReport): Promise<ProblemReport>;
  getProblemReportsByRoom(roomId: string): Promise<ProblemReport[]>;
  updateProblemReport(reportId: string, updates: Partial<ProblemReport>): Promise<ProblemReport>;
  getAllProblemReports(): Promise<ProblemReport[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            role: userData.role,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // Handle unique constraint violation on email
      if (error.message?.includes('users_email_unique')) {
        // Find existing user by email and update
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email!))
          .limit(1);
        
        if (existingUser.length > 0) {
          const [updatedUser] = await db
            .update(users)
            .set({
              firstName: userData.firstName,
              lastName: userData.lastName,
              profileImageUrl: userData.profileImageUrl,
              role: userData.role,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email!))
            .returning();
          return updatedUser;
        }
      }
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  // Room operations
  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms).orderBy(asc(rooms.number));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomsByAssignedUser(userId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.assignedTo, userId)).orderBy(asc(rooms.number));
  }

  async updateRoomStatus(roomId: string, status: string): Promise<Room> {
    const [room] = await db
      .update(rooms)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(rooms.id, roomId))
      .returning();
    return room;
  }

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
    const [room] = await db
      .update(rooms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rooms.id, roomId))
      .returning();
    return room;
  }

  async createRoom(roomData: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(roomData).returning();
    return room;
  }

  // Cleaning session operations
  async startCleaningSession(sessionData: InsertCleaningSession): Promise<CleaningSession> {
    const [session] = await db.insert(cleaningSessions).values(sessionData).returning();
    return session;
  }

  async getActiveCleaningSession(roomId: string): Promise<CleaningSession | undefined> {
    const [session] = await db
      .select()
      .from(cleaningSessions)
      .where(and(eq(cleaningSessions.roomId, roomId), or(eq(cleaningSessions.status, 'active'), eq(cleaningSessions.status, 'paused'))))
      .orderBy(desc(cleaningSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateCleaningSession(sessionId: string, updates: Partial<CleaningSession>): Promise<CleaningSession> {
    const [session] = await db
      .update(cleaningSessions)
      .set(updates)
      .where(eq(cleaningSessions.id, sessionId))
      .returning();
    return session;
  }

  // Checklist operations
  async getChecklistTemplate(name: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.name, name));
    return template;
  }

  async createChecklistTemplate(templateData: Omit<ChecklistTemplate, 'id' | 'createdAt'>): Promise<ChecklistTemplate> {
    const [template] = await db.insert(checklistTemplates).values(templateData).returning();
    return template;
  }

  async saveChecklistCompletion(completionData: InsertChecklistCompletion): Promise<ChecklistCompletion> {
    const [completion] = await db.insert(checklistCompletions).values(completionData).returning();
    return completion;
  }

  async getChecklistCompletion(roomId: string, templateId: string): Promise<ChecklistCompletion | undefined> {
    const [completion] = await db
      .select()
      .from(checklistCompletions)
      .where(and(eq(checklistCompletions.roomId, roomId), eq(checklistCompletions.templateId, templateId)))
      .orderBy(desc(checklistCompletions.createdAt))
      .limit(1);
    return completion;
  }

  async updateChecklistCompletion(completionId: string, updates: Partial<ChecklistCompletion>): Promise<ChecklistCompletion> {
    const [completion] = await db
      .update(checklistCompletions)
      .set(updates)
      .where(eq(checklistCompletions.id, completionId))
      .returning();
    return completion;
  }

  async getChecklistCompletionByRoom(roomId: string): Promise<ChecklistCompletion | undefined> {
    const [completion] = await db
      .select()
      .from(checklistCompletions)
      .where(and(eq(checklistCompletions.roomId, roomId), eq(checklistCompletions.isCompleted, true)))
      .orderBy(desc(checklistCompletions.completedAt))
      .limit(1);
    return completion;
  }

  // Problem report operations
  async createProblemReport(reportData: InsertProblemReport): Promise<ProblemReport> {
    const [report] = await db.insert(problemReports).values(reportData).returning();
    return report;
  }

  async getProblemReportsByRoom(roomId: string): Promise<ProblemReport[]> {
    return await db
      .select()
      .from(problemReports)
      .where(eq(problemReports.roomId, roomId))
      .orderBy(desc(problemReports.createdAt));
  }

  async updateProblemReport(reportId: string, updates: Partial<ProblemReport>): Promise<ProblemReport> {
    const [report] = await db
      .update(problemReports)
      .set(updates)
      .where(eq(problemReports.id, reportId))
      .returning();
    return report;
  }

  async getAllProblemReports(): Promise<ProblemReport[]> {
    return await db
      .select()
      .from(problemReports)
      .orderBy(desc(problemReports.createdAt));
  }
}

export const storage = new DatabaseStorage();
