'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/loading';
import { ContributionGraph } from '@/components/dashboard/contribution-graph';
import { computeHabitMetrics, calculateConsistencyScore, getYearlyContribution, getMotivationalMessage } from '@/lib/streak-engine';
import { formatDate, getTodayString, cn } from '@/lib/utils';
import { CATEGORIES, MILESTONE_THRESHOLDS } from '@/lib/constants';
import type { Habit, Completion, HabitMetrics, ContributionDay, Milestone } from '@/lib/types';
import { Flame, Trophy, CheckCircle2, TrendingUp, Calendar, ArrowLeft, Lock, Snowflake } from 'lucide-react';
import Link from 'next/link';

export default function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [metrics, setMetrics] = useState<HabitMetrics | null>(null);
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getTodayString();

      // Fetch habit
      const { data: habitData } = await supabase
        .from('habits')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (!habitData) { setLoading(false); return; }
      setHabit(habitData as Habit);

      // Fetch completions
      const { data: completionsData } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', id)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      const dates = (completionsData || []).map((c: Completion) => c.date);

      // Fetch freezes
      const { data: freezesData } = await supabase
        .from('streak_freezes')
        .select('used_date')
        .eq('habit_id', id)
        .eq('user_id', user.id);

      const freezeDates = (freezesData || []).map((f: { used_date: string }) => f.used_date);

      // Calculate metrics
      const m = computeHabitMetrics(dates, habitData.start_date, today, freezeDates);
      setMetrics(m);
      setConsistencyScore(calculateConsistencyScore(m));

      // Contribution data for this habit
      setContributions(getYearlyContribution(dates));

      // Milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('habit_id', id)
        .eq('user_id', user.id)
        .order('milestone', { ascending: true });

      setMilestones((milestonesData as Milestone[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!habit || !metrics) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Habit not found</p>
        <Link href="/habits"><Button variant="ghost" className="mt-4">← Back to habits</Button></Link>
      </div>
    );
  }

  const msg = getMotivationalMessage(metrics.currentStreak, metrics.longestStreak, false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/habits" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-3">
          <ArrowLeft size={16} /> Habits
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{habit.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{habit.name}</h1>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>{CATEGORIES[habit.category]?.label}</span>
              {habit.mode === 'strict' && (
                <span className="inline-flex items-center gap-1 text-accent-amber">
                  <Lock size={12} /> Strict
                </span>
              )}
              {habit.freeze_enabled && habit.freeze_count > 0 && (
                <span className="inline-flex items-center gap-1 text-accent-blue">
                  <Snowflake size={12} /> {habit.freeze_count} freezes
                </span>
              )}
            </div>
          </div>
        </div>
        {habit.description && (
          <p className="text-sm text-text-secondary mt-2">{habit.description}</p>
        )}
      </div>

      {/* Motivational message */}
      {msg && (
        <p className="text-sm text-text-secondary italic">"{msg}"</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted font-medium">Current</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{metrics.currentStreak}</p>
          <p className="text-xs text-text-muted">day streak</p>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-accent-amber" />
            <span className="text-xs text-text-muted font-medium">Best</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{metrics.longestStreak}</p>
          <p className="text-xs text-text-muted">days</p>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{metrics.totalCompletions}</p>
          <p className="text-xs text-text-muted">days completed</p>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-accent-purple" />
            <span className="text-xs text-text-muted font-medium">Rate</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{Math.round(metrics.completionRate * 100)}%</p>
          <p className="text-xs text-text-muted">completion</p>
        </Card>
      </div>

      {/* Weekly / Monthly Progress */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">This Week</h3>
          <div className="progress-bar mb-2">
            <div
              className="progress-bar-fill bg-accent-green"
              style={{ width: `${metrics.weeklyConsistency * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">{Math.round(metrics.weeklyConsistency * 100)}% consistent</p>
        </Card>
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">This Month</h3>
          <div className="progress-bar mb-2">
            <div
              className="progress-bar-fill bg-accent-blue"
              style={{ width: `${metrics.monthlyConsistency * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">{Math.round(metrics.monthlyConsistency * 100)}% consistent</p>
        </Card>
      </div>

      {/* Consistency Score */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary">CONSISTENCY SCORE</h3>
          <span className="text-2xl font-bold text-text-primary">{consistencyScore}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${consistencyScore}%`,
              background: `linear-gradient(90deg, #22c55e, #3b82f6)`,
            }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          Score = (completion rate × 40%) + (streak bonus × 30%) + (long-term bonus × 30%)
        </p>
      </Card>

      {/* Contribution Graph */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">ACTIVITY OVER 12 MONTHS</h3>
        <ContributionGraph data={contributions} />
      </Card>

      {/* Additional Stats */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card padding="sm">
          <p className="text-xs text-text-muted">Missed Days</p>
          <p className="text-lg font-bold text-text-primary">{metrics.missedDays}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Active Since</p>
          <p className="text-lg font-bold text-text-primary">{formatDate(habit.start_date, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Total Active Days</p>
          <p className="text-lg font-bold text-text-primary">{metrics.activeDays}</p>
        </Card>
      </div>

      {/* Milestones */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">MILESTONES</h3>
        <div className="flex flex-wrap gap-3">
          {MILESTONE_THRESHOLDS.map((threshold) => {
            const achieved = milestones.some((m) => m.milestone === threshold);
            return (
              <div
                key={threshold}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                  achieved
                    ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                    : 'border-border text-text-muted opacity-40'
                )}
              >
                <span>{achieved ? '🏆' : '🔒'}</span>
                <span className="font-medium">{threshold} days</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
