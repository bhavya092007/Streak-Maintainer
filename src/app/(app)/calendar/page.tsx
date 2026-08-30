'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/loading';
import { cn, formatDate, toDateString, addDays } from '@/lib/utils';
import { MONTH_FULL_LABELS, DAY_LABELS } from '@/lib/constants';
import type { Habit, Completion } from '@/lib/types';
import { ChevronLeft, ChevronRight, Check, Snowflake, X } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [freezes, setFreezes] = useState<{ habit_id: string; used_date: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: h } = await supabase.from('habits').select('*').eq('user_id', user.id).in('status', ['active', 'paused']);
      setHabits((h as Habit[]) || []);

      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data: c } = await supabase.from('completions').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate);
      setCompletions((c as Completion[]) || []);

      const { data: f } = await supabase.from('streak_freezes').select('habit_id, used_date').eq('user_id', user.id).gte('used_date', startDate).lte('used_date', endDate);
      setFreezes(f || []);

      setLoading(false);
    }
    fetchData();
  }, [year, month]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateString(new Date());

  const getDayData = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCompletions = completions.filter((c) => c.date === dateStr);
    const dayFreezes = freezes.filter((f) => f.used_date === dateStr);
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    return { dateStr, completions: dayCompletions, freezes: dayFreezes, isFuture, isToday };
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDayData = selectedDate ? {
    completions: completions.filter((c) => c.date === selectedDate),
    freezes: freezes.filter((f) => f.used_date === selectedDate),
  } : null;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>

      <Card padding="md">
        {/* Month Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-bg-card-hover text-text-secondary" aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">
            {MONTH_FULL_LABELS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-bg-card-hover text-text-secondary" aria-label="Next month">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-text-muted font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for first week offset */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const { dateStr, completions: dayC, freezes: dayF, isFuture, isToday } = getDayData(day);
            const count = dayC.length;
            const activeCount = habits.filter((h) => h.status === 'active').length;
            const hasFreeze = dayF.length > 0;
            const isComplete = count >= activeCount && activeCount > 0;
            const isPartial = count > 0 && count < activeCount;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative',
                  isFuture && 'opacity-30',
                  isToday && 'ring-2 ring-accent-green/50',
                  selectedDate === dateStr && 'ring-2 ring-accent-blue',
                  isComplete && 'bg-accent-green/15 text-accent-green',
                  isPartial && 'bg-accent-amber/10 text-accent-amber',
                  !isComplete && !isPartial && !isFuture && count === 0 && !hasFreeze && 'text-text-muted hover:bg-bg-card-hover',
                  hasFreeze && 'bg-accent-blue/10 text-accent-blue'
                )}
              >
                <span>{day}</span>
                {count > 0 && !isFuture && (
                  <div className="flex gap-0.5 mt-0.5">
                    {count >= 3 ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                    ) : (
                      Array.from({ length: Math.min(count, 3) }, (_, j) => (
                        <div key={j} className="w-1 h-1 rounded-full bg-accent-green" />
                      ))
                    )}
                  </div>
                )}
                {hasFreeze && count === 0 && (
                  <Snowflake size={8} className="absolute top-1 right-1 text-accent-blue" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent-green/15" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent-amber/10" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent-blue/10" />
            <span>Freeze</span>
          </div>
        </div>
      </Card>

      {/* Selected Date Detail */}
      {selectedDate && selectedDayData && (
        <Card padding="md" className="animate-slide-up">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            {formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>

          {selectedDayData.completions.length === 0 && selectedDayData.freezes.length === 0 ? (
            <p className="text-sm text-text-muted">No activity on this day</p>
          ) : (
            <div className="space-y-2">
              {selectedDayData.completions.map((c) => {
                const habit = habits.find((h) => h.id === c.habit_id);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent-green/5">
                    <Check size={16} className="text-accent-green" />
                    <span className="text-sm text-text-primary">
                      {habit?.icon} {habit?.name || 'Unknown'}
                    </span>
                  </div>
                );
              })}
              {selectedDayData.freezes.map((f, i) => {
                const habit = habits.find((h) => h.id === f.habit_id);
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-accent-blue/5">
                    <Snowflake size={16} className="text-accent-blue" />
                    <span className="text-sm text-text-primary">
                      {habit?.icon} {habit?.name || 'Unknown'} — Freeze used
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-text-muted mt-1">
                Total: {selectedDayData.completions.length} activities
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
