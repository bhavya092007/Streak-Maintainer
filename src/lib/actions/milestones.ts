'use server';

import { createClient } from '@/lib/supabase/server';
import { checkMilestones } from '@/lib/streak-engine';
import type { ActionResult, Milestone } from '@/lib/types';

export async function recordMilestones(
  habitId: string,
  currentStreak: number
): Promise<ActionResult<Milestone[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Get existing milestones
  const { data: existing } = await supabase
    .from('milestones')
    .select('milestone')
    .eq('habit_id', habitId)
    .eq('user_id', user.id);

  const existingValues = (existing || []).map((m: { milestone: number }) => m.milestone);
  const newMilestones = checkMilestones(currentStreak, existingValues);

  if (newMilestones.length === 0) {
    return { success: true, data: [] };
  }

  const inserts = newMilestones.map((milestone) => ({
    user_id: user.id,
    habit_id: habitId,
    milestone,
  }));

  const { data, error } = await supabase
    .from('milestones')
    .insert(inserts)
    .select();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Milestone[] };
}

export async function getMilestones(habitId: string): Promise<Milestone[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('milestones')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .order('milestone', { ascending: true });

  return (data as Milestone[]) || [];
}

export async function getAllMilestones(): Promise<Milestone[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('milestones')
    .select('*')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false });

  return (data as Milestone[]) || [];
}
