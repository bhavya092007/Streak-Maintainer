'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, Profile } from '@/lib/types';

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export async function updateProfile(updates: Partial<Profile>): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const allowedFields: Record<string, unknown> = {};
  if (updates.name !== undefined) allowedFields.name = updates.name?.trim() ?? null;
  if (updates.timezone !== undefined) allowedFields.timezone = updates.timezone;
  if (updates.preferences !== undefined) allowedFields.preferences = updates.preferences;
  if (updates.onboarded !== undefined) allowedFields.onboarded = updates.onboarded;

  const { error } = await supabase
    .from('profiles')
    .update(allowedFields)
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function exportData(format: 'json' | 'csv'): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id);

  const { data: completions } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (format === 'json') {
    const exportData = {
      exported_at: new Date().toISOString(),
      habits: habits || [],
      completions: completions || [],
    };
    return { success: true, data: JSON.stringify(exportData, null, 2) };
  }

  // CSV format
  let csv = 'habit,date,completed\n';
  const habitMap = new Map((habits || []).map((h: { id: string; name: string }) => [h.id, h.name]));

  for (const c of (completions || []) as Array<{ habit_id: string; date: string }>) {
    const habitName = habitMap.get(c.habit_id) || 'Unknown';
    csv += `"${habitName}","${c.date}",true\n`;
  }

  return { success: true, data: csv };
}

export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Delete all user data (cascades via foreign keys)
  // Profile, habits, completions, milestones, freezes, audit_logs
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (profileError) return { success: false, error: profileError.message };

  // Sign out
  await supabase.auth.signOut();

  return { success: true };
}
