// ============================================================
// StreakForge — TypeScript Type Definitions
// ============================================================

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  timezone: string;
  onboarded: boolean;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  reminderTime: string;
}

export type HabitCategory = 'coding' | 'study' | 'gym' | 'reading' | 'work' | 'fitness' | 'personal' | 'other';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type HabitMode = 'strict' | 'flexible';
export type HabitStatus = 'active' | 'paused' | 'archived';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: HabitCategory;
  icon: string;
  frequency: HabitFrequency;
  start_date: string;
  mode: HabitMode;
  status: HabitStatus;
  color: string;
  freeze_count: number;
  freeze_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Completion {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed_at: string;
  timezone: string;
  source: 'manual' | 'api' | 'sync';
  created_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  habit_id: string;
  milestone: number;
  achieved_at: string;
}

export interface StreakFreeze {
  id: string;
  user_id: string;
  habit_id: string;
  used_date: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  habit_id: string | null;
  action: AuditAction;
  target_date: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export type AuditAction =
  | 'completion_added'
  | 'completion_removed'
  | 'completion_modified'
  | 'habit_created'
  | 'habit_updated'
  | 'habit_deleted'
  | 'habit_archived'
  | 'habit_paused'
  | 'freeze_used'
  | 'mode_changed';

// ============================================================
// Computed / UI Types
// ============================================================

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  completedToday: boolean;
  completions?: Completion[];
}

export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // intensity
  activities?: string[];
}

export interface DayDetail {
  date: string;
  completions: Array<{
    habitId: string;
    habitName: string;
    habitIcon: string;
    completedAt: string;
  }>;
  freezesUsed: string[];
  totalActivities: number;
}

export interface HabitMetrics {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  missedDays: number;
  activeDays: number;
  weeklyConsistency: number;
  monthlyConsistency: number;
}

export interface Insight {
  type: 'improvement' | 'streak' | 'consistency' | 'milestone' | 'record';
  icon: string;
  message: string;
}

export interface WeeklyData {
  day: string;
  count: number;
}

export interface MonthlyData {
  week: string;
  completed: number;
  total: number;
}

// ============================================================
// Form Types
// ============================================================

export interface CreateHabitInput {
  name: string;
  description?: string;
  category: HabitCategory;
  icon: string;
  frequency: HabitFrequency;
  start_date: string;
  mode: HabitMode;
  color?: string;
  freeze_enabled?: boolean;
}

export interface UpdateHabitInput {
  id: string;
  name?: string;
  description?: string;
  category?: HabitCategory;
  icon?: string;
  frequency?: HabitFrequency;
  mode?: HabitMode;
  status?: HabitStatus;
  color?: string;
  freeze_enabled?: boolean;
  freeze_count?: number;
}

// ============================================================
// API Response Types
// ============================================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
