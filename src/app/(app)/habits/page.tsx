'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { CATEGORIES, HABIT_ICONS, HABIT_COLORS } from '@/lib/constants';
import { createHabit, deleteHabit, updateHabit } from '@/lib/actions/habits';
import { computeHabitMetrics } from '@/lib/streak-engine';
import { cn, getTodayString } from '@/lib/utils';
import type { Habit, HabitWithStats, Completion, HabitCategory, HabitMode, HabitStatus } from '@/lib/types';
import { Plus, Flame, Search, Archive, Trash2, MoreVertical, Pause, Play } from 'lucide-react';
import Link from 'next/link';

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HabitStatus | 'all'>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HabitWithStats | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const { addToast } = useToast();

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<HabitCategory>('personal');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newMode, setNewMode] = useState<HabitMode>('flexible');
  const [newColor, setNewColor] = useState('#22c55e');
  const [creating, setCreating] = useState(false);

  async function fetchHabits() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = getTodayString();

    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
      .order('created_at', { ascending: false });

    if (!habitsData) { setLoading(false); return; }

    const habitIds = habitsData.map((h: Habit) => h.id);
    const { data: completionsData } = await supabase
      .from('completions')
      .select('*')
      .eq('user_id', user.id)
      .in('habit_id', habitIds);

    const habitsWithStats: HabitWithStats[] = habitsData.map((habit: Habit) => {
      const dates = (completionsData || [])
        .filter((c: Completion) => c.habit_id === habit.id)
        .map((c: Completion) => c.date);
      const metrics = computeHabitMetrics(dates, habit.start_date, today);
      return {
        ...habit,
        ...metrics,
        totalCompletions: metrics.totalCompletions,
        completedToday: dates.includes(today),
      } as HabitWithStats;
    });

    setHabits(habitsWithStats);
    setLoading(false);
  }

  useEffect(() => { fetchHabits(); }, []);

  const filtered = habits
    .filter((h) => filter === 'all' || h.status === filter)
    .filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createHabit({
      name: newName.trim(),
      description: newDesc.trim(),
      category: newCategory,
      icon: newIcon,
      frequency: 'daily',
      start_date: new Date().toISOString().split('T')[0],
      mode: newMode,
      color: newColor,
    });
    if (result.success) {
      addToast('Habit created!', 'success');
      setShowCreate(false);
      setNewName(''); setNewDesc('');
      fetchHabits();
    } else {
      addToast(result.error || 'Failed', 'error');
    }
    setCreating(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteHabit(deleteTarget.id);
    if (result.success) {
      addToast('Habit deleted', 'info');
      setDeleteTarget(null);
      fetchHabits();
    } else {
      addToast(result.error || 'Failed', 'error');
    }
  }

  async function handleStatusChange(habit: HabitWithStats, status: HabitStatus) {
    const result = await updateHabit({ id: habit.id, status });
    if (result.success) {
      addToast(`Habit ${status}`, 'info');
      setMenuOpen(null);
      fetchHabits();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Habits</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Habit
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search habits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
        </div>
        <div className="flex gap-2">
          {(['active', 'paused', 'archived', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
                filter === f ? 'bg-accent-green/10 text-accent-green' : 'text-text-muted hover:text-text-primary'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Habit list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={search ? '🔍' : '🎯'}
          title={search ? 'No matching habits' : 'No habits yet'}
          description={search ? 'Try a different search term.' : 'Create your first habit to get started.'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((habit) => (
            <Card key={habit.id} variant="interactive" padding="md" className="relative">
              <Link href={`/habits/${habit.id}`} className="block">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{habit.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{habit.name}</p>
                    <p className="text-xs text-text-muted capitalize">{CATEGORIES[habit.category]?.label}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {habit.currentStreak > 0 && (
                        <div className="flex items-center gap-1">
                          <Flame size={12} className="text-accent-green" />
                          <span className="text-xs text-accent-green font-medium">{habit.currentStreak}d</span>
                        </div>
                      )}
                      <span className="text-xs text-text-muted">{habit.totalCompletions} completed</span>
                      <span className="text-xs text-text-muted">{Math.round(habit.completionRate * 100)}%</span>
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: habit.color }}
                  />
                </div>
              </Link>

              {/* Actions menu */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(menuOpen === habit.id ? null : habit.id);
                  }}
                  className="p-1 rounded hover:bg-bg-card-hover text-text-muted"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen === habit.id && (
                  <div className="absolute right-0 top-8 w-40 bg-bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-scale-in">
                    {habit.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(habit, 'paused')}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-card-hover"
                      >
                        <Pause size={14} /> Pause
                      </button>
                    )}
                    {habit.status === 'paused' && (
                      <button
                        onClick={() => handleStatusChange(habit, 'active')}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-card-hover"
                      >
                        <Play size={14} /> Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(habit, 'archived')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-card-hover"
                    >
                      <Archive size={14} /> Archive
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(habit); setMenuOpen(null); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent-red hover:bg-accent-red/10"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Status badge */}
              {habit.status !== 'active' && (
                <span className={cn(
                  'absolute top-3 right-10 text-[10px] font-medium px-2 py-0.5 rounded-full',
                  habit.status === 'paused' ? 'bg-accent-amber/10 text-accent-amber' : 'bg-text-muted/10 text-text-muted'
                )}>
                  {habit.status}
                </span>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create New Habit">
        <div className="space-y-4">
          <Input id="new-name" label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. DSA, Gym" />
          <Input id="new-desc" label="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional" />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(CATEGORIES) as [HabitCategory, { label: string; icon: string }][]).map(([key, { label, icon }]) => (
                <button key={key} onClick={() => setNewCategory(key)} className={cn('px-2.5 py-1 rounded text-xs border', newCategory === key ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' : 'border-border text-text-muted')}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICONS.slice(0, 16).map((e) => (
                <button key={e} onClick={() => setNewIcon(e)} className={cn('w-9 h-9 flex items-center justify-center rounded border text-lg', newIcon === e ? 'bg-accent-green/10 border-accent-green/30' : 'border-border')}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)} className={cn('w-7 h-7 rounded-full border-2', newColor === c ? 'border-white scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setNewMode('flexible')} className={cn('p-2.5 rounded-lg border-2 text-left', newMode === 'flexible' ? 'border-accent-green bg-accent-green/10' : 'border-border')}>
              <p className="text-sm font-medium text-text-primary">Flexible</p>
              <p className="text-[11px] text-text-muted">Can edit</p>
            </button>
            <button onClick={() => setNewMode('strict')} className={cn('p-2.5 rounded-lg border-2 text-left', newMode === 'strict' ? 'border-accent-amber bg-accent-amber/10' : 'border-border')}>
              <p className="text-sm font-medium text-text-primary">Strict</p>
              <p className="text-[11px] text-text-muted">Immutable</p>
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={creating} className="flex-1">Create</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={`Delete "${deleteTarget?.name}"?`}>
        <p className="text-sm text-text-secondary mb-4">
          Your {deleteTarget?.totalCompletions || 0}-day history may be affected. This action cannot be undone. Consider archiving instead.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
        </div>
      </Dialog>
    </div>
  );
}
