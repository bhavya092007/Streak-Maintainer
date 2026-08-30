// ============================================================
// StreakForge — Constants
// ============================================================

import type { HabitCategory } from './types';

// Milestone thresholds
export const MILESTONE_THRESHOLDS = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365, 500, 1000] as const;

// Category configuration
export const CATEGORIES: Record<HabitCategory, { label: string; icon: string; color: string }> = {
  coding: { label: 'Coding', icon: '💻', color: '#3b82f6' },
  study: { label: 'Study', icon: '📚', color: '#8b5cf6' },
  gym: { label: 'Gym', icon: '🏋️', color: '#ef4444' },
  reading: { label: 'Reading', icon: '📖', color: '#f59e0b' },
  work: { label: 'Work', icon: '💼', color: '#6366f1' },
  fitness: { label: 'Fitness', icon: '🏃', color: '#10b981' },
  personal: { label: 'Personal', icon: '🎯', color: '#ec4899' },
  other: { label: 'Other', icon: '✨', color: '#64748b' },
};

// Available habit icons
export const HABIT_ICONS = [
  '💻', '📚', '🏋️', '📖', '💼', '🏃', '🎯', '✨',
  '🧠', '✍️', '🎨', '🎵', '🧘', '💪', '🥗', '💤',
  '🌱', '📝', '🔬', '🎮', '📊', '🤝', '💡', '🚀',
  '🎸', '📸', '🧩', '🏊', '🚴', '🥊', '⚡', '🔥',
];

// Color options for habits
export const HABIT_COLORS = [
  '#22c55e', // Green (default)
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

// Contribution graph color scales
export const CONTRIBUTION_COLORS = {
  light: {
    empty: '#ebedf0',
    levels: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
  },
  dark: {
    empty: '#161b22',
    levels: ['#0e4429', '#006d32', '#26a641', '#39d353'],
  },
};

// Motivational messages
export const STREAK_MESSAGES: Record<string, string[]> = {
  increase: [
    'Another day locked in. Keep going.',
    'Consistency is building. Don\'t stop now.',
    'One more day in the books. Stack them up.',
    'The compound effect is real. Keep stacking.',
    'Discipline over motivation. You showed up.',
    'Small steps, big results. Keep moving.',
  ],
  milestone_3: ['Three days strong. The habit is forming.'],
  milestone_7: ['One week locked in. You\'re building momentum.'],
  milestone_14: ['Two weeks of consistency. This is who you are now.'],
  milestone_30: ['30 days. You\'ve built something real. Keep it alive.'],
  milestone_50: ['50 days. Most people quit by now. You didn\'t.'],
  milestone_100: ['100 days. Triple digits. Legendary consistency.'],
  milestone_365: ['365 days. A full year. You are the streak.'],
  missed: [
    'Yesterday didn\'t define your progress. Start today.',
    'A missed day is a reset, not a failure. Begin again.',
    'Everyone misses a day. Champions come back the next.',
    'The streak broke, but the habit didn\'t. Show up today.',
  ],
  approaching_record: [
    'You\'re close to your longest streak. Push through.',
    'Almost at your personal best. Don\'t stop now.',
    'A new record is within reach. Keep going.',
  ],
};

// Day labels
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Month labels
export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const MONTH_FULL_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// Consistency score weights (documented calculation)
// Score = (completionRate * 0.4) + (streakBonus * 0.3) + (longTermBonus * 0.3)
// completionRate: % of days completed out of total active days
// streakBonus: min(currentStreak / 30, 1) * 100 — rewards active streaks up to 30 days
// longTermBonus: min(totalCompletions / 100, 1) * 100 — rewards long-term commitment up to 100 days
export const CONSISTENCY_WEIGHTS = {
  completionRate: 0.4,
  streakBonus: 0.3,
  longTermBonus: 0.3,
  streakBonusCap: 30,
  longTermBonusCap: 100,
} as const;

// Max streak freezes per habit
export const MAX_STREAK_FREEZES = 3;

// Freeze earning thresholds (earn 1 freeze every N days of consistency)
export const FREEZE_EARN_INTERVAL = 14;
