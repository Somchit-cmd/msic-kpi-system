'use client';

import { useState, useMemo } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import {
  getBehaviorCategoriesWithScores, calcPartI, calcPartII, calcPartIII, Evaluation,
} from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreButtons } from '@/components/ScoreButtons';
import { toast } from 'sonner';

export default function NewEvaluation() {
  const { plans, currentUser, hasDirectReports, addEvaluation, navigate } = useEvaluation();

  const myPlans = plans.filter(p => p.planType === 'performance' && p.setupStatus === 'hr_approved' && (p.employeeId === currentUser.id || currentUser.role === 'admin' || hasDirectReports));

  const [planId, setPlanId] = useState<string>(myPlans[0]?.id ?? '');
  const [year, setYear] = useState('2026');
  const [half, setHalf] = useState('H1');
  const plan = useMemo(() => plans.find(p => p.id === planId), [planId, plans]);

  const [objectives, setObjectives] = useState(plan ? plan.objectives.map(o => ({ ...o, selfScore: 0, managerScore: 0 })) : []);
  const [behaviors, setBehaviors] = useState(plan ? plan.behaviors.map(b => ({ ...b, selfScore: 0, managerScore: 0 })) : []);
  const [adjusting, setAdjusting] = useState({ selfScore: 0, managerScore: 0, notes: '' });

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    const newPlan = plans.find(p => p.id === newPlanId);
    if (newPlan) {
      setObjectives(newPlan.objectives.map(o => ({ ...o, selfScore: 0, managerScore: 0 })));
      setBehaviors(newPlan.behaviors.map(b => ({ ...b, selfScore: 0, managerScore: 0 })));
    }
  };

  const partI = calcPartI(objectives);
  const partII = calcPartII(behaviors);
  const partIII = calcPartIII(adjusting);
  const total = partI + partII + partIII;

  const behaviorCategories = useMemo(
    () => plan ? getBehaviorCategoriesWithScores(behaviors, plan.isLeadership) : [],
    [behaviors, plan]
  );

  const setObjScore = (id: string, v: number) => setObjectives(prev => prev.map(o => o.id === id ? { ...o, selfScore: v } : o));
  const setBehaviorScore = (subTopicId: string, v: number) => setBehaviors(prev => prev.map(b => b.subTopicId === subTopicId ? { ...b, selfScore: v } : b));

  const save = (submit: boolean) => {
    if (!plan) { toast.error('Select a KPI plan'); return; }
    if (submit) {
      if (objectives.some(o => o.selfScore === 0) || behaviors.some(b => b.selfScore === 0) || adjusting.selfScore === 0) {
        toast.error('Please score all items'); return;
      }
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
      period: `${year} ${half}`,
      reviewType: 'performance',
      planId: plan.id,
      status: submit ? 'submitted' : 'draft',
      createdAt: today,
      updatedAt: today,
      objectives,
      behaviors,
      adjustingFactor: adjusting,
      hrNotes: '',
      isLeadership: plan.isLeadership,
      auditLog: [
        { timestamp: nowIso, action: 'Draft Created', toStatus: 'draft', actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role },
        ...(submit ? [{ timestamp: nowIso, action: 'Submitted to Evaluator', fromStatus: 'draft' as const, toStatus: 'submitted' as const, actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role }] : []),
      ],
    };
    addEvaluation(eval_);
    toast.success(submit ? 'Performance review submitted!' : 'Draft saved!');
    navigate('/performance-reviews');
  };

  if (myPlans.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">New Performance Review</h1>
        <p className="text-muted-foreground">No KPI plans found. Create a plan first via Setup KPI.</p>
        <Button onClick={() => navigate('/setup-kpi')}>Go to Setup KPI</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Performance Review</h1>
          <p className="text-muted-foreground mt-1">Score each item on a 1–5 scale. Period: {year} {half}</p>
        </div>
        <Card className="w-48">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Preview Score</p>
            <p className="text-3xl font-bold text-primary">{total.toFixed(2)}</p>
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
            <p className="text-sm font-medium text-muted-foreground">Half-Year</p>
            <Select value={half} onValueChange={setHalf}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="H1">H1 (Jan–Jun)</SelectItem>
                <SelectItem value="H2">H2 (Jul–Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="objectives">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="objectives">Part I — Objectives (45%)</TabsTrigger>
          <TabsTrigger value="behaviors">Part II — Behaviors (45%)</TabsTrigger>
          <TabsTrigger value="adjusting">Part III — Adjusting (10%)</TabsTrigger>
        </TabsList>

        <TabsContent value="objectives" className="space-y-3 mt-4">
          {objectives.map((o, i) => (
            <Card key={o.id}><CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{o.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Weight: {o.weight}% · {o.category}</p>
                </div>
              </div>
              <ScoreButtons value={o.selfScore} onChange={v => setObjScore(o.id, v)} />
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="behaviors" className="space-y-4 mt-4">
          {behaviorCategories.map((cat, ci) => (
            <Card key={cat.name}>
              <CardHeader className="pb-3"><CardTitle className="text-base">{ci + 1}. {cat.name.toUpperCase()}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {cat.subTopics.map((st, si) => (
                  <div key={st.id} className="border rounded-lg p-3">
                    <p className="font-medium text-sm mb-2">{ci + 1}.{si + 1} {st.name}</p>
                    <ScoreButtons value={st.selfScore} onChange={v => setBehaviorScore(st.id, v)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="adjusting" className="space-y-4 mt-4">
          <Card><CardContent className="pt-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Self Score</p>
              <ScoreButtons value={adjusting.selfScore} onChange={v => setAdjusting(prev => ({ ...prev, selfScore: v }))} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
              <Textarea value={adjusting.notes} onChange={e => setAdjusting(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => save(false)}>Save Draft</Button>
        <Button onClick={() => save(true)}>Submit to Evaluator</Button>
      </div>
    </div>
  );
}
