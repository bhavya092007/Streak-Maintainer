'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/loading';
import { computeHabitMetrics, calculateConsistencyScore } from '@/lib/streak-engine';
import { getTodayString, formatDate } from '@/lib/utils';
import type { Habit, Completion } from '@/lib/types';
import { Flame, Trophy, Calendar, CheckCircle2, Star, TrendingUp } from 'lucide-react';

export default function RecordsPage() {
  const [records, setRecords] = useState<{
    longestOverall: { streak: number; habit: string };
    longestByCategory: { category: string; streak: number; habit: string }[];
    mostActiveMonth: { month: string; count: number };
    mostProductiveDay: { date: string; count: number };
    overallScore: number;
    totalCompletions: number;
    totalHabits: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getTodayString();

      const { data: habits } = await supabase.from('habits').select('*').eq('user_id', user.id);
      const { data: completions } = await supabase.from('completions').select('*').eq('user_id', user.id).order('date');

      if (!habits || !completions) { setLoading(false); return; }

      // Longest overall streak
      let longestOverall = { streak: 0, habit: '' };
      const longestByCategory = new Map<string, { streak: number; habit: string }>();

      for (const habit of habits as Habit[]) {
        const dates = (completions as Completion[]).filter((c) => c.habit_id === habit.id).map((c) => c.date);
        const metrics = computeHabitMetrics(dates, habit.start_date, today);

        if (metrics.longestStreak > longestOverall.streak) {
          longestOverall = { streak: metrics.longestStreak, habit: `${habit.icon} ${habit.name}` };
        }

        const existing = longestByCategory.get(habit.category);
        if (!existing || metrics.longestStreak > existing.streak) {
          longestByCategory.set(habit.category, { streak: metrics.longestStreak, habit: `${habit.icon} ${habit.name}` });
        }
      }

      // Most active month
      const monthCounts = new Map<string, number>();
      for (const c of completions as Completion[]) {
        const monthKey = c.date.substring(0, 7); // YYYY-MM
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      }

      let mostActiveMonth = { month: '', count: 0 };
      for (const [month, count] of monthCounts) {
        if (count > mostActiveMonth.count) {
          mostActiveMonth = { month, count };
        }
      }

      // Most productive day
      const dayCounts = new Map<string, number>();
      for (const c of completions as Completion[]) {
        dayCounts.set(c.date, (dayCounts.get(c.date) || 0) + 1);
      }

      let mostProductiveDay = { date: '', count: 0 };
      for (const [date, count] of dayCounts) {
        if (count > mostProductiveDay.count) {
          mostProductiveDay = { date, count };
        }
      }

      // Overall consistency
      const allDates = (completions as Completion[]).map((c) => c.date);
      const avgMetrics = computeHabitMetrics(
        allDates,
        habits.length > 0 ? (habits as Habit[]).reduce((earliest, h) => h.start_date < earliest ? h.start_date : earliest, habits[0].start_date) : today,
        today
      );
      const overallScore = calculateConsistencyScore(avgMetrics);

      setRecords({
        longestOverall,
        longestByCategory: Array.from(longestByCategory.entries()).map(([category, data]) => ({ category, ...data })),
        mostActiveMonth,
        mostProductiveDay,
        overallScore,
        totalCompletions: completions.length,
        totalHabits: habits.length,
      });
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return <PageLoader />;

  if (!records) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">No data yet. Start tracking habits to see your records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Personal Records</h1>

      {/* Overall Score */}
      <Card padding="lg" className="text-center">
        <h2 className="text-sm font-semibold text-text-secondary mb-2">OVERALL CONSISTENCY SCORE</h2>
        <div className="text-5xl font-bold text-accent-green mb-2">{records.overallScore}</div>
        <div className="max-w-xs mx-auto">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${records.overallScore}%`, background: 'linear-gradient(90deg, #22c55e, #3b82f6)' }} />
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2">{records.overallScore} / 100</p>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Longest Overall */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-accent-green" />
            <h3 className="text-sm font-semibold text-text-secondary">Longest Overall Streak</h3>
          </div>
          <p className="text-3xl font-bold text-text-primary">{records.longestOverall.streak} days</p>
          <p className="text-sm text-text-muted mt-1">{records.longestOverall.habit}</p>
        </Card>

        {/* Total Completions */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-accent-blue" />
            <h3 className="text-sm font-semibold text-text-secondary">Total Completions</h3>
          </div>
          <p className="text-3xl font-bold text-text-primary">{records.totalCompletions}</p>
          <p className="text-sm text-text-muted mt-1">across {records.totalHabits} habits</p>
        </Card>

        {/* Most Active Month */}
        {records.mostActiveMonth.month && (
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-accent-purple" />
              <h3 className="text-sm font-semibold text-text-secondary">Most Active Month</h3>
            </div>
            <p className="text-3xl font-bold text-text-primary">{records.mostActiveMonth.count}</p>
            <p className="text-sm text-text-muted mt-1">completions in {records.mostActiveMonth.month}</p>
          </Card>
        )}

        {/* Most Productive Day */}
        {records.mostProductiveDay.date && (
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-accent-amber" />
              <h3 className="text-sm font-semibold text-text-secondary">Most Productive Day</h3>
            </div>
            <p className="text-3xl font-bold text-text-primary">{records.mostProductiveDay.count} activities</p>
            <p className="text-sm text-text-muted mt-1">{formatDate(records.mostProductiveDay.date)}</p>
          </Card>
        )}
      </div>

      {/* By Category */}
      {records.longestByCategory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Longest Streaks by Category</h2>
          <div className="space-y-2">
            {records.longestByCategory.filter((r) => r.streak > 0).map((record) => (
              <Card key={record.category} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">{record.category}</p>
                    <p className="text-xs text-text-muted">{record.habit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame size={14} className="text-accent-green" />
                    <span className="text-lg font-bold text-text-primary">{record.streak}</span>
                    <span className="text-xs text-text-muted">days</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
