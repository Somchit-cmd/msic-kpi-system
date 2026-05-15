'use client';

import { useState, useMemo } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import {
  Objective, generateBehaviorScores, isLeadershipRole,
  KpiPlan, defaultScoreCriteria, SCORE_LABELS, PlanType,
  AdjustingFactorItem, AdjustingFactorCriteria, AdjustingCategory,
  parseAdjustingCriteria, getPartWeights, ADJUSTING_SCORE_LABELS,
} from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SetupStatusBadge } from '@/components/StatusBadge';
import { Plus, Trash2, ChevronDown, ArrowLeft, Copy, AlertCircle, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const PERFORMANCE_PERIODS = ['H1', 'H2'];
const QUARTERLY_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function SetupKpiForm() {
  const { currentUser, users, addPlan, updatePlan, getPlan, plans, navigate, viewParams, settings, hasDirectReports, hasManager, pushNotification } = useEvaluation();
  const editId = viewParams.id;
  const existing = editId ? getPlan(editId) : undefined;
  const planType: PlanType = (existing?.planType ?? (viewParams.type as PlanType) ?? 'performance');
  const isQuarterly = planType === 'quarterly';
  const isEmployee = currentUser.role === 'employee';

  // Who is viewing this form?
  const isManagerView = viewParams.mode === 'review' && hasDirectReports;
  const isHrView = viewParams.mode === 'hr-review' && currentUser.role === 'admin';

  // Is this someone else's plan? (evaluator, HR, or superadmin viewing a subordinate)
  const isOwner = !existing || existing.employeeId === currentUser.id;
  const isReadOnlyView = existing && !isOwner && !isManagerView && !isHrView;

  const isLeadership = existing?.isLeadership ?? isLeadershipRole(hasDirectReports);

  // State
  const [year, setYear] = useState(existing?.year ?? '2026');
  const [period, setPeriod] = useState(existing?.period ?? '');
  const [selectedDepartment, setSelectedDepartment] = useState(existing?.department ?? currentUser.department);
  const [selectedEmployee, setSelectedEmployee] = useState(existing?.employeeName ?? currentUser.name);

  const departments = [...new Set(users.map(u => u.department))];
  const employeesInDept = hasDirectReports && !hasManager
    ? users.filter(u => u.managerId === currentUser.id)
    : users.filter(u => u.department === selectedDepartment);

  // Import from previous H
  const [importSourceId, setImportSourceId] = useState<string>('');
  const importablePlans = useMemo(
    () => plans.filter(p =>
      p.planType === 'performance' &&
      p.employeeId === (isEmployee ? currentUser.id : users.find(u => u.name === selectedEmployee)?.id) &&
      p.year === year &&
      p.setupStatus === 'hr_approved' &&
      p.period && p.period !== period // same year, different period
    ),
    [plans, selectedEmployee, year, period, isEmployee, currentUser, users]
  );

  // Performance KPI plans available as source for quarterly
  const sourcePlans = useMemo(
    () => plans.filter(p => p.planType === 'performance' && p.employeeName === selectedEmployee && p.year === year && p.setupStatus === 'hr_approved'),
    [plans, selectedEmployee, year]
  );

  const [parentPlanId, setParentPlanId] = useState<string>(existing?.parentPlanId ?? sourcePlans[0]?.id ?? '');
  const parentPlan = useMemo(() => plans.find(p => p.id === parentPlanId), [parentPlanId, plans]);

  // For quarterly: which objective IDs from parent plan to include
  const [selectedObjIds, setSelectedObjIds] = useState<string[]>(
    existing?.objectives.map(o => o.id) ?? []
  );

  // Available objective categories from settings
  const objectiveCategories = settings.objectiveCategories.length > 0
    ? settings.objectiveCategories
    : ['Operation', 'Financial'];

  // Performance objectives editor state
  const [objectives, setObjectives] = useState<Objective[]>(existing?.objectives ?? [
    { id: crypto.randomUUID(), description: '', strategy: '', supportNeeded: '', scoreCriteria: defaultScoreCriteria(), category: objectiveCategories[0]?.toLowerCase() || 'operation', weight: 100, selfScore: 0, managerScore: 0 },
  ]);

  // Part III — Adjusting Factors (structured)
  const [part3Weight, setPart3Weight] = useState(() => parseAdjustingCriteria(existing?.adjustingCriteria).partWeight);
  const [adjustingFactors, setAdjustingFactors] = useState<AdjustingFactorItem[]>(() => parseAdjustingCriteria(existing?.adjustingCriteria).factors);
  const [adjustingNotes, setAdjustingNotes] = useState(() => parseAdjustingCriteria(existing?.adjustingCriteria).notes ?? '');

  // Computed part weights
  const partWeights = useMemo(() => getPartWeights(part3Weight), [part3Weight]);
  const adjustingTotalWeight = adjustingFactors.reduce((s, f) => s + f.weight, 0);

  // Review feedback
  const [managerFeedback, setManagerFeedback] = useState(existing?.managerFeedback ?? '');
  const [hrFeedback, setHrFeedback] = useState(existing?.hrFeedback ?? '');
  const [deleteObjId, setDeleteObjId] = useState<string | null>(null);

  const totalWeight = objectives.reduce((s, o) => s + o.weight, 0);

  const addObjective = () => {
    if (objectives.length >= 10) return;
    setObjectives(prev => [...prev, { id: crypto.randomUUID(), description: '', strategy: '', supportNeeded: '', scoreCriteria: defaultScoreCriteria(), category: objectiveCategories[0]?.toLowerCase() || 'operation', weight: 0, selfScore: 0, managerScore: 0 }]);
  };
  const removeObjective = (id: string) => {
    if (objectives.length <= 2) return;
    setObjectives(prev => prev.filter(o => o.id !== id));
    setDeleteObjId(null);
  };
  const updateObjective = (id: string, field: keyof Objective, value: any) => {
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };
  const updateScoreCriteria = (objId: string, score: number, description: string) => {
    setObjectives(prev => prev.map(o =>
      o.id === objId
        ? { ...o, scoreCriteria: o.scoreCriteria.map(sc => sc.score === score ? { ...sc, description } : sc) }
        : o
    ));
  };

  // Adjusting factor helpers
  const addAdjustingFactor = () => {
    setAdjustingFactors(prev => [...prev, {
      id: crypto.randomUUID(),
      topic: '',
      category: 'positive' as AdjustingCategory,
      weight: 0,
      selfScore: 0,
      managerScore: 0,
    }]);
  };
  const removeAdjustingFactor = (id: string) => {
    setAdjustingFactors(prev => prev.filter(f => f.id !== id));
  };
  const updateAdjustingFactor = (id: string, field: keyof AdjustingFactorItem, value: any) => {
    setAdjustingFactors(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const toggleObj = (id: string) => {
    setSelectedObjIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Import objectives from a previous H plan
  const handleImport = () => {
    const sourcePlan = plans.find(p => p.id === importSourceId);
    if (!sourcePlan) { toast.error('Select a source plan'); return; }
    const imported = sourcePlan.objectives.map(o => ({
      ...o,
      id: crypto.randomUUID(),
      selfScore: 0,
      managerScore: 0,
      scoreCriteria: defaultScoreCriteria(), // reset criteria for new period
    }));
    setObjectives(imported);
    // Also import adjusting criteria
    const srcCriteria = parseAdjustingCriteria(sourcePlan.adjustingCriteria);
    setPart3Weight(srcCriteria.partWeight);
    setAdjustingFactors(srcCriteria.factors.map(f => ({ ...f, id: crypto.randomUUID(), selfScore: 0, managerScore: 0 })));
    setAdjustingNotes(srcCriteria.notes ?? '');
    toast.success(`Imported ${imported.length} objectives from ${sourcePlan.period}`);
  };

  const save = (action: 'draft' | 'submit') => {
    const empUser = isEmployee ? currentUser : users.find(u => u.name === selectedEmployee);
    const today = new Date().toISOString().split('T')[0];
    let finalObjectives: Objective[];

    if (isQuarterly) {
      if (!parentPlan) { toast.error('Select a source Performance KPI plan'); return; }
      if (selectedObjIds.length === 0) { toast.error('Select at least one objective'); return; }
      finalObjectives = parentPlan.objectives
        .filter(o => selectedObjIds.includes(o.id))
        .map(o => ({ ...o, selfScore: 0, managerScore: 0, selfPercent: 0, managerPercent: 0 }));
    } else {
      if (totalWeight !== 100) { toast.error('Objective weights must sum to 100%'); return; }
      if (objectives.length < 2) { toast.error('At least 2 objectives required'); return; }
      if (objectives.some(o => !o.description.trim())) { toast.error('All objectives must have a description'); return; }
      finalObjectives = objectives;
    }

    // Validate Part III adjusting factors
    if (!isQuarterly) {
      if (adjustingFactors.length > 0 && adjustingTotalWeight !== 100) {
        toast.error('Adjusting factor weights must sum to 100%');
        return;
      }
      if (part3Weight < 0 || part3Weight > 15) {
        toast.error('Part III weight must be between 0% and 15%');
        return;
      }
      if (adjustingFactors.some(f => !f.topic.trim())) {
        toast.error('All adjusting factors must have a topic');
        return;
      }
    }

    const targetIsLeadership = isLeadershipRole(users.some(u => u.managerId === (empUser ?? currentUser).id));

    // Serialize adjusting criteria
    const adjustingCriteriaValue: AdjustingFactorCriteria = {
      partWeight: part3Weight,
      factors: adjustingFactors,
      notes: adjustingNotes || undefined,
    };

    const plan: KpiPlan = {
      id: existing?.id ?? crypto.randomUUID(),
      planType,
      parentPlanId: isQuarterly ? parentPlanId : undefined,
      employeeId: empUser?.id ?? currentUser.id,
      employeeName: isEmployee ? currentUser.name : selectedEmployee,
      employeeTitle: empUser?.title ?? currentUser.title,
      department: isEmployee ? currentUser.department : selectedDepartment,
      managerId: empUser?.managerId ?? '',
      managerName: users.find(u => u.id === empUser?.managerId)?.name ?? '',
      year,
      period: isQuarterly ? undefined : (period || undefined),
      isLeadership: targetIsLeadership,
      setupStatus: action === 'submit' ? 'submitted' : 'draft',
      objectives: finalObjectives,
      behaviors: existing?.behaviors ?? (isQuarterly ? [] : generateBehaviorScores(targetIsLeadership)),
      adjustingCriteria: isQuarterly ? undefined : JSON.stringify(adjustingCriteriaValue),
      managerFeedback: existing?.managerFeedback,
      hrFeedback: existing?.hrFeedback,
      createdAt: existing?.createdAt ?? today,
      createdBy: existing?.createdBy ?? currentUser.id,
    };
    if (existing) { updatePlan(plan); toast.success(action === 'submit' ? 'KPI plan submitted for review' : 'Draft saved'); }
    else { addPlan(plan); toast.success(action === 'submit' ? 'KPI plan submitted for review' : 'Draft saved'); }

    // Send notification on submit
    if (action === 'submit') {
      const empUser = isEmployee ? currentUser : users.find(u => u.name === selectedEmployee);
      // Notify the manager/evaluator
      if (empUser?.managerId) {
        pushNotification({
          recipientId: empUser.managerId,
          type: 'kpi_submitted',
          title: 'KPI Plan Submitted for Review',
          message: `${empUser.name} submitted a ${planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan (${year} ${period ?? ''}) for your review.`,
          entityType: 'plan',
          entityId: plan.id,
        });
      }
    }
    navigate('/setup-kpi');
  };

  // Manager review: approve/reject with scoreCriteria + feedback
  const managerReview = (approve: boolean) => {
    if (!existing) return;
    if (approve) {
      // Check all scoreCriteria are filled
      const hasEmpty = objectives.some(o => o.scoreCriteria.some(sc => !sc.description.trim()));
      if (hasEmpty) { toast.error('Please fill in all Criteria of Rating before approving'); return; }
    }
    if (!approve && !managerFeedback.trim()) { toast.error('Please provide feedback for rejection'); return; }

    updatePlan({
      ...existing,
      objectives,
      setupStatus: approve ? 'manager_approved' : 'manager_rejected',
      managerFeedback: managerFeedback.trim() || undefined,
    });
    toast.success(approve ? 'KPI plan approved & sent to HR' : 'KPI plan rejected with feedback');

    // Send notifications
    if (approve) {
      // Notify employee
      pushNotification({
        recipientId: existing.employeeId,
        type: 'kpi_approved',
        title: 'KPI Plan Approved by Evaluator',
        message: `Your ${existing.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan (${existing.year} ${existing.period ?? ''}) has been approved by your evaluator and sent to HR.`,
        entityType: 'plan',
        entityId: existing.id,
      });
      // Notify HR (all admins)
      const hrUsers = users.filter(u => u.role === 'admin' || u.role === 'superadmin');
      hrUsers.forEach(hr => {
        pushNotification({
          recipientId: hr.id,
          type: 'kpi_manager_approved',
          title: 'KPI Plan Needs HR Review',
          message: `${existing.employeeName}'s KPI plan (${existing.year} ${existing.period ?? ''}) has been approved by the evaluator and needs your HR final review.`,
          entityType: 'plan',
          entityId: existing.id,
        });
      });
    } else {
      // Notify employee about rejection
      pushNotification({
        recipientId: existing.employeeId,
        type: 'kpi_rejected',
        title: 'KPI Plan Rejected by Evaluator',
        message: `Your ${existing.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan (${existing.year} ${existing.period ?? ''}) was rejected by your evaluator. Please review the feedback and resubmit.`,
        entityType: 'plan',
        entityId: existing.id,
      });
    }
    navigate('/setup-kpi');
  };

  // HR review: approve/reject with feedback
  const hrReview = (approve: boolean) => {
    if (!existing) return;
    if (!approve && !hrFeedback.trim()) { toast.error('Please provide feedback for rejection'); return; }

    updatePlan({
      ...existing,
      setupStatus: approve ? 'hr_approved' : 'hr_rejected',
      hrFeedback: hrFeedback.trim() || undefined,
    });
    toast.success(approve ? 'KPI plan fully approved' : 'KPI plan rejected with feedback');

    // Notify employee
    pushNotification({
      recipientId: existing.employeeId,
      type: approve ? 'kpi_hr_approved' : 'kpi_hr_rejected',
      title: approve ? 'KPI Plan Fully Approved' : 'KPI Plan Rejected by HR',
      message: approve
        ? `Your ${existing.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan (${existing.year} ${existing.period ?? ''}) has been fully approved by HR.`
        : `Your ${existing.planType === 'performance' ? 'Performance' : 'Quarterly'} KPI plan (${existing.year} ${existing.period ?? ''}) was rejected by HR. Please review the feedback and resubmit.`,
      entityType: 'plan',
      entityId: existing.id,
    });
    // If approved, also notify the manager
    if (approve && existing.managerId) {
      pushNotification({
        recipientId: existing.managerId,
        type: 'kpi_hr_approved',
        title: 'KPI Plan Fully Approved by HR',
        message: `${existing.employeeName}'s KPI plan (${existing.year} ${existing.period ?? ''}) has been fully approved by HR.`,
        entityType: 'plan',
        entityId: existing.id,
      });
    }
    navigate('/setup-kpi');
  };

  const title = isQuarterly ? 'Quarterly KPI' : 'Performance KPI';
  const periods = isQuarterly ? QUARTERLY_PERIODS : PERFORMANCE_PERIODS;

  // Can the user edit objectives? (only the owner, and only in draft/rejected status)
  const canEditObjectives = isOwner && !isManagerView && !isHrView && !isReadOnlyView && (!existing || existing.setupStatus === 'draft' || existing.setupStatus === 'manager_rejected' || existing.setupStatus === 'hr_rejected');
  // Can the manager add scoreCriteria?
  const canAddScoreCriteria = isManagerView && existing?.setupStatus === 'submitted';
  // Can HR approve/reject?
  const canHrReview = isHrView && existing?.setupStatus === 'manager_approved';

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/setup-kpi')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isReadOnlyView ? 'View' : isManagerView ? 'Review' : isHrView ? 'HR Review' : (existing ? 'Edit' : 'New')} {title} Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            {isReadOnlyView
              ? `Viewing ${existing?.employeeName}'s ${title} plan.`
              : isManagerView
              ? 'Review objectives and add Criteria of Rating for each.'
              : isHrView
                ? 'Final review before the KPI plan is approved.'
                : isEmployee
                  ? `Set up your ${title} plan. Your evaluator will add rating criteria after submission.`
                  : isQuarterly
                    ? 'Pick objectives from a Performance KPI plan.'
                    : 'Define Part I objectives and Part III adjusting criteria.'}
          </p>
        </div>
        {existing && <SetupStatusBadge status={existing.setupStatus} />}
      </div>

      {/* Feedback banners for rejected plans */}
      {existing?.setupStatus === 'manager_rejected' && existing.managerFeedback && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Evaluator Rejected — Feedback:</p>
              <p className="text-sm text-muted-foreground mt-1">{existing.managerFeedback}</p>
              <p className="text-xs text-muted-foreground mt-2">Please edit and resubmit your KPI plan.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {existing?.setupStatus === 'hr_rejected' && existing.hrFeedback && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">HR Rejected — Feedback:</p>
              <p className="text-sm text-muted-foreground mt-1">{existing.hrFeedback}</p>
              <p className="text-xs text-muted-foreground mt-2">Please edit and resubmit your KPI plan.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      {isReadOnlyView ? (
        /* Read-only view — viewing someone else's plan */
        existing && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Plan Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium ml-1">{existing.employeeName}</span></div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-1">{existing.employeeTitle}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium ml-1">{existing.department}</span></div>
              <div><span className="text-muted-foreground">Year/Period:</span> <span className="font-medium ml-1">{existing.year} {existing.period ?? ''}</span></div>
            </CardContent>
          </Card>
        )
      ) : (isEmployee && !isManagerView && !isHrView) ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Year</p>
              <Select value={year} onValueChange={setYear} disabled={!canEditObjectives}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2024','2025','2026','2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Period</p>
              <Select value={period} onValueChange={setPeriod} disabled={!canEditObjectives}>
                <SelectTrigger><SelectValue placeholder={`Select ${isQuarterly ? 'Quarter' : 'Half'}`} /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Employee</p>
              <Input value={currentUser.name} disabled className="bg-muted" />
            </div>
          </CardContent>
        </Card>
      ) : !isManagerView && !isHrView ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Year</p>
              <Select value={year} onValueChange={setYear} disabled={!canEditObjectives}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2024','2025','2026','2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Department</p>
              <Select value={selectedDepartment} onValueChange={v => {
                setSelectedDepartment(v);
                const first = users.find(u => u.department === v);
                if (first) setSelectedEmployee(first.name);
              }} disabled={!canEditObjectives}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Employee</p>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!canEditObjectives}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{employeesInDept.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Review mode — show plan info */
        existing && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Plan Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium ml-1">{existing.employeeName}</span></div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-1">{existing.employeeTitle}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium ml-1">{existing.department}</span></div>
              <div><span className="text-muted-foreground">Year/Period:</span> <span className="font-medium ml-1">{existing.year} {existing.period ?? ''}</span></div>
            </CardContent>
          </Card>
        )
      )}

      {isQuarterly ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Source Performance KPI Plan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {sourcePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved Performance KPI plan found for {isEmployee ? currentUser.name : selectedEmployee} ({year}). Create and get one approved first.</p>
              ) : (
                <Select value={parentPlanId} onValueChange={v => { setParentPlanId(v); setSelectedObjIds([]); }} disabled={!canEditObjectives}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sourcePlans.map(p => <SelectItem key={p.id} value={p.id}>{p.employeeName} — {p.year} {p.period} ({p.objectives.length} objectives)</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {parentPlan && (
            <Card>
              <CardHeader><CardTitle className="text-base">Select Objectives (Part I)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {parentPlan.objectives.map((o, i) => (
                  <label key={o.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={selectedObjIds.includes(o.id)} onCheckedChange={() => toggleObj(o.id)} disabled={!canEditObjectives} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{i + 1}. {o.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Weight: {o.weight}% · {o.category}</p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Tabs defaultValue="objectives">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="objectives">Part I — Objectives ({partWeights.part1}%)</TabsTrigger>
            <TabsTrigger value="adjusting">Part III — Adjusting ({partWeights.part3}%)</TabsTrigger>
          </TabsList>

          <TabsContent value="objectives" className="space-y-4 mt-4">
            {/* Import from previous H */}
            {canEditObjectives && !isQuarterly && importablePlans.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Import from:</span>
                    <Select value={importSourceId} onValueChange={setImportSourceId}>
                      <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select previous period plan" /></SelectTrigger>
                      <SelectContent>
                        {importablePlans.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.period} — {p.objectives.length} objectives</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleImport} disabled={!importSourceId}>
                      Import Objectives
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Weight total: <span className={totalWeight === 100 ? 'text-success font-bold' : 'text-destructive font-bold'}>{totalWeight}%</span>
                <span className="ml-2">({objectives.length}/10 objectives)</span>
              </p>
            </div>

            {/* Compact objective list */}
            <div className="space-y-2">
              {objectives.map((obj, i) => {
                // Track open state manually so we can toggle from the chevron area
                const defaultOpen = canAddScoreCriteria || (canEditObjectives && !obj.description.trim());
                return (
                <Collapsible key={obj.id} defaultOpen={defaultOpen}>
                  <Card className="overflow-hidden">
                    {/* Compact header row — always visible, NOT a button to avoid nested button errors */}
                    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <CollapsibleTrigger asChild>
                        <button type="button" className="flex items-center gap-2 shrink-0 cursor-pointer" aria-label="Toggle objective details">
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                          <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex-1 min-w-0">
                        {canEditObjectives ? (
                          <Input
                            value={obj.description}
                            onChange={e => updateObjective(obj.id, 'description', e.target.value)}
                            placeholder="Objective description..."
                            className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
                            disabled={!canEditObjectives}
                          />
                        ) : (
                          <p className="text-sm truncate">{obj.description || <span className="text-muted-foreground italic">No description</span>}</p>
                        )}
                      </div>
                      <Select value={obj.category} onValueChange={v => updateObjective(obj.id, 'category', v)} disabled={!canEditObjectives}>
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {objectiveCategories.map(cat => (
                            <SelectItem key={cat.toLowerCase()} value={cat.toLowerCase()}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input type="number" min={0} max={100} className="w-16 h-7 text-xs text-center" value={obj.weight} onChange={e => updateObjective(obj.id, 'weight', Number(e.target.value))} disabled={!canEditObjectives} />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      {canEditObjectives && objectives.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setDeleteObjId(obj.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Expanded details — strategy, support, criteria */}
                    <CollapsibleContent>
                      <div className="border-t px-4 py-3 space-y-3 bg-muted/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Strategy (How to Achieve)</p>
                            <Textarea
                              value={obj.strategy}
                              onChange={e => updateObjective(obj.id, 'strategy', e.target.value)}
                              className="min-h-[48px] text-sm"
                              disabled={!canEditObjectives}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Support Needed</p>
                            <Textarea
                              value={obj.supportNeeded}
                              onChange={e => updateObjective(obj.id, 'supportNeeded', e.target.value)}
                              className="min-h-[48px] text-sm"
                              disabled={!canEditObjectives}
                            />
                          </div>
                        </div>

                        {/* Criteria of Rating */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Criteria of Rating {canAddScoreCriteria && <span className="text-destructive">(Required — fill in before approving)</span>}
                            {!canAddScoreCriteria && !canEditObjectives && obj.scoreCriteria.every(sc => !sc.description) && <span className="italic"> (Pending evaluator review)</span>}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                            {obj.scoreCriteria.map(sc => (
                              <div key={sc.score} className="rounded-md border border-border p-2 bg-muted/20">
                                <p className="text-[10px] font-bold text-muted-foreground mb-1">Score {sc.score} — {SCORE_LABELS[sc.score]}</p>
                                {canAddScoreCriteria ? (
                                  <Input value={sc.description} onChange={e => updateScoreCriteria(obj.id, sc.score, e.target.value)} className="text-xs h-7" placeholder="Criteria..." />
                                ) : (
                                  <p className="text-xs text-muted-foreground">{sc.description || '—'}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
                );
              })}
            </div>

            {/* Add Objective button at bottom for better UX */}
            {canEditObjectives && (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => {
                  addObjective();
                  setTimeout(() => {
                    const el = document.getElementById('objectives-tab-content');
                    if (el) el.scrollTop = el.scrollHeight;
                  }, 100);
                }}
                disabled={objectives.length >= 10}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Objective
              </Button>
            )}

            {/* Delete Objective confirmation dialog */}
            <AlertDialog open={!!deleteObjId} onOpenChange={o => !o && setDeleteObjId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Objective?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove this objective and its content. You must have at least 2 objectives. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteObjId && removeObjective(deleteObjId)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Part III — Adjusting Factors */}
          <TabsContent value="adjusting" className="space-y-4 mt-4">
            {/* Part Weight Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Part III — Adjusting Factors</CardTitle>
                <CardDescription>
                  Based on remarks provided by the employee, HR, or any person, the evaluator or HRC lists out significant topics.
                  Assign Part III weight relative to overall performance. Part I and Part II weights are equal and auto-calculated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adjusting Factors Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Adjusting Factor Topics</p>
                    {adjustingFactors.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Weight total: <span className={adjustingTotalWeight === 100 ? 'text-success font-bold' : 'text-destructive font-bold'}>{adjustingTotalWeight}%</span>
                      </p>
                    )}
                  </div>

                  {adjustingFactors.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground">No adjusting factors defined.</p>
                      <p className="text-xs text-muted-foreground mt-1">Part III is optional. Add factors if there are significant topics to account for.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-3 font-medium w-8">#</th>
                            <th className="pb-3 font-medium">Topic</th>
                            <th className="pb-3 font-medium w-28">Category</th>
                            <th className="pb-3 font-medium w-24">Weight</th>
                            <th className="pb-3 font-medium w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {adjustingFactors.map((f, i) => (
                            <tr key={f.id} className="border-b last:border-0">
                              <td className="py-2 text-muted-foreground font-medium">{i + 1}</td>
                              <td className="py-2 pr-2">
                                {canEditObjectives ? (
                                  <Input
                                    value={f.topic}
                                    onChange={e => updateAdjustingFactor(f.id, 'topic', e.target.value)}
                                    placeholder="Describe the adjusting factor..."
                                    className="text-sm"
                                  />
                                ) : (
                                  <span className="text-sm">{f.topic || '—'}</span>
                                )}
                              </td>
                              <td className="py-2 pr-2">
                                {canEditObjectives ? (
                                  <Select value={f.category} onValueChange={v => updateAdjustingFactor(f.id, 'category', v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="positive">
                                        <span className="text-success">●</span> Positive
                                      </SelectItem>
                                      <SelectItem value="negative">
                                        <span className="text-destructive">●</span> Negative
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${f.category === 'positive' ? 'text-success' : 'text-destructive'}`}>
                                    <span>●</span> {f.category === 'positive' ? 'Positive' : 'Negative'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2">
                                {canEditObjectives ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      className="w-16 text-sm"
                                      value={f.weight}
                                      onChange={e => updateAdjustingFactor(f.id, 'weight', Number(e.target.value))}
                                    />
                                    <span className="text-xs text-muted-foreground">%</span>
                                  </div>
                                ) : (
                                  <span className="text-sm">{f.weight}%</span>
                                )}
                              </td>
                              <td className="py-2">
                                {canEditObjectives && (
                                  <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeAdjustingFactor(f.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {canEditObjectives && (
                    <Button variant="outline" size="sm" onClick={addAdjustingFactor} className="w-full border-dashed">
                      <Plus className="h-4 w-4 mr-1" /> Add Adjusting Factor
                    </Button>
                  )}
                </div>

                {/* Score Definitions Reference */}
                <div className="rounded-lg border border-border p-3 bg-muted/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Score Definitions for Adjusting Factors</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Object.entries(ADJUSTING_SCORE_LABELS).map(([score, label]) => (
                      <div key={score} className="flex items-start gap-2">
                        <span className={`text-xs font-bold shrink-0 w-4 ${Number(score) >= 4 ? 'text-success' : 'text-destructive'}`}>{score}</span>
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <Textarea
                    value={adjustingNotes}
                    onChange={e => setAdjustingNotes(e.target.value)}
                    className="min-h-[60px]"
                    placeholder="Additional notes about adjusting factors..."
                    disabled={!canEditObjectives}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Evaluator Review Panel */}
      {canAddScoreCriteria && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base">Evaluator Review</CardTitle>
            <CardDescription>Add Criteria of Rating for each objective above, then approve or reject.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Feedback / Comments</p>
              <Textarea
                value={managerFeedback}
                onChange={e => setManagerFeedback(e.target.value)}
                placeholder="Provide feedback to the employee (required for rejection)..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={() => managerReview(false)}>Reject</Button>
              <Button onClick={() => managerReview(true)}>Approve & Send to HR</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HR Review Panel */}
      {canHrReview && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base">HR Final Review</CardTitle>
            <CardDescription>Review the KPI plan and approve or reject with feedback.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Feedback / Comments</p>
              <Textarea
                value={hrFeedback}
                onChange={e => setHrFeedback(e.target.value)}
                placeholder="Provide feedback (required for rejection)..."
                rows={3}
              />
            </div>
            {existing.managerFeedback && (
              <div className="text-sm">
                <span className="text-muted-foreground">Evaluator Feedback: </span>
                <span>{existing.managerFeedback}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={() => hrReview(false)}>Reject</Button>
              <Button onClick={() => hrReview(true)}>Approve</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee action buttons */}
      {canEditObjectives && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => navigate('/setup-kpi')}>Cancel</Button>
          <Button variant="outline" onClick={() => save('draft')}>Save Draft</Button>
          <Button onClick={() => save('submit')}>Submit for Review</Button>
        </div>
      )}
    </div>
  );
}
