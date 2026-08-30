'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { CATEGORIES, HABIT_ICONS, HABIT_COLORS } from '@/lib/constants';
import { createHabit } from '@/lib/actions/habits';
import { updateProfile } from '@/lib/actions/settings';
import type { HabitCategory, HabitMode } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2 form state
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('personal');
  const [icon, setIcon] = useState('🎯');
  const [mode, setMode] = useState<HabitMode>('flexible');
  const [color, setColor] = useState('#22c55e');

  const toggleCategory = (cat: HabitCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  async function handleCreateHabit() {
    if (!habitName.trim()) {
      setError('Give your habit a name');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createHabit({
      name: habitName.trim(),
      description: description.trim(),
      category,
      icon,
      frequency: 'daily',
      start_date: new Date().toISOString().split('T')[0],
      mode,
      color,
    });

    if (!result.success) {
      setError(result.error || 'Failed to create habit');
      setLoading(false);
      return;
    }

    await updateProfile({ onboarded: true });
    router.push('/dashboard');
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6 animate-fade-in">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className={cn('h-1 flex-1 rounded-full', step >= 1 ? 'bg-accent-green' : 'bg-border')} />
        <div className={cn('h-1 flex-1 rounded-full', step >= 2 ? 'bg-accent-green' : 'bg-border')} />
      </div>

      {step === 1 && (
        <Card padding="lg" className="animate-slide-up">
          <h1 className="text-xl font-semibold text-text-primary mb-1">
            What do you want to stay consistent with?
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Select your areas of focus. You can always add more later.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {(Object.entries(CATEGORIES) as [HabitCategory, { label: string; icon: string }][]).map(
              ([key, { label, icon }]) => (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                    selectedCategories.includes(key)
                      ? 'border-accent-green bg-accent-green/10 text-text-primary'
                      : 'border-border hover:border-border-focus text-text-secondary hover:text-text-primary'
                  )}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              )
            )}
          </div>

          <Button
            onClick={() => {
              if (selectedCategories.length > 0) {
                setCategory(selectedCategories[0]);
              }
              setStep(2);
            }}
            className="w-full"
          >
            Continue
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card padding="lg" className="animate-slide-up">
          <h1 className="text-xl font-semibold text-text-primary mb-1">
            Create your first streak
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            What&apos;s the first thing you want to track consistently?
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              id="habit-name"
              label="Habit name"
              placeholder="e.g. DSA, Gym, Reading"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              required
            />

            <Textarea
              id="habit-description"
              label="Description (optional)"
              placeholder="e.g. Solve at least 1 problem"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(CATEGORIES) as [HabitCategory, { label: string; icon: string }][]).map(
                  ([key, { label, icon: catIcon }]) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        category === key
                          ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                          : 'bg-bg-input border-border text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {catIcon} {label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.slice(0, 16).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      'w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all border',
                      icon === emoji
                        ? 'bg-accent-green/10 border-accent-green/30 scale-110'
                        : 'bg-bg-input border-border hover:bg-bg-card-hover'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all border-2',
                      color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Streak mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('flexible')}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    mode === 'flexible'
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-border hover:border-border-focus'
                  )}
                >
                  <p className="text-sm font-medium text-text-primary">Flexible</p>
                  <p className="text-xs text-text-muted mt-0.5">Can edit history</p>
                </button>
                <button
                  onClick={() => setMode('strict')}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    mode === 'strict'
                      ? 'border-accent-amber bg-accent-amber/10'
                      : 'border-border hover:border-border-focus'
                  )}
                >
                  <p className="text-sm font-medium text-text-primary">Strict</p>
                  <p className="text-xs text-text-muted mt-0.5">Can&apos;t undo</p>
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleCreateHabit} loading={loading} className="flex-1">
                Start tracking
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
