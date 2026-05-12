'use client';

import { useState } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { EvalStatus, STATUS_LABELS, calcFinalScore, getGrade, getGradeColor, ReviewType } from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus } from 'lucide-react';

export default function PerformanceReviews() {
  const { evaluations, currentUser, plans, navigate } = useEvaluation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const reviewType: ReviewType = 'performance';
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
          <h1 className="text-2xl font-bold">Performance Reviews (H1 / H2)</h1>
          <p className="text-muted-foreground mt-1">Half-year evaluations using 1–5 scoring.</p>
        </div>
        <Button onClick={() => navigate('/performance-reviews/new')} disabled={plans.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> New Review
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
            <p className="text-muted-foreground text-sm py-8 text-center">No performance reviews found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const hasManager = e.status === 'manager_scored' || e.status === 'hr_approved';
                    const score = calcFinalScore(e, hasManager);
                    return (
                      <tr key={e.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50" onClick={() => navigate('/evaluation', { id: e.id })}>
                        <td className="py-3 font-medium">{e.employeeName}</td>
                        <td className="py-3">{e.department}</td>
                        <td className="py-3">{e.period}</td>
                        <td className="py-3"><StatusBadge status={e.status} /></td>
                        <td className="py-3 font-bold">{score > 0 ? score.toFixed(2) : '—'}</td>
                        <td className={`py-3 font-medium ${score > 0 ? getGradeColor(score) : ''}`}>{score > 0 ? getGrade(score) : '—'}</td>
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
