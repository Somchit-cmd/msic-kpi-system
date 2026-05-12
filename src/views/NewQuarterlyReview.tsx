'use client';

import { useState, useMemo } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { Evaluation, calcQuarterlyAvg } from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NewQuarterlyReview() {
  const { plans, currentUser, addEvaluation, navigate } = useEvaluation();

  const myPlans = plans.filter(p => p.planType === 'quarterly' && p.setupStatus === 'hr_approved' && (p.employeeId === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'president' || (currentUser.role === 'employee' && currentUser.canEvaluate)));

  const [planId, setPlanId] = useState<string>(myPlans[0]?.id ?? '');
  const [year, setYear] = useState('2026');
  const [quarter, setQuarter] = useState('Q1');
  const plan = useMemo(() => plans.find(p => p.id === planId), [planId, plans]);

  const [objectives, setObjectives] = useState(plan ? plan.objectives.map(o => ({ ...o, selfPercent: 0, managerPercent: 0 })) : []);

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    const newPlan = plans.find(p => p.id === newPlanId);
    if (newPlan) {
      setObjectives(newPlan.objectives.map(o => ({ ...o, selfPercent: 0, managerPercent: 0 })));
    }
  };

  const avg = calcQuarterlyAvg(objectives, false);

  const setPercent = (id: string, val: number) => {
    const v = Math.max(0, Math.min(25, val));
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, selfPercent: v } : o));
  };

  const save = (submit: boolean) => {
    if (!plan) { toast.error('Select a KPI plan'); return; }
    if (submit && objectives.some(o => (o.selfPercent ?? 0) === 0)) {
      toast.error('Enter % for every objective'); return;
    }
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];
    const eval_: Evaluation = {
      id: crypto.randomUUID(),
      employeeId: plan.employeeId,
      employeeName: plan.employeeName,
      employeeTitle: plan.employeeTitle,
      department: plan.department,
      managerId: plan.managerId,
      managerName: plan.managerName,
      period: `${year} ${quarter}`,
      reviewType: 'quarterly',
      planId: plan.id,
      status: submit ? 'submitted' : 'draft',
      createdAt: today,
      updatedAt: today,
      objectives,
      behaviors: [],
      adjustingFactor: { selfScore: 0, managerScore: 0, notes: '' },
      hrNotes: '',
      isLeadership: plan.isLeadership,
      auditLog: [
        { timestamp: nowIso, action: 'Draft Created', toStatus: 'draft', actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role },
        ...(submit ? [{ timestamp: nowIso, action: 'Submitted to Manager', fromStatus: 'draft' as const, toStatus: 'submitted' as const, actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role }] : []),
      ],
    };
    addEvaluation(eval_);
    toast.success(submit ? 'Quarterly review submitted!' : 'Draft saved!');
    navigate('/quarterly-reviews');
  };

  if (myPlans.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">New Quarterly Review</h1>
        <p className="text-muted-foreground">No KPI plans found. Create a plan first via Setup KPI.</p>
        <Button onClick={() => navigate('/setup-kpi')}>Go to Setup KPI</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Quarterly Review</h1>
          <p className="text-muted-foreground mt-1">Enter % achievement (0–25%) per objective. Period: {year} {quarter}</p>
        </div>
        <Card className="w-56">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Average Achievement</p>
            <p className="text-3xl font-bold text-primary">{avg.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">KPI Plan</p>
            <Select value={planId} onValueChange={handlePlanChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {myPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.employeeName} — {p.year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Year</p>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['2024','2025','2026','2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Quarter</p>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Q1','Q2','Q3','Q4'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Part I — Objectives (% Achievement)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {objectives.map((o, i) => (
            <div key={o.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{o.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Weight: {o.weight}% · {o.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={25} step={1}
                    className="w-24"
                    value={o.selfPercent ?? 0}
                    onChange={e => setPercent(o.id, Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => save(false)}>Save Draft</Button>
        <Button onClick={() => save(true)}>Submit to Manager</Button>
      </div>
    </div>
  );
}
