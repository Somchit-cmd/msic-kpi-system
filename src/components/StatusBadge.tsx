'use client';

import { cn } from '@/lib/utils';
import { EvalStatus, SetupStatus, STATUS_LABELS, SETUP_STATUS_LABELS } from '@/types/evaluation';

const statusStyles: Record<EvalStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  manager_scored: 'bg-warning/10 text-warning',
  hr_approved: 'bg-success/10 text-success',
  hr_rejected: 'bg-destructive/10 text-destructive',
};

const setupStatusStyles: Record<SetupStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  manager_rejected: 'bg-destructive/10 text-destructive',
  manager_approved: 'bg-warning/10 text-warning',
  hr_rejected: 'bg-destructive/10 text-destructive',
  hr_approved: 'bg-success/10 text-success',
};

export function StatusBadge({ status }: { status: EvalStatus }) {
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusStyles[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SetupStatusBadge({ status }: { status: SetupStatus }) {
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', setupStatusStyles[status])}>
      {SETUP_STATUS_LABELS[status]}
    </span>
  );
}
