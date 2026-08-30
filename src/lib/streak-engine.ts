// ============================================================
// StreakForge — Streak Engine
// Pure functions for all streak/consistency calculations.
// The database is the source of truth. Streaks are DERIVED
// from actual dated completion records, never stored as counters.
// ============================================================

import { CONSISTENCY_WEIGHTS, MILESTONE_THRESHOLDS, STREAK_MESSAGES } from './constants';
import type { ContributionDay, HabitMetrics, HabitWithStats, Insight } from './types';
import { addDays, daysBetween, parseDate, toDateString } from './utils';

/**
 * Normalize and deduplicate an array of date strings,
 * sorted in ascending order. Filters out future dates.
 */
export function normalizeDates(dates: string[], referenceDate?: string): string[] {
  const ref = referenceDate ?? toDateString(new Date());
  const unique = [...new Set(dates)].filter((d) => d <= ref);
  unique.sort();
  return unique;
}

/**
 * Calculate the current streak ending at or before referenceDate.
 *
 * A streak is the number of consecutive days with completions,
 * counting backwards from referenceDate.
 *
 * If referenceDate itself is NOT completed, we check (referenceDate - 1)
 * to allow for "today hasn't been completed yet, but yesterday was".
 *
 * @param completionDates - Array of YYYY-MM-DD strings
 * @param referenceDate - The date to count backwards from (default: today)
 * @param freezeDates - Optional array of dates where a freeze was used
 * @returns Current streak count
 */
export function calculateCurrentStreak(
  completionDates: string[],
  referenceDate?: string,
  freezeDates: string[] = []
): number {
  const ref = referenceDate ?? toDateString(new Date());
  const dates = normalizeDates(completionDates, ref);

  if (dates.length === 0) return 0;

  const dateSet = new Set(dates);
  const freezeSet = new Set(freezeDates);

  // Start from referenceDate. If not completed, try referenceDate - 1.
  let current = ref;
  if (!dateSet.has(current) && !freezeSet.has(current)) {
    current = addDays(current, -1);
    if (!dateSet.has(current) && !freezeSet.has(current)) {
      return 0;
    }
  }

  let streak = 0;
  while (dateSet.has(current) || freezeSet.has(current)) {
    if (dateSet.has(current)) {
      streak++;
    } else if (freezeSet.has(current)) {
      streak++; // Freeze counts as maintaining the streak
    }
    current = addDays(current, -1);
  }

  return streak;
}

/**
 * Calculate the longest streak from all completion records.
 *
 * @param completionDates - Array of YYYY-MM-DD strings
 * @param freezeDates - Optional array of dates where a freeze was used
 * @returns Longest streak count
 */
export function calculateLongestStreak(
  completionDates: string[],
  freezeDates: string[] = []
): number {
  const dates = normalizeDates(completionDates);

  if (dates.length === 0) return 0;

  const freezeSet = new Set(freezeDates);

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff = daysBetween(dates[i - 1], dates[i]);

    if (diff === 1) {
      current++;
    } else if (diff === 2 && freezeSet.has(addDays(dates[i - 1], 1))) {
      // There's a freeze bridging the gap
      current += 2; // count the freeze day + the new completion
    } else {
      current = 1;
    }

    longest = Math.max(longest, current);
  }

  return longest;
}

/**
 * Calculate completion rate over a date range.
 *
 * @param completionDates - Array of YYYY-MM-DD strings
 * @param startDate - Start of range (YYYY-MM-DD)
 * @param endDate - End of range (YYYY-MM-DD)
 * @returns Rate between 0 and 1
 */
export function calculateCompletionRate(
  completionDates: string[],
  startDate: string,
  endDate: string
): number {
  const totalDays = daysBetween(startDate, endDate) + 1;
  if (totalDays <= 0) return 0;

  const dateSet = new Set(normalizeDates(completionDates));
  let completed = 0;
  let current = startDate;

  while (current <= endDate) {
    if (dateSet.has(current)) completed++;
    current = addDays(current, 1);
  }

  return completed / totalDays;
}

/**
 * Get weekly consistency (proportion of days completed in a given week).
 *
 * @param completionDates - Array of YYYY-MM-DD strings
 * @param weekStartDate - Start of the week (YYYY-MM-DD, typically Sunday)
 * @returns Rate between 0 and 1
 */
export function getWeeklyConsistency(
  completionDates: string[],
  weekStartDate: string
): number {
  const weekEnd = addDays(weekStartDate, 6);
  return calculateCompletionRate(completionDates, weekStartDate, weekEnd);
}

/**
 * Get monthly consistency (proportion of days completed in a given month).
 *
 * @param completionDates - Array of YYYY-MM-DD strings
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Rate between 0 and 1
 */
export function getMonthlyConsistency(
  completionDates: string[],
  year: number,
  month: number
): number {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Don't count future days
  const today = toDateString(new Date());
  const effectiveEnd = endDate > today ? today : endDate;

  return calculateCompletionRate(completionDates, startDate, effectiveEnd);
}

/**
 * Generate contribution data for approximately the last 12 months.
 * Returns an array of ContributionDay objects for the heatmap.
 *
 * @param completionDates - Array of YYYY-MM-DD strings (can include multiple habits)
 * @param habitNames - Optional map of date -> activity names for tooltips
 * @returns Array of ContributionDay objects
 */
export function getYearlyContribution(
  completionDates: string[],
  habitNames?: Map<string, string[]>
): ContributionDay[] {
  const today = new Date();
  const todayStr = toDateString(today);

  // Go back ~52 weeks (364 days) from today
  // Align to start on a Sunday
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 364);
  // Align to previous Sunday
  const dayOfWeek = startDate.getUTCDay();
  startDate.setUTCDate(startDate.getUTCDate() - dayOfWeek);
  const startStr = toDateString(startDate);

  // Count completions per date
  const dateCounts = new Map<string, number>();
  for (const date of completionDates) {
    if (date >= startStr && date <= todayStr) {
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    }
  }

  // Find max count for level calculation
  const counts = Array.from(dateCounts.values());
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

  // Generate all days
  const days: ContributionDay[] = [];
  let current = startStr;

  while (current <= todayStr) {
    const count = dateCounts.get(current) || 0;
    const level = maxCount === 0
      ? 0
      : count === 0
        ? 0
        : count <= maxCount * 0.25
          ? 1
          : count <= maxCount * 0.5
            ? 2
            : count <= maxCount * 0.75
              ? 3
              : 4;

    days.push({
      date: current,
      count,
      level: level as 0 | 1 | 2 | 3 | 4,
      activities: habitNames?.get(current),
    });

    current = addDays(current, 1);
  }

  return days;
}

/**
 * Check which milestones have been newly achieved.
 *
 * @param currentStreak - Current streak count
 * @param existingMilestones - Already achieved milestone values
 * @returns Array of newly achieved milestone values
 */
export function checkMilestones(
  currentStreak: number,
  existingMilestones: number[]
): number[] {
  const existingSet = new Set(existingMilestones);
  return MILESTONE_THRESHOLDS.filter(
    (threshold) => currentStreak >= threshold && !existingSet.has(threshold)
  );
}

/**
 * Calculate the overall consistency score (0-100).
 * Uses transparent, documented weights.
 *
 * Score = (completionRate * 0.4) + (streakBonus * 0.3) + (longTermBonus * 0.3)
 *
 * @param metrics - HabitMetrics object
 * @returns Score between 0 and 100
 */
export function calculateConsistencyScore(metrics: HabitMetrics): number {
  const { completionRate, currentStreak, totalCompletions } = metrics;
  const { completionRate: rateWeight, streakBonus: streakWeight, longTermBonus: ltWeight, streakBonusCap, longTermBonusCap } = CONSISTENCY_WEIGHTS;

  const rateComponent = completionRate * 100 * rateWeight;
  const streakComponent = Math.min(currentStreak / streakBonusCap, 1) * 100 * streakWeight;
  const longTermComponent = Math.min(totalCompletions / longTermBonusCap, 1) * 100 * ltWeight;

  return Math.round(rateComponent + streakComponent + longTermComponent);
}

/**
 * Generate smart insights from habit data.
 *
 * @param habits - Array of habits with their stats
 * @returns Array of Insight objects
 */
export function generateInsights(habits: HabitWithStats[]): Insight[] {
  const insights: Insight[] = [];

  if (habits.length === 0) return insights;

  // Find strongest streak
  const strongestStreak = habits.reduce((best, h) =>
    h.currentStreak > best.currentStreak ? h : best
  , habits[0]);

  if (strongestStreak.currentStreak > 0) {
    insights.push({
      type: 'streak',
      icon: '🔥',
      message: `${strongestStreak.name} is your strongest streak at ${strongestStreak.currentStreak} ${strongestStreak.currentStreak === 1 ? 'day' : 'days'}.`,
    });
  }

  // Check if approaching record
  for (const habit of habits) {
    if (habit.currentStreak > 0 && habit.longestStreak > habit.currentStreak) {
      const diff = habit.longestStreak - habit.currentStreak;
      if (diff <= 5 && diff > 0) {
        insights.push({
          type: 'record',
          icon: '🏆',
          message: `You're ${diff} ${diff === 1 ? 'day' : 'days'} away from your longest ${habit.name} streak.`,
        });
      }
    }
  }

  // Total activities this week
  const today = toDateString(new Date());
  const weekStart = addDays(today, -6);
  let weekTotal = 0;
  for (const habit of habits) {
    if (habit.completions) {
      weekTotal += habit.completions.filter(
        (c) => c.date >= weekStart && c.date <= today
      ).length;
    }
  }
  if (weekTotal > 0) {
    insights.push({
      type: 'consistency',
      icon: '⚡',
      message: `You completed ${weekTotal} ${weekTotal === 1 ? 'activity' : 'activities'} this week.`,
    });
  }

  // Overall completion today
  const completedToday = habits.filter((h) => h.completedToday).length;
  const activeHabits = habits.filter((h) => h.status === 'active').length;
  if (activeHabits > 0 && completedToday < activeHabits) {
    const remaining = activeHabits - completedToday;
    insights.push({
      type: 'consistency',
      icon: '📋',
      message: `${remaining} ${remaining === 1 ? 'habit remains' : 'habits remain'} for today. Keep going.`,
    });
  }

  // Most consistent day of week
  const dayCompletions = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  for (const habit of habits) {
    if (habit.completions) {
      for (const c of habit.completions) {
        const date = parseDate(c.date);
        dayCompletions[date.getUTCDay()]++;
      }
    }
  }
  const maxDay = dayCompletions.indexOf(Math.max(...dayCompletions));
  const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const weekdayTotal = dayCompletions.slice(1, 6).reduce((a, b) => a + b, 0);
  const weekendTotal = dayCompletions[0] + dayCompletions[6];
  if (weekdayTotal > weekendTotal * 2) {
    insights.push({
      type: 'consistency',
      icon: '📅',
      message: 'You are most consistent on weekdays.',
    });
  } else if (weekendTotal > weekdayTotal) {
    insights.push({
      type: 'consistency',
      icon: '📅',
      message: 'You are most consistent on weekends.',
    });
  } else if (dayCompletions[maxDay] > 0) {
    insights.push({
      type: 'consistency',
      icon: '📅',
      message: `You are most active on ${dayNames[maxDay]}.`,
    });
  }

  return insights.slice(0, 5); // Max 5 insights
}

/**
 * Get a motivational message based on current state.
 */
export function getMotivationalMessage(
  currentStreak: number,
  longestStreak: number,
  justCompleted: boolean
): string {
  if (justCompleted) {
    // Check milestones first
    for (const threshold of MILESTONE_THRESHOLDS) {
      const key = `milestone_${threshold}`;
      if (currentStreak === threshold && STREAK_MESSAGES[key]) {
        return STREAK_MESSAGES[key][0];
      }
    }

    // Approaching record
    if (longestStreak > currentStreak) {
      const diff = longestStreak - currentStreak;
      if (diff <= 3 && diff > 0) {
        return STREAK_MESSAGES.approaching_record[
          Math.floor(Math.random() * STREAK_MESSAGES.approaching_record.length)
        ];
      }
    }

    // General increase message
    return STREAK_MESSAGES.increase[
      Math.floor(Math.random() * STREAK_MESSAGES.increase.length)
    ];
  }

  // Missed day
  if (currentStreak === 0) {
    return STREAK_MESSAGES.missed[
      Math.floor(Math.random() * STREAK_MESSAGES.missed.length)
    ];
  }

  return `Day ${currentStreak}. Keep stacking days.`;
}

/**
 * Count missed days between start date and reference date,
 * excluding completed and frozen dates.
 */
export function countMissedDays(
  completionDates: string[],
  startDate: string,
  referenceDate: string,
  freezeDates: string[] = []
): number {
  const dateSet = new Set(normalizeDates(completionDates));
  const freezeSet = new Set(freezeDates);
  let missed = 0;
  let current = startDate;

  while (current <= referenceDate) {
    if (!dateSet.has(current) && !freezeSet.has(current)) {
      missed++;
    }
    current = addDays(current, 1);
  }

  return missed;
}

/**
 * Compute full HabitMetrics from completion data.
 */
export function computeHabitMetrics(
  completionDates: string[],
  startDate: string,
  referenceDate?: string,
  freezeDates: string[] = []
): HabitMetrics {
  const ref = referenceDate ?? toDateString(new Date());
  const dates = normalizeDates(completionDates, ref);

  const currentStreak = calculateCurrentStreak(dates, ref, freezeDates);
  const longestStreak = calculateLongestStreak(dates, freezeDates);
  const totalCompletions = dates.length;
  const totalDays = Math.max(daysBetween(startDate, ref) + 1, 1);
  const completionRate = totalCompletions / totalDays;
  const missedDays = countMissedDays(dates, startDate, ref, freezeDates);
  const activeDays = totalDays;

  // This week
  const weekStart = addDays(ref, -(parseDate(ref).getUTCDay()));
  const weeklyConsistency = getWeeklyConsistency(dates, weekStart);

  // This month
  const refDate = parseDate(ref);
  const monthlyConsistency = getMonthlyConsistency(
    dates,
    refDate.getUTCFullYear(),
    refDate.getUTCMonth() + 1
  );

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
    missedDays,
    activeDays,
    weeklyConsistency,
    monthlyConsistency,
  };
}
