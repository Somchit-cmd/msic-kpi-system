'use client';

import { useState } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { EvalStatus, STATUS_LABELS, calcQuarterlyAvg, ReviewType } from '@/types/evaluation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus } from 'lucide-react';

export default function QuarterlyReviews() {
  const { evaluations, currentUser, plans, navigate } = useEvaluation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const reviewType: ReviewType = 'quarterly';
  const visible = (currentUser.role === 'admin'
    ? evaluations
    : currentUser.role === 'president'
      ? evaluations.filter(e => e.managerId === currentUser.id || e.employeeId === currentUser.id)
      : evaluations.filter(e => e.employeeId === currentUser.id || e.managerId === currentUser.id)
  ).filter(e => e.reviewType === reviewType);

  const filtered = visible.filter(e => {
    const matchSearch = e.employeeName.toLowerCase().includes(search.toLowerCase()) || e.period.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quarterly Reviews (Q1–Q4)</h1>
          <p className="text-muted-foreground mt-1">Quarterly objectives evaluated by % achievement (0–25%).</p>
        </div>
        <Button onClick={() => navigate('/quarterly-reviews/new')} disabled={plans.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> New Quarterly Review
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search by name or period..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['draft', 'submitted', 'manager_scored', 'hr_approved', 'hr_rejected'] as EvalStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No quarterly reviews found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Avg Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const hasManager = e.status === 'manager_scored' || e.status === 'hr_approved';
                    const avg = calcQuarterlyAvg(e.objectives, hasManager);
                    return (
                      <tr key={e.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50" onClick={() => navigate('/quarterly-reviews/view', { id: e.id })}>
                        <td className="py-3 font-medium">{e.employeeName}</td>
                        <td className="py-3">{e.department}</td>
                        <td className="py-3">{e.period}</td>
                        <td className="py-3"><StatusBadge status={e.status} /></td>
                        <td className="py-3 font-bold">{avg > 0 ? `${avg.toFixed(1)}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
