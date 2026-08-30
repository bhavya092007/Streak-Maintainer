'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, Completion, HabitWithStats } from '@/lib/types';
import { calculateCurrentStreak, calculateLongestStreak, calculateCompletionRate, computeHabitMetrics } from '@/lib/streak-engine';
import { getTodayString } from '@/lib/utils';

export async function markComplete(
  habitId: string,
  date: string,
  timezone: string = 'UTC'
): Promise<ActionResult<{ isNew: boolean; streak: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Validate date — server determines today to prevent clock manipulation
  const today = getTodayString(timezone);
  if (date > today) {
    return { success: false, error: 'Cannot complete a future date' };
  }

  // Check habit ownership and mode
  const { data: habit } = await supabase
    .from('habits')
    .select('id, mode, user_id, start_date')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (!habit) return { success: false, error: 'Habit not found' };

  // Check date is not before habit start
  if (date < habit.start_date) {
    return { success: false, error: 'Date is before habit start date' };
  }

  // Insert completion (unique constraint handles duplicates)
  const { data: completion, error } = await supabase
    .from('completions')
    .insert({
      user_id: user.id,
      habit_id: habitId,
      date,
      timezone,
      source: 'manual',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This day is already marked complete' };
    }
    return { success: false, error: error.message };
  }

  // Calculate new streak
  const { data: allCompletions } = await supabase
    .from('completions')
    .select('date')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  const dates = (allCompletions || []).map((c: { date: string }) => c.date);
  const currentStreak = calculateCurrentStreak(dates, today);

  // Log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    habit_id: habitId,
    action: 'completion_added',
    target_date: date,
    new_value: { completion_id: completion.id },
  });

  return { success: true, data: { isNew: true, streak: currentStreak } };
}

export async function unmarkComplete(
  habitId: string,
  date: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Check habit mode
  const { data: habit } = await supabase
    .from('habits')
    .select('mode')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (!habit) return { success: false, error: 'Habit not found' };

  if (habit.mode === 'strict') {
    return { success: false, error: 'Cannot remove completions in strict mode' };
  }

  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('date', date);

  if (error) return { success: false, error: error.message };

  // Log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    habit_id: habitId,
    action: 'completion_removed',
    target_date: date,
  });

  return { success: true };
}

export async function getCompletions(
  habitId: string,
  startDate?: string,
  endDate?: string
): Promise<Completion[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from('completions')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data } = await query;
  return (data as Completion[]) || [];
}

export async function getAllCompletions(
  startDate?: string,
  endDate?: string
): Promise<Completion[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from('completions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data } = await query;
  return (data as Completion[]) || [];
}

export async function getDailyActivity(date: string): Promise<{
  completions: Array<{ habit_id: string; habit_name: string; habit_icon: string; completed_at: string }>;
  total: number;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { completions: [], total: 0 };

  const { data } = await supabase
    .from('completions')
    .select('habit_id, completed_at, habits(name, icon)')
    .eq('user_id', user.id)
    .eq('date', date);

  const completions = (data || []).map((c: Record<string, unknown>) => {
    const habit = c.habits as { name: string; icon: string } | null;
    return {
      habit_id: c.habit_id as string,
      habit_name: habit?.name || 'Unknown',
      habit_icon: habit?.icon || '🎯',
      completed_at: c.completed_at as string,
    };
  });

  return { completions, total: completions.length };
}

export async function getHabitsWithStats(timezone: string = 'UTC'): Promise<HabitWithStats[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all active habits
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'paused'])
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!habits || habits.length === 0) return [];

  // Get all completions for these habits
  const habitIds = habits.map((h: { id: string }) => h.id);
  const { data: completions } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', user.id)
    .in('habit_id', habitIds)
    .order('date', { ascending: true });

  // Get freeze data
  const { data: freezes } = await supabase
    .from('streak_freezes')
    .select('*')
    .eq('user_id', user.id)
    .in('habit_id', habitIds);

  const today = getTodayString(timezone);

  // Compute stats for each habit
  return habits.map((habit: Record<string, unknown>) => {
    const habitCompletions = (completions || []).filter(
      (c: { habit_id: string }) => c.habit_id === habit.id
    );
    const habitFreezes = (freezes || []).filter(
      (f: { habit_id: string }) => f.habit_id === habit.id
    );
    const dates = habitCompletions.map((c: { date: string }) => c.date);
    const freezeDates = habitFreezes.map((f: { used_date: string }) => f.used_date);

    const metrics = computeHabitMetrics(dates, habit.start_date as string, today, freezeDates);

    return {
      ...habit,
      currentStreak: metrics.currentStreak,
      longestStreak: metrics.longestStreak,
      totalCompletions: metrics.totalCompletions,
      completionRate: metrics.completionRate,
      completedToday: dates.includes(today),
      completions: habitCompletions,
    } as HabitWithStats;
  });
}
