'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '@/components/ui/theme-provider';
import { CONTRIBUTION_COLORS, MONTH_LABELS, DAY_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { ContributionDay } from '@/lib/types';

interface ContributionGraphProps {
  data: ContributionDay[];
  showLabels?: boolean;
}

export function ContributionGraph({ data, showLabels = true }: ContributionGraphProps) {
  const { resolvedTheme } = useTheme();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: ContributionDay } | null>(null);

  const colors = resolvedTheme === 'dark' ? CONTRIBUTION_COLORS.dark : CONTRIBUTION_COLORS.light;

  // Organize data into weeks (columns) and days (rows)
  const { weeks, monthLabels } = useMemo(() => {
    if (data.length === 0) return { weeks: [], monthLabels: [] };

    const weeks: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];

    for (let i = 0; i < data.length; i++) {
      const date = new Date(data[i].date + 'T00:00:00');
      const dayOfWeek = date.getUTCDay();

      // Start new week on Sunday
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(data[i]);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Calculate month label positions
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;

    for (let col = 0; col < weeks.length; col++) {
      const firstDay = weeks[col][0];
      if (firstDay) {
        const date = new Date(firstDay.date + 'T00:00:00');
        const month = date.getUTCMonth();
        if (month !== lastMonth) {
          monthLabels.push({ label: MONTH_LABELS[month], col });
          lastMonth = month;
        }
      }
    }

    return { weeks, monthLabels };
  }, [data]);

  const cellSize = 12;
  const cellGap = 3;
  const cellStep = cellSize + cellGap;
  const labelOffset = showLabels ? 30 : 0;
  const topOffset = showLabels ? 20 : 0;

  const svgWidth = labelOffset + weeks.length * cellStep + 8;
  const svgHeight = topOffset + 7 * cellStep + 8;

  const getColor = (level: number) => {
    if (level === 0) return colors.empty;
    return colors.levels[level - 1];
  };

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block"
        role="img"
        aria-label="Contribution heatmap showing activity over the past year"
      >
        {/* Month labels */}
        {showLabels && monthLabels.map(({ label, col }, i) => (
          <text
            key={`month-${i}`}
            x={labelOffset + col * cellStep}
            y={12}
            className="fill-text-muted"
            fontSize="9"
            fontFamily="inherit"
          >
            {label}
          </text>
        ))}

        {/* Day labels */}
        {showLabels && [1, 3, 5].map((day) => (
          <text
            key={`day-${day}`}
            x={0}
            y={topOffset + day * cellStep + cellSize - 2}
            className="fill-text-muted"
            fontSize="9"
            fontFamily="inherit"
          >
            {DAY_LABELS[day]}
          </text>
        ))}

        {/* Grid */}
        {weeks.map((week, col) =>
          week.map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            const row = date.getUTCDay();

            return (
              <rect
                key={day.date}
                x={labelOffset + col * cellStep}
                y={topOffset + row * cellStep}
                width={cellSize}
                height={cellSize}
                rx={2}
                ry={2}
                fill={getColor(day.level)}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  const parent = (e.target as SVGRectElement).closest('div')?.getBoundingClientRect();
                  if (parent) {
                    setTooltip({
                      x: rect.left - parent.left + rect.width / 2,
                      y: rect.top - parent.top - 8,
                      day,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <title>{`${formatDate(day.date)}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}</title>
              </rect>
            );
          })
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="contribution-tooltip absolute transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-medium text-text-primary mb-0.5">
            {formatDate(tooltip.day.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          {tooltip.day.count > 0 ? (
            <>
              <p className="text-text-secondary">
                {tooltip.day.count} {tooltip.day.count === 1 ? 'activity' : 'activities'} completed
              </p>
              {tooltip.day.activities && (
                <div className="mt-1 space-y-0.5">
                  {tooltip.day.activities.map((name) => (
                    <p key={name} className="text-text-muted text-[11px]">• {name}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-text-muted">No activity</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 text-xs text-text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getColor(level) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
