'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, CreateHabitInput, Habit, UpdateHabitInput } from '@/lib/types';

export async function createHabit(input: CreateHabitInput): Promise<ActionResult<Habit>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Validate input
  if (!input.name?.trim()) return { success: false, error: 'Habit name is required' };
  if (input.name.length > 100) return { success: false, error: 'Habit name too long' };

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      category: input.category || 'personal',
      icon: input.icon || '🎯',
      frequency: input.frequency || 'daily',
      start_date: input.start_date || new Date().toISOString().split('T')[0],
      mode: input.mode || 'flexible',
      color: input.color || '#22c55e',
      freeze_enabled: input.freeze_enabled ?? true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Log the creation
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    habit_id: data.id,
    action: 'habit_created',
    new_value: { name: data.name, category: data.category },
  });

  return { success: true, data: data as Habit };
}

export async function updateHabit(input: UpdateHabitInput): Promise<ActionResult<Habit>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };
  if (!input.id) return { success: false, error: 'Habit ID is required' };

  // Get previous values for audit log
  const { data: previous } = await supabase
    .from('habits')
    .select('*')
    .eq('id', input.id)
    .eq('user_id', user.id)
    .single();

  if (!previous) return { success: false, error: 'Habit not found' };

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description.trim();
  if (input.category !== undefined) updateData.category = input.category;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.mode !== undefined) updateData.mode = input.mode;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.freeze_enabled !== undefined) updateData.freeze_enabled = input.freeze_enabled;
  if (input.freeze_count !== undefined) updateData.freeze_count = input.freeze_count;

  const { data, error } = await supabase
    .from('habits')
    .update(updateData)
    .eq('id', input.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Log the update
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    habit_id: input.id,
    action: input.status === 'archived' ? 'habit_archived' : input.status === 'paused' ? 'habit_paused' : input.mode ? 'mode_changed' : 'habit_updated',
    previous_value: previous,
    new_value: updateData,
  });

  return { success: true, data: data as Habit };
}

export async function deleteHabit(habitId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Log before deletion
  const { data: habit } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (!habit) return { success: false, error: 'Habit not found' };

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    habit_id: habitId,
    action: 'habit_deleted',
    previous_value: habit,
  });

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getHabits(status?: string): Promise<Habit[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data } = await query;
  return (data as Habit[]) || [];
}

export async function getHabit(habitId: string): Promise<Habit | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  return data as Habit | null;
}
