// ============================================================
// StreakForge — Demo Data Generator
// Generates realistic completion history for development.
// NEVER used in production paths.
// ============================================================

import type { CreateHabitInput } from './types';

const DEMO_HABITS: CreateHabitInput[] = [
  {
    name: 'DSA',
    description: 'Solve at least 1 problem',
    category: 'coding',
    icon: '💻',
    frequency: 'daily',
    start_date: '2026-01-01',
    mode: 'flexible',
    color: '#22c55e',
  },
  {
    name: 'Gym',
    description: 'Workout for 45 minutes',
    category: 'gym',
    icon: '🏋️',
    frequency: 'weekdays',
    start_date: '2026-01-01',
    mode: 'flexible',
    color: '#ef4444',
  },
  {
    name: 'Reading',
    description: 'Read 20 pages',
    category: 'reading',
    icon: '📖',
    frequency: 'daily',
    start_date: '2026-02-01',
    mode: 'flexible',
    color: '#f59e0b',
  },
  {
    name: 'Project',
    description: 'Work on side project',
    category: 'coding',
    icon: '🚀',
    frequency: 'daily',
    start_date: '2026-03-01',
    mode: 'strict',
    color: '#3b82f6',
  },
];

/**
 * Generate realistic completion dates for a habit.
 * Creates varied patterns: weekday-heavy, occasional misses, etc.
 */
function generateCompletionDates(
  startDate: string,
  endDate: string,
  consistency: number = 0.8, // 0-1, probability of completing each day
  weekendFactor: number = 0.7 // Lower = less likely on weekends
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const probability = isWeekend ? consistency * weekendFactor : consistency;

    // Add some streakiness — if yesterday was done, more likely today
    const yesterdayDate = new Date(current);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const streakBonus = dates.includes(yesterdayStr) ? 0.1 : 0;

    if (Math.random() < probability + streakBonus) {
      dates.push(current.toISOString().split('T')[0]);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function getDemoHabits(): CreateHabitInput[] {
  return DEMO_HABITS;
}

export function getDemoCompletions(today: string): Map<string, string[]> {
  const completions = new Map<string, string[]>();

  completions.set('DSA', generateCompletionDates('2026-01-01', today, 0.85, 0.6));
  completions.set('Gym', generateCompletionDates('2026-01-01', today, 0.7, 0.3));
  completions.set('Reading', generateCompletionDates('2026-02-01', today, 0.75, 0.9));
  completions.set('Project', generateCompletionDates('2026-03-01', today, 0.6, 0.5));

  return completions;
}
