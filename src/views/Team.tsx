'use client';

import { useEvaluation } from '@/context/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { calcFinalScore, getGrade, getGradeColor } from '@/types/evaluation';
import { Users as UsersIcon } from 'lucide-react';

export default function Team() {
  const { currentUser, users, evaluations, navigate } = useEvaluation();

  if (currentUser.role === 'employee' && !currentUser.canEvaluate) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Team view is available for managers, evaluators, and HR only.</p>
      </div>
    );
  }

  const directReports = users.filter(u => u.managerId === currentUser.id);
  const allEmployees = currentUser.role === 'admin' || currentUser.role === 'superadmin'
    ? users.filter(u => u.id !== currentUser.id)
    : directReports;

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl font-bold">Team</h1>

      {allEmployees.length === 0 ? (
        <p className="text-muted-foreground">No direct reports found.</p>
      ) : (
        <div className="grid gap-4">
          {allEmployees.map(emp => {
            const empEvals = evaluations.filter(e => e.employeeId === emp.id);
            return (
              <Card key={emp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <CardTitle className="text-base">{emp.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{emp.title} · {emp.department}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {empEvals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No evaluations</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Period</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Score</th>
                            <th className="pb-2 font-medium">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empEvals.map(e => {
                            const hasManager = e.status === 'manager_scored' || e.status === 'hr_approved';
                            const score = calcFinalScore(e, hasManager);
                            return (
                              <tr
                                key={e.id}
                                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => navigate('/evaluation', { id: e.id })}
                              >
                                <td className="py-2">{e.period}</td>
                                <td className="py-2"><StatusBadge status={e.status} /></td>
                                <td className="py-2 font-bold">{score > 0 ? score.toFixed(2) : '—'}</td>
                                <td className={`py-2 font-medium ${score > 0 ? getGradeColor(score) : ''}`}>
                                  {score > 0 ? getGrade(score) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
