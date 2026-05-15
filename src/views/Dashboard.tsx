'use client';

import { useMemo } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { calcFinalScore, getGrade, getGradeColor } from '@/types/evaluation';
import { StatusBadge, SetupStatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle, AlertCircle, FileText, CalendarRange, Plus, ArrowRight, Clock, UserCheck, ShieldCheck, Edit3 } from 'lucide-react';

interface PendingItem {
  id: string;
  type: 'kpi_review' | 'kpi_hr_review' | 'kpi_edit' | 'eval_review' | 'eval_hr_review';
  label: string;
  description: string;
  employeeName: string;
  period: string;
  badge: React.ReactNode;
  navigateTo: string;
  navigateParams: Record<string, string>;
  icon: React.ElementType;
  iconColor: string;
  sortKey: number;
}

export default function Dashboard() {
  const { currentUser, hasDirectReports, hasManager, getMyEvaluations, evaluations, plans, navigate } = useEvaluation();
  const myEvals = getMyEvaluations();
  const completed = myEvals.filter(e => e.status === 'hr_approved');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  // KPI Plans for current user
  const myPlans = plans.filter(p => p.employeeId === currentUser.id);
  const myPerformancePlans = myPlans.filter(p => p.planType === 'performance');
  const myQuarterlyPlans = myPlans.filter(p => p.planType === 'quarterly');

  // Build comprehensive pending actions for the current user
  const pendingItems = useMemo<PendingItem[]>(() => {
    const items: PendingItem[] = [];

    // 1. KPI Plans submitted to current user as evaluator (need review)
    if (hasDirectReports) {
      plans
        .filter(p => p.managerId === currentUser.id && p.setupStatus === 'submitted')
        .forEach(p => {
          items.push({
            id: `kpi-review-${p.id}`,
            type: 'kpi_review',
            label: 'Review KPI Setup',
            description: `${p.employeeName} submitted a ${p.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan for your review`,
            employeeName: p.employeeName,
            period: `${p.year} ${p.period ?? ''}`.trim(),
            badge: <SetupStatusBadge status={p.setupStatus} />,
            navigateTo: '/setup-kpi/edit',
            navigateParams: { id: p.id, mode: 'review' },
            icon: UserCheck,
            iconColor: 'text-info',
            sortKey: 1,
          });
        });
    }

    // 2. KPI Plans pending HR review (admin/superadmin)
    if (isAdmin) {
      plans
        .filter(p => p.setupStatus === 'manager_approved')
        .forEach(p => {
          items.push({
            id: `kpi-hr-${p.id}`,
            type: 'kpi_hr_review',
            label: 'HR Review KPI Setup',
            description: `${p.employeeName}'s KPI plan approved by evaluator, needs your HR final review`,
            employeeName: p.employeeName,
            period: `${p.year} ${p.period ?? ''}`.trim(),
            badge: <SetupStatusBadge status={p.setupStatus} />,
            navigateTo: '/setup-kpi/edit',
            navigateParams: { id: p.id, mode: 'hr-review' },
            icon: ShieldCheck,
            iconColor: 'text-warning',
            sortKey: 2,
          });
        });
    }

    // 3. Own KPI Plans that need editing (draft or rejected)
    plans
      .filter(p => p.employeeId === currentUser.id && (p.setupStatus === 'draft' || p.setupStatus === 'manager_rejected' || p.setupStatus === 'hr_rejected'))
      .forEach(p => {
        const isRejected = p.setupStatus === 'manager_rejected' || p.setupStatus === 'hr_rejected';
        items.push({
          id: `kpi-edit-${p.id}`,
          type: 'kpi_edit',
          label: isRejected ? 'Resubmit KPI Setup' : 'Complete KPI Setup',
          description: isRejected
            ? `Your ${p.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan was rejected. Review feedback and resubmit.`
            : `Your ${p.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan is still in draft.`,
          employeeName: currentUser.name,
          period: `${p.year} ${p.period ?? ''}`.trim(),
          badge: <SetupStatusBadge status={p.setupStatus} />,
          navigateTo: '/setup-kpi/edit',
          navigateParams: { id: p.id },
          icon: Edit3,
          iconColor: 'text-destructive',
          sortKey: isRejected ? 0 : 3,
        });
      });

    // 4. Evaluations submitted to current user as manager (need scoring)
    if (hasDirectReports) {
      evaluations
        .filter(e => e.managerId === currentUser.id && e.status === 'submitted')
        .forEach(e => {
          items.push({
            id: `eval-review-${e.id}`,
            type: 'eval_review',
            label: 'Score Evaluation',
            description: `${e.employeeName}'s self-evaluation is ready for your scoring`,
            employeeName: e.employeeName,
            period: e.period,
            badge: <StatusBadge status={e.status} />,
            navigateTo: '/evaluation',
            navigateParams: { id: e.id },
            icon: ClipboardList,
            iconColor: 'text-info',
            sortKey: 1,
          });
        });
    }

    // 5. Evaluations pending HR approval (admin/superadmin)
    if (isAdmin) {
      evaluations
        .filter(e => e.status === 'manager_scored')
        .forEach(e => {
          items.push({
            id: `eval-hr-${e.id}`,
            type: 'eval_hr_review',
            label: 'HR Approve Evaluation',
            description: `${e.employeeName}'s evaluation scored by evaluator, needs your HR approval`,
            employeeName: e.employeeName,
            period: e.period,
            badge: <StatusBadge status={e.status} />,
            navigateTo: '/evaluation',
            navigateParams: { id: e.id },
            icon: ShieldCheck,
            iconColor: 'text-warning',
            sortKey: 2,
          });
        });
    }

    // Sort: rejected first (0), then reviews (1), then HR reviews (2), then drafts (3)
    return items.sort((a, b) => a.sortKey - b.sortKey);
  }, [plans, evaluations, currentUser, hasDirectReports, isAdmin]);

  // Top-level evaluator: has direct reports but no manager (like a CEO/president)
  const isTopEvaluator = hasDirectReports && !hasManager;

  const stats = isTopEvaluator
    ? [
        { label: 'Pending Actions', value: pendingItems.length, icon: AlertCircle, color: 'text-warning' },
        { label: 'Team Evaluations', value: evaluations.filter(e => e.managerId === currentUser.id).length, icon: ClipboardList, color: 'text-primary' },
        { label: 'Completed', value: evaluations.filter(e => e.managerId === currentUser.id && e.status === 'hr_approved').length, icon: CheckCircle, color: 'text-success' },
      ]
    : [
        { label: 'My Evaluations', value: myEvals.length, icon: ClipboardList, color: 'text-primary' },
        { label: 'My KPI Plans', value: myPlans.length, icon: FileText, color: 'text-info' },
        { label: 'Pending Actions', value: pendingItems.length, icon: AlertCircle, color: 'text-warning' },
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

      {/* Pending Actions — comprehensive section */}
      {pendingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items that require your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => navigate(item.navigateTo, item.navigateParams)}
                >
                  <div className={`shrink-0 p-2 rounded-full bg-muted ${item.iconColor}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.badge}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                  </div>
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">{item.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{item.period}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
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
