'use client';

import { useEvaluation } from '@/context/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SetupStatusBadge } from '@/components/StatusBadge';
import { Plus, FileText, CalendarRange, Eye, CheckCircle, Trash2 } from 'lucide-react';
import { KpiPlan, PlanType, SetupStatus } from '@/types/evaluation';

export default function SetupKpi() {
  const { plans, currentUser, hasDirectReports, deletePlan, navigate } = useEvaluation();

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = currentUser.role === 'admin';

  // Visibility: superadmin sees all, admin sees all, others see own + subordinates
  const visible = isSuperAdmin || isAdmin
    ? plans
    : hasDirectReports
      ? plans.filter(p => p.employeeId === currentUser.id || p.managerId === currentUser.id)
      : plans.filter(p => p.employeeId === currentUser.id);

  const performance = visible.filter(p => p.planType === 'performance');
  const quarterly = visible.filter(p => p.planType === 'quarterly');

  // Can current user review (has direct reports)?
  const canReview = (plan: KpiPlan): boolean => {
    return hasDirectReports && plan.managerId === currentUser.id && plan.setupStatus === 'submitted';
  };

  // Can HR review?
  const canHrReview = (plan: KpiPlan): boolean => {
    return isAdmin && plan.setupStatus === 'manager_approved';
  };

  const renderTable = (list: KpiPlan[], type: PlanType) => (
    list.length === 0 ? (
      <p className="text-muted-foreground text-sm py-6 text-center">
        No {type === 'performance' ? 'Performance' : 'Quarterly'} KPI plans yet.
      </p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Employee</th>
              <th className="pb-3 font-medium">Department</th>
              <th className="pb-3 font-medium">Year</th>
              {type === 'performance' && <th className="pb-3 font-medium">Period</th>}
              <th className="pb-3 font-medium">Objectives</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => {
              const parent = p.parentPlanId ? plans.find(x => x.id === p.parentPlanId) : null;
              const isOwn = p.employeeId === currentUser.id;
              const isReviewer = canReview(p);
              const isHr = canHrReview(p);
              const canEdit = isOwn && (p.setupStatus === 'draft' || p.setupStatus === 'manager_rejected' || p.setupStatus === 'hr_rejected');
              const canDelete = isAdmin || (isOwn && p.setupStatus === 'draft');

              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3 font-medium">{p.employeeName}</td>
                  <td className="py-3">{p.department}</td>
                  <td className="py-3">{p.year}</td>
                  {type === 'performance' && <td className="py-3">{p.period ?? '—'}</td>}
                  <td className="py-3">{p.objectives.length}</td>
                  <td className="py-3"><SetupStatusBadge status={p.setupStatus} /></td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {isReviewer && (
                        <Button variant="outline" size="sm" onClick={() => navigate('/setup-kpi/edit', { id: p.id, mode: 'review' })}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Review
                        </Button>
                      )}
                      {isHr && (
                        <Button variant="outline" size="sm" onClick={() => navigate('/setup-kpi/edit', { id: p.id, mode: 'hr-review' })}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> HR Review
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => navigate('/setup-kpi/edit', { id: p.id })}>Edit</Button>
                      )}
                      {!canEdit && !isReviewer && !isHr && (
                        <Button variant="ghost" size="sm" onClick={() => navigate('/setup-kpi/edit', { id: p.id })}>View</Button>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete KPI Plan</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{p.employeeName}</strong>'s {p.planType} KPI plan{p.period ? ` (${p.period})` : ''}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deletePlan(p.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Setup KPI</h1>
        <p className="text-muted-foreground mt-1">Set up Performance KPI first; Quarterly KPI selects objectives from a Performance plan. After submission, your evaluator will add rating criteria before HR final approval.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Performance KPI</CardTitle>
          <Button size="sm" onClick={() => navigate('/setup-kpi/new', { type: 'performance' })}>
            <Plus className="h-4 w-4 mr-1" /> New Performance KPI
          </Button>
        </CardHeader>
        <CardContent>{renderTable(performance, 'performance')}</CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><CalendarRange className="h-4 w-4" /> Quarterly KPI</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate('/setup-kpi/new', { type: 'quarterly' })} disabled={performance.filter(p => p.setupStatus === 'hr_approved').length === 0}>
            <Plus className="h-4 w-4 mr-1" /> New Quarterly KPI
          </Button>
        </CardHeader>
        <CardContent>
          {performance.filter(p => p.setupStatus === 'hr_approved').length === 0 && (
            <p className="text-xs text-muted-foreground mb-2">Create and get a Performance KPI approved first to enable Quarterly KPI setup.</p>
          )}
          {renderTable(quarterly, 'quarterly')}
        </CardContent>
      </Card>
    </div>
  );
}
