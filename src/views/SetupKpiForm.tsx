'use client';

import { useState, useMemo } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import {
  Objective, generateBehaviorScores, isLeadershipRole,
  KpiPlan, defaultScoreCriteria, SCORE_LABELS, PlanType, SetupStatus,
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
import { Plus, Trash2, ChevronDown, ArrowLeft, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PERFORMANCE_PERIODS = ['H1', 'H2'];
const QUARTERLY_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function SetupKpiForm() {
  const { currentUser, users, addPlan, updatePlan, getPlan, plans, navigate, viewParams, settings } = useEvaluation();
  const editId = viewParams.id;
  const existing = editId ? getPlan(editId) : undefined;
  const planType: PlanType = (existing?.planType ?? (viewParams.type as PlanType) ?? 'performance');
  const isQuarterly = planType === 'quarterly';
  const isEmployee = currentUser.role === 'employee';
  const isPresident = currentUser.role === 'president';

  // Who is viewing this form?
  const isManagerView = viewParams.mode === 'review' && (currentUser.role === 'manager' || currentUser.role === 'president' || (currentUser.role === 'employee' && currentUser.canEvaluate));
  const isHrView = viewParams.mode === 'hr-review' && currentUser.role === 'admin';

  const isLeadership = existing?.isLeadership ?? isLeadershipRole(currentUser);

  // State
  const [year, setYear] = useState(existing?.year ?? '2026');
  const [period, setPeriod] = useState(existing?.period ?? '');
  const [selectedDepartment, setSelectedDepartment] = useState(existing?.department ?? currentUser.department);
  const [selectedEmployee, setSelectedEmployee] = useState(existing?.employeeName ?? currentUser.name);

  const departments = [...new Set(users.map(u => u.department))];
  const employeesInDept = isPresident
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
  const [adjustingCriteria, setAdjustingCriteria] = useState(existing?.adjustingCriteria ?? '');

  // Review feedback
  const [managerFeedback, setManagerFeedback] = useState(existing?.managerFeedback ?? '');
  const [hrFeedback, setHrFeedback] = useState(existing?.hrFeedback ?? '');

  const totalWeight = objectives.reduce((s, o) => s + o.weight, 0);

  const addObjective = () => {
    if (objectives.length >= 10) return;
    setObjectives(prev => [...prev, { id: crypto.randomUUID(), description: '', strategy: '', supportNeeded: '', scoreCriteria: defaultScoreCriteria(), category: objectiveCategories[0]?.toLowerCase() || 'operation', weight: 0, selfScore: 0, managerScore: 0 }]);
  };
  const removeObjective = (id: string) => {
    if (objectives.length <= 2) return;
    setObjectives(prev => prev.filter(o => o.id !== id));
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
    setAdjustingCriteria(sourcePlan.adjustingCriteria ?? '');
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

    const targetIsLeadership = isLeadershipRole(empUser ?? currentUser);

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
      adjustingCriteria: isQuarterly ? undefined : adjustingCriteria,
      managerFeedback: existing?.managerFeedback,
      hrFeedback: existing?.hrFeedback,
      createdAt: existing?.createdAt ?? today,
      createdBy: existing?.createdBy ?? currentUser.id,
    };
    if (existing) { updatePlan(plan); toast.success(action === 'submit' ? 'KPI plan submitted for review' : 'Draft saved'); }
    else { addPlan(plan); toast.success(action === 'submit' ? 'KPI plan submitted for review' : 'Draft saved'); }
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

    const today = new Date().toISOString().split('T')[0];
    updatePlan({
      ...existing,
      objectives,
      setupStatus: approve ? 'manager_approved' : 'manager_rejected',
      managerFeedback: managerFeedback.trim() || undefined,
    });
    toast.success(approve ? 'KPI plan approved & sent to HR' : 'KPI plan rejected with feedback');
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
    navigate('/setup-kpi');
  };

  const title = isQuarterly ? 'Quarterly KPI' : 'Performance KPI';
  const periods = isQuarterly ? QUARTERLY_PERIODS : PERFORMANCE_PERIODS;

  // Can the user edit objectives?
  const canEditObjectives = !isManagerView && !isHrView && (!existing || existing.setupStatus === 'draft' || existing.setupStatus === 'manager_rejected' || existing.setupStatus === 'hr_rejected');
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
            {isManagerView ? 'Review' : isHrView ? 'HR Review' : (existing ? 'Edit' : 'New')} {title} Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            {isManagerView
              ? 'Review objectives and add Criteria of Rating for each.'
              : isHrView
                ? 'Final review before the KPI plan is approved.'
                : isEmployee
                  ? `Set up your ${title} plan. Your manager will add rating criteria after submission.`
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
              <p className="text-sm font-medium text-destructive">Manager Rejected — Feedback:</p>
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
      {(isEmployee && !isManagerView && !isHrView) ? (
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
            <TabsTrigger value="objectives">Part I — Objectives</TabsTrigger>
            <TabsTrigger value="adjusting">Part III — Adjusting</TabsTrigger>
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
              </p>
              {canEditObjectives && (
                <Button variant="outline" size="sm" onClick={addObjective} disabled={objectives.length >= 10}>
                  <Plus className="h-4 w-4 mr-1" /> Add Objective
                </Button>
              )}
            </div>

            {objectives.map((obj, i) => (
              <Card key={obj.id}>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-muted-foreground mt-2 w-6">{i + 1}.</span>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Objective Description</p>
                        <Textarea
                          value={obj.description}
                          onChange={e => updateObjective(obj.id, 'description', e.target.value)}
                          className="min-h-[60px]"
                          disabled={!canEditObjectives}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Strategy (How to Achieve)</p>
                          <Textarea
                            value={obj.strategy}
                            onChange={e => updateObjective(obj.id, 'strategy', e.target.value)}
                            className="min-h-[60px]"
                            disabled={!canEditObjectives}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Support Needed</p>
                          <Textarea
                            value={obj.supportNeeded}
                            onChange={e => updateObjective(obj.id, 'supportNeeded', e.target.value)}
                            className="min-h-[60px]"
                            disabled={!canEditObjectives}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <Select value={obj.category} onValueChange={v => updateObjective(obj.id, 'category', v)} disabled={!canEditObjectives}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {objectiveCategories.map(cat => (
                              <SelectItem key={cat.toLowerCase()} value={cat.toLowerCase()}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Weight:</span>
                          <Input type="number" min={0} max={100} className="w-20" value={obj.weight} onChange={e => updateObjective(obj.id, 'weight', Number(e.target.value))} disabled={!canEditObjectives} />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>

                      {/* Criteria of Rating — visible to all, editable only by manager during review */}
                      <Collapsible defaultOpen={canAddScoreCriteria}>
                        <CollapsibleTrigger className="flex items-center gap-2 text-left group">
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                          <p className="text-xs font-medium text-muted-foreground">
                            Criteria of Rating {canAddScoreCriteria && <span className="text-destructive">(Required — fill in before approving)</span>}
                            {!canAddScoreCriteria && !canEditObjectives && obj.scoreCriteria.every(sc => !sc.description) && <span className="text-muted-foreground italic">(Pending manager review)</span>}
                          </p>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 bg-muted/30">
                            {obj.scoreCriteria.map(sc => (
                              <div key={sc.score} className="flex items-start gap-2">
                                <span className="text-xs font-bold text-muted-foreground mt-2 w-24 shrink-0">Score {sc.score} — {SCORE_LABELS[sc.score]}</span>
                                {canAddScoreCriteria ? (
                                  <Input value={sc.description} onChange={e => updateScoreCriteria(obj.id, sc.score, e.target.value)} className="text-xs h-8" placeholder="Describe criteria..." />
                                ) : (
                                  <p className="text-xs mt-1.5 text-muted-foreground">{sc.description || '—'}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    {canEditObjectives && objectives.length > 2 && (
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeObjective(obj.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="adjusting" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Part III — Adjusting Factor Criteria</CardTitle>
                <CardDescription>Optional. Describe what behaviors / context the adjusting score (1–5) reflects.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={adjustingCriteria}
                  onChange={e => setAdjustingCriteria(e.target.value)}
                  className="min-h-[120px]"
                  disabled={!canEditObjectives}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Manager Review Panel */}
      {canAddScoreCriteria && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base">Manager Review</CardTitle>
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
                <span className="text-muted-foreground">Manager Feedback: </span>
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
