// Re-export types from shared schema for convenience
export type {
  User,
  InsertUser,
  Room,
  InsertRoom,
  CleaningSession,
  InsertCleaningSession,
  ChecklistCompletion,
  InsertChecklistCompletion,
  ProblemReport,
  InsertProblemReport,
  ChecklistTemplate,
  WSMessage,
} from "@shared/schema";

// Import types for interface extensions
import type { Room, CleaningSession, ProblemReport } from "@shared/schema";

// Additional frontend-specific types
export interface RoomWithStats extends Room {
  activeSession?: CleaningSession;
  lastProblemReport?: ProblemReport;
}

export interface ChecklistProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface DashboardStats {
  dirty: number;
  cleaning: number;
  inspection: number;
  clean: number;
  occupied: number;
}
