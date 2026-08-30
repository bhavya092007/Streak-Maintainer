'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { DashboardSkeleton } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { ContributionGraph } from '@/components/dashboard/contribution-graph';
import { cn, getGreeting, getTodayString, formatDate } from '@/lib/utils';
import { calculateCurrentStreak, calculateLongestStreak, getYearlyContribution, generateInsights, getMotivationalMessage, computeHabitMetrics } from '@/lib/streak-engine';
import { markComplete, unmarkComplete } from '@/lib/actions/completions';
import { recordMilestones } from '@/lib/actions/milestones';
import { CATEGORIES } from '@/lib/constants';
import type { Habit, Completion, HabitWithStats, ContributionDay, Insight } from '@/lib/types';
import { Flame, Trophy, CheckCircle2, TrendingUp, Plus, Check, RotateCcw, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [profile, setProfile] = useState<{ name: string; timezone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [motivationalMsg, setMotivationalMsg] = useState('');
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, timezone')
      .eq('id', user.id)
      .single();

    setProfile(profileData);
    const tz = profileData?.timezone || 'UTC';
    const today = getTodayString(tz);

    // Fetch active habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active'])
      .order('sort_order')
      .order('created_at', { ascending: false });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const habitIds = habitsData.map((h: Habit) => h.id);

    // Fetch all completions
    const { data: completionsData } = await supabase
      .from('completions')
      .select('*')
      .eq('user_id', user.id)
      .in('habit_id', habitIds)
      .order('date', { ascending: true });

    // Fetch freezes
    const { data: freezesData } = await supabase
      .from('streak_freezes')
      .select('*')
      .eq('user_id', user.id)
      .in('habit_id', habitIds);

    // Build habit stats
    const habitsWithStats: HabitWithStats[] = habitsData.map((habit: Habit) => {
      const habitCompletions = (completionsData || []).filter(
        (c: Completion) => c.habit_id === habit.id
      );
      const habitFreezes = (freezesData || []).filter(
        (f: { habit_id: string }) => f.habit_id === habit.id
      );
      const dates = habitCompletions.map((c: Completion) => c.date);
      const freezeDates = habitFreezes.map((f: { used_date: string }) => f.used_date);
      const metrics = computeHabitMetrics(dates, habit.start_date, today, freezeDates);

      return {
        ...habit,
        currentStreak: metrics.currentStreak,
        longestStreak: metrics.longestStreak,
        totalCompletions: metrics.totalCompletions,
        completionRate: metrics.completionRate,
        completedToday: dates.includes(today),
        completions: habitCompletions,
      };
    });

    setHabits(habitsWithStats);

    // Build contribution data — all completions across all habits
    const allDates = (completionsData || []).map((c: Completion) => c.date);
    const habitNameMap = new Map<string, string[]>();
    for (const c of (completionsData || []) as Completion[]) {
      const habit = habitsData.find((h: Habit) => h.id === c.habit_id);
      if (habit) {
        const existing = habitNameMap.get(c.date) || [];
        if (!existing.includes(habit.name)) {
          existing.push(habit.name);
          habitNameMap.set(c.date, existing);
        }
      }
    }

    setContributions(getYearlyContribution(allDates, habitNameMap));
    setInsights(generateInsights(habitsWithStats));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleComplete = async (habit: HabitWithStats) => {
    const tz = profile?.timezone || 'UTC';
    const today = getTodayString(tz);
    setCompletingId(habit.id);

    if (habit.completedToday) {
      // Unmark
      const result = await unmarkComplete(habit.id, today);
      if (result.success) {
        addToast('Completion removed', 'info');
        fetchData();
      } else {
        addToast(result.error || 'Failed to remove completion', 'error');
      }
    } else {
      // Mark complete
      const result = await markComplete(habit.id, today, tz);
      if (result.success && result.data) {
        const msg = getMotivationalMessage(result.data.streak, habit.longestStreak, true);
        setMotivationalMsg(msg);
        addToast(msg, 'success');

        // Check milestones
        await recordMilestones(habit.id, result.data.streak);
        fetchData();
      } else {
        addToast(result.error || 'Failed to save', 'error');
      }
    }
    setCompletingId(null);
  };

  if (loading) return <DashboardSkeleton />;

  const greeting = getGreeting();
  const firstName = profile?.name?.split(' ')[0] || 'there';
  const today = getTodayString(profile?.timezone || 'UTC');
  const completedCount = habits.filter((h) => h.completedToday).length;
  const totalActive = habits.length;

  // Aggregate stats
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const longestEver = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);
  const totalCompletions = habits.reduce((sum, h) => sum + h.totalCompletions, 0);
  const avgRate = totalActive > 0
    ? habits.reduce((sum, h) => sum + h.completionRate, 0) / totalActive
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-text-secondary mt-1">
          {bestStreak > 0 ? 'Keep the streak alive.' : 'Start building your streak today.'}
        </p>
        {bestStreak > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Flame className="h-6 w-6 text-accent-green streak-glow" />
            <span className="text-2xl font-bold text-accent-green animate-count-up">
              {bestStreak} Day Streak
            </span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm" className="animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted font-medium">Current Streak</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{bestStreak}</p>
          <p className="text-xs text-text-muted">days</p>
        </Card>

        <Card padding="sm" className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-accent-amber" />
            <span className="text-xs text-text-muted font-medium">Longest Streak</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{longestEver}</p>
          <p className="text-xs text-text-muted">days</p>
        </Card>

        <Card padding="sm" className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{totalCompletions}</p>
          <p className="text-xs text-text-muted">days</p>
        </Card>

        <Card padding="sm" className="animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-accent-purple" />
            <span className="text-xs text-text-muted font-medium">Consistency</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{Math.round(avgRate * 100)}%</p>
          <p className="text-xs text-text-muted">overall</p>
        </Card>
      </div>

      {/* Today's Habits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Today — {formatDate(today, { month: 'short', day: 'numeric' }).toUpperCase()}
          </h2>
          <span className="text-xs text-text-muted">{completedCount}/{totalActive} completed</span>
        </div>

        {habits.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No habits yet"
            description="Create your first habit to start tracking."
            action={
              <Link href="/habits">
                <Button size="sm">
                  <Plus size={16} /> Create Habit
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => (
              <Card
                key={habit.id}
                variant="interactive"
                padding="none"
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  habit.completedToday && 'border-accent-green/30 bg-accent-green/5'
                )}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <span className="text-2xl shrink-0">{habit.icon}</span>

                  {/* Info */}
                  <Link href={`/habits/${habit.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{habit.name}</p>
                    {habit.description && (
                      <p className="text-xs text-text-muted truncate">{habit.description}</p>
                    )}
                    {habit.currentStreak > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Flame size={12} className="text-accent-green" />
                        <span className="text-xs text-accent-green font-medium">
                          {habit.currentStreak} day streak
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Complete Button */}
                  <button
                    onClick={() => handleToggleComplete(habit)}
                    disabled={completingId === habit.id}
                    className={cn(
                      'shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border-2',
                      habit.completedToday
                        ? 'bg-accent-green border-accent-green text-white animate-pulse-green'
                        : 'border-border hover:border-accent-green/50 hover:bg-accent-green/10 text-text-muted hover:text-accent-green'
                    )}
                    aria-label={habit.completedToday ? `Undo ${habit.name}` : `Complete ${habit.name}`}
                  >
                    {completingId === habit.id ? (
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                    ) : habit.completedToday ? (
                      <Check size={20} strokeWidth={3} />
                    ) : (
                      <Check size={20} />
                    )}
                  </button>
                </div>

                {/* Progress bar for today's streak as a thin accent line */}
                {habit.completedToday && (
                  <div className="h-0.5 bg-accent-green" />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Daily Progress Summary */}
      {totalActive > 0 && (
        <Card padding="md" className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-secondary">TODAY&apos;S PROGRESS</h3>
            <span className="text-lg font-bold text-text-primary">
              {Math.round((completedCount / totalActive) * 100)}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill bg-accent-green"
              style={{ width: `${(completedCount / totalActive) * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-2">
            {completedCount} of {totalActive} habits completed
          </p>
        </Card>
      )}

      {/* Contribution Graph */}
      {contributions.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Activity
          </h2>
          <Card padding="md" className="overflow-x-auto">
            <ContributionGraph data={contributions} />
          </Card>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent-amber" />
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Insights
            </h2>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-bg-card border border-border"
              >
                <span className="text-lg shrink-0">{insight.icon}</span>
                <p className="text-sm text-text-primary">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
