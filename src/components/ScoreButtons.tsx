'use client';

import { cn } from '@/lib/utils';
import { SCORE_LABELS } from '@/types/evaluation';

interface ScoreButtonsProps {
  value: number;
  onChange?: (score: number) => void;
  disabled?: boolean;
}

const scoreColors: Record<number, string> = {
  1: 'bg-score-1 text-white',
  2: 'bg-score-2 text-white',
  3: 'bg-score-3 text-white',
  4: 'bg-score-4 text-white',
  5: 'bg-score-5 text-white',
};

export function ScoreButtons({ value, onChange, disabled }: ScoreButtonsProps) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(score => (
        <button
          key={score}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(score)}
          className={cn(
            'flex flex-col items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border',
            value === score
              ? cn(scoreColors[score], 'border-transparent shadow-sm scale-105')
              : 'bg-muted text-muted-foreground border-border hover:bg-secondary',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <span className="text-sm font-bold">{score}</span>
          <span className="text-[10px] leading-tight">{SCORE_LABELS[score]}</span>
        </button>
      ))}
    </div>
  );
}
