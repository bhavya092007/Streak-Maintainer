'use server';

import { createClient } from '@/lib/supabase/server';
import { MAX_STREAK_FREEZES } from '@/lib/constants';
import type { ActionResult } from '@/lib/types';

export async function useStreakFreeze(
  habitId: string,
  date: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Check habit and freeze availability
  const { data: habit } = await supabase
    .from('habits')
    .select('id, freeze_count, freeze_enabled, mode')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (!habit) return { success: false, error: 'Habit not found' };
  if (!habit.freeze_enabled) return { success: false, error: 'Streak freeze is disabled for this habit' };
  if (habit.freeze_count <= 0) return { success: false, error: 'No streak freezes available' };

  // Insert freeze record
  const { error: freezeError } = await supabase
    .from('streak_freezes')
    .insert({
      user_id: user.id,
      habit_id: habitId,
      used_date: date,
    });

  if (freezeError) {
    if (freezeError.code === '23505') {
      return { success: false, error: 'A freeze is already used for this date' };
    }
    return { success: false, error: freezeError.message };
  }

  // Decrement freeze count
  await supabase
    .from('habits')
    .update({ freeze_count: habit.freeze_count - 1 })
    .eq('id', habitId)
    .eq('user_id', user.id);

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    habit_id: habitId,
    action: 'freeze_used',
    target_date: date,
  });

  return { success: true };
}

export async function getFreezesForHabit(habitId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('streak_freezes')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .order('used_date', { ascending: true });

  return data || [];
}

export async function earnFreeze(habitId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: habit } = await supabase
    .from('habits')
    .select('freeze_count, freeze_enabled')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (!habit) return { success: false, error: 'Habit not found' };
  if (!habit.freeze_enabled) return { success: false, error: 'Freezes disabled' };
  if (habit.freeze_count >= MAX_STREAK_FREEZES) {
    return { success: false, error: `Maximum ${MAX_STREAK_FREEZES} freezes reached` };
  }

  await supabase
    .from('habits')
    .update({ freeze_count: habit.freeze_count + 1 })
    .eq('id', habitId)
    .eq('user_id', user.id);

  return { success: true };
}
