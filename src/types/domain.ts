export type AppLanguage = "vi" | "en";
export type AppRole = "learner" | "facilitator" | "administrator";
export type ReadingStatus = "currently_reading" | "finished";
export type GoalStatus = "planned" | "in_progress" | "completed";
export type ModerationStatus = "draft" | "pending" | "approved" | "rejected" | "hidden";

export interface LearnerProfile {
  id: string;
  displayName: string;
  preferredLanguage: AppLanguage;
  cohortId: string;
}

export interface BookSummary {
  id: string;
  title: string;
  author?: string;
  language: AppLanguage;
  topics: string[];
}
