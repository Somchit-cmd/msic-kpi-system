'use client';

import { EvalStatus, STATUS_LABELS } from '@/types/evaluation';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const steps: EvalStatus[] = ['draft', 'submitted', 'manager_scored', 'hr_approved'];

export function WorkflowProgress({ status }: { status: EvalStatus }) {
  const currentIdx = steps.indexOf(status);
  // For rejected status, highlight the last step they reached
  const isRejected = status === 'hr_rejected';

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const isComplete = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                isCurrent && !isRejected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}>
                {isComplete && i < currentIdx ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-[11px] mt-1.5 font-medium text-center',
                isComplete ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-1 -mt-5',
                i < currentIdx ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <div className="flex flex-col items-center ml-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold bg-destructive text-destructive-foreground ring-2 ring-destructive ring-offset-2 ring-offset-background">
            ✕
          </div>
          <span className="text-[11px] mt-1.5 font-medium text-destructive">Rejected</span>
        </div>
      )}
    </div>
  );
}
