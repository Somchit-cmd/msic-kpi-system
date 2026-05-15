'use client';

import { useEvaluation } from '@/context/EvaluationContext';
import { calcFinalScore, getGrade, getGradeColor } from '@/types/evaluation';
import { StatusBadge, SetupStatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle, AlertCircle, FileText, CalendarRange, Plus } from 'lucide-react';

export default function Dashboard() {
  const { currentUser, hasDirectReports, hasManager, getMyEvaluations, getPendingActions, evaluations, plans, navigate } = useEvaluation();
  const myEvals = getMyEvaluations();
  const pending = getPendingActions();
  const completed = myEvals.filter(e => e.status === 'hr_approved');

  // KPI Plans for current user
  const myPlans = plans.filter(p => p.employeeId === currentUser.id);
  const myPerformancePlans = myPlans.filter(p => p.planType === 'performance');
  const myQuarterlyPlans = myPlans.filter(p => p.planType === 'quarterly');
  const pendingPlanActions = myPlans.filter(p => p.setupStatus === 'draft' || p.setupStatus === 'manager_rejected' || p.setupStatus === 'hr_rejected');

  // Top-level evaluator: has direct reports but no manager (like a CEO/president)
  const isTopEvaluator = hasDirectReports && !hasManager;

  const stats = isTopEvaluator
    ? [
        { label: 'Pending Evaluations', value: pending.length, icon: AlertCircle, color: 'text-warning' },
        { label: 'Team Evaluations', value: evaluations.filter(e => e.managerId === currentUser.id).length, icon: ClipboardList, color: 'text-primary' },
        { label: 'Completed', value: evaluations.filter(e => e.managerId === currentUser.id && e.status === 'hr_approved').length, icon: CheckCircle, color: 'text-success' },
      ]
    : [
        { label: 'My Evaluations', value: myEvals.length, icon: ClipboardList, color: 'text-primary' },
        { label: 'My KPI Plans', value: myPlans.length, icon: FileText, color: 'text-info' },
        { label: 'Pending Actions', value: pending.length + pendingPlanActions.length, icon: AlertCircle, color: 'text-warning' },
        { label: 'Completed', value: completed.length, icon: CheckCircle, color: 'text-success' },
      ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {currentUser.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-10 w-10 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(e => (
                    <tr
                      key={e.id}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate('/evaluation', { id: e.id })}
                    >
                      <td className="py-3 font-medium">{e.employeeName}</td>
                      <td className="py-3">{e.period}</td>
                      <td className="py-3"><StatusBadge status={e.status} /></td>
                      <td className="py-3 text-muted-foreground">{e.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My KPI Plans Section */}
      {!isTopEvaluator && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My KPI Plans</CardTitle>
            <Button size="sm" onClick={() => navigate('/setup-kpi/new', { type: 'performance' })}>
              <Plus className="h-4 w-4 mr-1" /> New KPI
            </Button>
          </CardHeader>
          <CardContent>
            {myPlans.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No KPI plans yet. Create one to get started.</p>
            ) : (
              <div className="space-y-4">
                {/* Performance KPI Plans */}
                {myPerformancePlans.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Performance KPI
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-3 font-medium">Year</th>
                            <th className="pb-3 font-medium">Period</th>
                            <th className="pb-3 font-medium">Objectives</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myPerformancePlans.map(p => {
                            const canEdit = p.setupStatus === 'draft' || p.setupStatus === 'manager_rejected' || p.setupStatus === 'hr_rejected';
                            return (
                              <tr
                                key={p.id}
                                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => navigate('/setup-kpi/edit', { id: p.id })}
                              >
                                <td className="py-3 font-medium">{p.year}</td>
                                <td className="py-3">{p.period ?? '—'}</td>
                                <td className="py-3">{p.objectives.length}</td>
                                <td className="py-3"><SetupStatusBadge status={p.setupStatus} /></td>
                                <td className="py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); navigate('/setup-kpi/edit', { id: p.id }); }}
                                  >
                                    {canEdit ? 'Edit' : 'View'}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quarterly KPI Plans */}
                {myQuarterlyPlans.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" /> Quarterly KPI
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-3 font-medium">Year</th>
                            <th className="pb-3 font-medium">Objectives</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myQuarterlyPlans.map(p => {
                            const canEdit = p.setupStatus === 'draft' || p.setupStatus === 'manager_rejected' || p.setupStatus === 'hr_rejected';
                            return (
                              <tr
                                key={p.id}
                                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => navigate('/setup-kpi/edit', { id: p.id })}
                              >
                                <td className="py-3 font-medium">{p.year}</td>
                                <td className="py-3">{p.objectives.length}</td>
                                <td className="py-3"><SetupStatusBadge status={p.setupStatus} /></td>
                                <td className="py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); navigate('/setup-kpi/edit', { id: p.id }); }}
                                  >
                                    {canEdit ? 'Edit' : 'View'}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Evaluations Section */}
      {!isTopEvaluator && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            {myEvals.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No evaluations yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Period</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myEvals.map(e => {
                      const hasManagerScore = e.status === 'manager_scored' || e.status === 'hr_approved';
                      const score = hasManagerScore ? calcFinalScore(e, true) : calcFinalScore(e, false);
                      return (
                        <tr
                          key={e.id}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate('/evaluation', { id: e.id })}
                        >
                          <td className="py-3 font-medium">{e.period}</td>
                          <td className="py-3"><StatusBadge status={e.status} /></td>
                          <td className="py-3 font-bold">{score > 0 ? score.toFixed(2) : '—'}</td>
                          <td className={`py-3 font-medium ${score > 0 ? getGradeColor(score) : 'text-muted-foreground'}`}>
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
      )}
    </div>
  );
}
