// ============================================================
// StreakForge — Streak Engine Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateCompletionRate,
  getWeeklyConsistency,
  getMonthlyConsistency,
  getYearlyContribution,
  checkMilestones,
  calculateConsistencyScore,
  normalizeDates,
  computeHabitMetrics,
  countMissedDays,
} from './streak-engine';

describe('normalizeDates', () => {
  it('should remove duplicates and sort ascending', () => {
    const dates = ['2026-08-30', '2026-08-28', '2026-08-30', '2026-08-29'];
    expect(normalizeDates(dates, '2026-08-30')).toEqual([
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('should filter out future dates', () => {
    const dates = ['2026-08-29', '2026-08-30', '2026-08-31'];
    expect(normalizeDates(dates, '2026-08-30')).toEqual([
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('should return empty array for empty input', () => {
    expect(normalizeDates([])).toEqual([]);
  });
});

describe('calculateCurrentStreak', () => {
  it('should return 0 for empty completions', () => {
    expect(calculateCurrentStreak([], '2026-08-30')).toBe(0);
  });

  it('should return 1 for a single completion today', () => {
    expect(calculateCurrentStreak(['2026-08-30'], '2026-08-30')).toBe(1);
  });

  it('should return 1 for a single completion yesterday (today not done)', () => {
    expect(calculateCurrentStreak(['2026-08-29'], '2026-08-30')).toBe(1);
  });

  it('should return 0 if last completion was 2 days ago', () => {
    expect(calculateCurrentStreak(['2026-08-28'], '2026-08-30')).toBe(0);
  });

  it('should count consecutive days correctly', () => {
    const dates = ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
    expect(calculateCurrentStreak(dates, '2026-08-30')).toBe(6);
  });

  it('should stop at a gap', () => {
    const dates = ['2026-08-25', '2026-08-26', '2026-08-28', '2026-08-29', '2026-08-30'];
    // Gap on Aug 27 → streak from 28-30 = 3
    expect(calculateCurrentStreak(dates, '2026-08-30')).toBe(3);
  });

  it('should handle month boundary (Jan → Feb)', () => {
    const dates = ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'];
    expect(calculateCurrentStreak(dates, '2026-02-02')).toBe(4);
  });

  it('should handle year boundary (Dec → Jan)', () => {
    const dates = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'];
    expect(calculateCurrentStreak(dates, '2026-01-02')).toBe(4);
  });

  it('should handle leap year (Feb 28 → Feb 29 → Mar 1)', () => {
    // 2028 is a leap year
    const dates = ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01'];
    expect(calculateCurrentStreak(dates, '2028-03-01')).toBe(4);
  });

  it('should handle non-leap year (Feb 28 → Mar 1)', () => {
    const dates = ['2026-02-27', '2026-02-28', '2026-03-01'];
    expect(calculateCurrentStreak(dates, '2026-03-01')).toBe(3);
  });

  it('should handle duplicate dates', () => {
    const dates = ['2026-08-29', '2026-08-29', '2026-08-30', '2026-08-30'];
    expect(calculateCurrentStreak(dates, '2026-08-30')).toBe(2);
  });

  it('should ignore future dates', () => {
    const dates = ['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01'];
    expect(calculateCurrentStreak(dates, '2026-08-30')).toBe(2);
  });

  it('should handle streak with freeze', () => {
    // Aug 28 completed, Aug 29 freeze, Aug 30 completed
    const dates = ['2026-08-28', '2026-08-30'];
    const freezes = ['2026-08-29'];
    expect(calculateCurrentStreak(dates, '2026-08-30', freezes)).toBe(3);
  });
});

describe('calculateLongestStreak', () => {
  it('should return 0 for empty completions', () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  it('should return 1 for single completion', () => {
    expect(calculateLongestStreak(['2026-08-30'])).toBe(1);
  });

  it('should find the longest run', () => {
    const dates = [
      '2026-08-01', '2026-08-02', // 2-day streak
      // gap
      '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', // 4-day streak
      // gap
      '2026-08-15', '2026-08-16', '2026-08-17', // 3-day streak
    ];
    expect(calculateLongestStreak(dates)).toBe(4);
  });

  it('should handle all consecutive', () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];
    expect(calculateLongestStreak(dates)).toBe(5);
  });

  it('should handle all isolated', () => {
    const dates = ['2026-08-01', '2026-08-03', '2026-08-05', '2026-08-07'];
    expect(calculateLongestStreak(dates)).toBe(1);
  });

  it('should cross month boundary', () => {
    const dates = ['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'];
    expect(calculateLongestStreak(dates)).toBe(4);
  });

  it('should cross year boundary', () => {
    const dates = ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'];
    expect(calculateLongestStreak(dates)).toBe(5);
  });

  it('should handle freeze bridging a gap', () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-04', '2026-08-05'];
    const freezes = ['2026-08-03'];
    expect(calculateLongestStreak(dates, freezes)).toBe(5);
  });
});

describe('calculateCompletionRate', () => {
  it('should return 0 for no completions', () => {
    expect(calculateCompletionRate([], '2026-08-01', '2026-08-10')).toBe(0);
  });

  it('should return 1 for all days completed', () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    expect(calculateCompletionRate(dates, '2026-08-01', '2026-08-03')).toBe(1);
  });

  it('should calculate partial rate correctly', () => {
    const dates = ['2026-08-01', '2026-08-03', '2026-08-05'];
    // 3 out of 5 days
    expect(calculateCompletionRate(dates, '2026-08-01', '2026-08-05')).toBe(0.6);
  });

  it('should handle single day range', () => {
    expect(calculateCompletionRate(['2026-08-01'], '2026-08-01', '2026-08-01')).toBe(1);
  });

  it('should return 0 for invalid range', () => {
    expect(calculateCompletionRate(['2026-08-01'], '2026-08-05', '2026-08-01')).toBe(0);
  });
});

describe('getWeeklyConsistency', () => {
  it('should calculate weekly consistency', () => {
    const dates = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'];
    // Week starting Aug 24 (Sun), 5 out of 7 days
    const rate = getWeeklyConsistency(dates, '2026-08-24');
    expect(rate).toBeCloseTo(5 / 7, 5);
  });

  it('should return 0 for no completions in the week', () => {
    expect(getWeeklyConsistency([], '2026-08-24')).toBe(0);
  });
});

describe('getMonthlyConsistency', () => {
  it('should calculate monthly consistency', () => {
    const dates = Array.from({ length: 15 }, (_, i) =>
      `2026-07-${String(i + 1).padStart(2, '0')}`
    );
    // 15 out of 31 days in July
    const rate = getMonthlyConsistency(dates, 2026, 7);
    expect(rate).toBeCloseTo(15 / 31, 5);
  });

  it('should handle February correctly', () => {
    const dates = ['2026-02-01', '2026-02-02', '2026-02-03'];
    // 3 out of 28 days in Feb 2026
    const rate = getMonthlyConsistency(dates, 2026, 2);
    expect(rate).toBeCloseTo(3 / 28, 5);
  });

  it('should handle leap year February', () => {
    // 2024 is a past leap year, so all 29 days are countable
    const dates = ['2024-02-29'];
    const rate = getMonthlyConsistency(dates, 2024, 2);
    expect(rate).toBeCloseTo(1 / 29, 5);
  });
});

describe('getYearlyContribution', () => {
  it('should return ~365 days of data', () => {
    const data = getYearlyContribution([]);
    // Should be between 364-371 days (aligned to Sunday)
    expect(data.length).toBeGreaterThanOrEqual(364);
    expect(data.length).toBeLessThanOrEqual(371);
  });

  it('should assign correct levels', () => {
    const dates = Array.from({ length: 100 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    // With multi-habit dates for some days
    const multiDates = [...dates, ...dates.slice(0, 20), ...dates.slice(0, 5)];
    const data = getYearlyContribution(multiDates);

    // Recent days should have higher levels
    const recentDay = data[data.length - 1];
    expect(recentDay.count).toBeGreaterThan(0);
    expect(recentDay.level).toBeGreaterThan(0);
  });

  it('should include activity names when provided', () => {
    const today = new Date().toISOString().split('T')[0];
    const habitNames = new Map([[today, ['DSA', 'Gym']]]);
    const data = getYearlyContribution([today], habitNames);
    const todayData = data.find((d) => d.date === today);
    expect(todayData?.activities).toEqual(['DSA', 'Gym']);
  });
});

describe('checkMilestones', () => {
  it('should return empty for streak below first threshold', () => {
    expect(checkMilestones(2, [])).toEqual([]);
  });

  it('should detect 3-day milestone', () => {
    expect(checkMilestones(3, [])).toEqual([3]);
  });

  it('should detect multiple milestones', () => {
    expect(checkMilestones(7, [])).toEqual([3, 7]);
  });

  it('should not re-report existing milestones', () => {
    expect(checkMilestones(7, [3])).toEqual([7]);
  });

  it('should detect 30-day milestone', () => {
    expect(checkMilestones(30, [3, 7, 14, 21])).toEqual([30]);
  });

  it('should handle 100+ day streaks', () => {
    const existing = [3, 7, 14, 21, 30, 50, 75];
    expect(checkMilestones(100, existing)).toEqual([100]);
  });
});

describe('calculateConsistencyScore', () => {
  it('should return 0 for zero metrics', () => {
    const metrics = {
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      completionRate: 0,
      missedDays: 30,
      activeDays: 30,
      weeklyConsistency: 0,
      monthlyConsistency: 0,
    };
    expect(calculateConsistencyScore(metrics)).toBe(0);
  });

  it('should return 100 for perfect metrics', () => {
    const metrics = {
      currentStreak: 30,
      longestStreak: 30,
      totalCompletions: 100,
      completionRate: 1,
      missedDays: 0,
      activeDays: 100,
      weeklyConsistency: 1,
      monthlyConsistency: 1,
    };
    expect(calculateConsistencyScore(metrics)).toBe(100);
  });

  it('should give partial score', () => {
    const metrics = {
      currentStreak: 15,
      longestStreak: 15,
      totalCompletions: 50,
      completionRate: 0.5,
      missedDays: 50,
      activeDays: 100,
      weeklyConsistency: 0.5,
      monthlyConsistency: 0.5,
    };
    const score = calculateConsistencyScore(metrics);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe('countMissedDays', () => {
  it('should count all days as missed when no completions', () => {
    expect(countMissedDays([], '2026-08-28', '2026-08-30')).toBe(3);
  });

  it('should count 0 missed when all completed', () => {
    const dates = ['2026-08-28', '2026-08-29', '2026-08-30'];
    expect(countMissedDays(dates, '2026-08-28', '2026-08-30')).toBe(0);
  });

  it('should count missed correctly with gaps', () => {
    const dates = ['2026-08-28', '2026-08-30'];
    // Aug 29 is missed
    expect(countMissedDays(dates, '2026-08-28', '2026-08-30')).toBe(1);
  });

  it('should exclude freeze dates from missed count', () => {
    expect(countMissedDays([], '2026-08-28', '2026-08-30', ['2026-08-29'])).toBe(2);
  });
});

describe('computeHabitMetrics', () => {
  it('should compute full metrics', () => {
    const dates = ['2026-08-28', '2026-08-29', '2026-08-30'];
    const metrics = computeHabitMetrics(dates, '2026-08-25', '2026-08-30');

    expect(metrics.currentStreak).toBe(3);
    expect(metrics.totalCompletions).toBe(3);
    expect(metrics.completionRate).toBeCloseTo(3 / 6, 5); // 6 days from Aug 25-30
  });

  it('should handle empty completions', () => {
    const metrics = computeHabitMetrics([], '2026-08-01', '2026-08-30');
    expect(metrics.currentStreak).toBe(0);
    expect(metrics.longestStreak).toBe(0);
    expect(metrics.totalCompletions).toBe(0);
    expect(metrics.completionRate).toBe(0);
  });
});
