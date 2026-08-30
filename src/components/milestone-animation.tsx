'use client';

import { useEffect, useState } from 'react';

interface MilestoneAnimationProps {
  milestone: number;
  onClose: () => void;
}

export function MilestoneAnimation({ milestone, onClose }: MilestoneAnimationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      <div
        className="text-center animate-scale-in pointer-events-auto"
        onClick={onClose}
      >
        <div className="bg-bg-card/95 backdrop-blur-xl border border-accent-green/30 rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
          {/* Trophy icon with glow */}
          <div className="text-6xl mb-4 animate-bounce">🏆</div>

          <p className="text-xs font-semibold text-accent-green uppercase tracking-widest mb-2">
            Milestone Unlocked
          </p>

          <p className="text-4xl font-extrabold text-text-primary mb-2">
            {milestone} Day Streak
          </p>

          <p className="text-sm text-text-secondary">
            You showed up for {milestone} days.
            <br />
            Keep building.
          </p>

          {/* Decorative dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent-green"
                style={{
                  opacity: 0.3 + (i * 0.15),
                  animation: `pulse-green ${1 + i * 0.2}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
